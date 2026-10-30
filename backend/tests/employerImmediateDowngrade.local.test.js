import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { test } from "node:test";
import http from "node:http";
import https from "node:https";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import express from "express";
import Employer from "../src/models/Employer.js";
import Admin from "../src/models/Admin.js";
import Payment from "../src/models/EmployerPayment.js";
import Subscription from "../src/models/EmployerSubscription.js";
import Job from "../src/models/Job.js";
import { SubscriptionLifecycle as Lifecycle, SubscriptionDowngrade as History } from "../src/models/SubscriptionLifecycle.js";
import { recordEmployerPlanRequest as apply, employerPlanRequestContext as preview } from "../src/services/employerPlanRequest.js";
import { resolveSubscriptionStatus as resolve } from "../src/services/subscriptionStatus.js";
import { previewOwnSubscriptionCancellation, cancelOwnSubscription, previewSubscriptionCancellation, cancelSubscription, activateVerifiedSubscription } from "../src/services/subscriptionLifecycle.js";
import { checkEmployerJobAccess } from "../src/services/employerJobAccess.js";
import { requireEmployerMessaging } from "../src/middleware/requireEmployerMessaging.js";

test("Immediate Employer/Admin downgrades: local synthetic transactions", { skip: process.env.QNDUIT_EN488C_LOCAL_TEST !== "1" }, async t => {
  const fetchLocal = globalThis.fetch.bind(globalThis);
  for (const module of [http, https]) t.mock.method(module, "request", () => { throw Error("Provider calls blocked"); });
  t.mock.method(globalThis, "fetch", () => { throw Error("Provider fetch blocked"); });
  await mongoose.connect(`mongodb://127.0.0.1:28180/qnduit_en488c_immediate_${randomUUID().replaceAll("-", "")}?replicaSet=qnmanual`, { serverSelectionTimeoutMS: 4000 });
  t.after(() => mongoose.disconnect());
  for (const Model of Object.values(mongoose.models)) { await Model.createCollection(); await Model.init(); }
  const secret = process.env.JWT_SECRET; process.env.JWT_SECRET = randomUUID();
  t.after(() => { if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret; });
  const admin = await Admin.create({ name: "Synthetic Admin", email: "admin@example.invalid", password: "Synthetic-Only!2026" });
  const adminActor = { _id: admin._id, role: "admin" }, actor = employer => ({ _id: employer._id, role: "employer" });
  const fixture = async (plan = "platinum") => {
    const employer = await Employer.create({ email: `${randomUUID()}@example.invalid`, password: "Synthetic-Only!2026", isVerified: true, accountStatus: "active", firstName: "Synthetic", lastName: "Employer", selectedPlan: plan || "free", paymentStatus: plan ? "active" : "none" });
    if (!plan) return { employer };
    const payment = await Payment.create({ employer: employer._id, plan, provider: "flutterwave", txRef: `SYN-${randomUUID()}`, transactionId: randomUUID(), amount: 12.99, currency: "USD", type: "subscription", status: "successful", paidAt: new Date() });
    const subscription = await Subscription.create({ employer: employer._id, plan, status: "active", currentPeriodStart: new Date(Date.now()-60000), currentPeriodEnd: new Date(Date.now()+86400000), lastTxRef: payment.txRef, lastTransactionId: payment.transactionId });
    return { employer, payment, subscription };
  };
  const input = (employer, extra = {}) => ({ authenticatedUser: actor(employer), accountId: String(employer._id), toPlan: "silver", requestId: randomUUID(), ...extra });
  const status = employer => resolve({ role: "employer", accountId: employer._id });
  const payments = async employer => JSON.stringify(await Payment.find({ employer: employer._id }).sort({ _id: 1 }).lean());
  const funded = subscription => JSON.stringify(Object.fromEntries(["plan", "provider", "currentPeriodStart", "currentPeriodEnd", "lastTxRef", "lastTransactionId"].map(key => [key, subscription[key]])));
  for (const role of ["employer", "admin"]) await t.test(`${role}: immediate paid downgrade retains funded plan, payments and period`, async () => {
    const { employer, payment, subscription } = await fixture(), before = await payments(employer);
    const result = await apply(input(employer, { authenticatedUser: role === "admin" ? adminActor : actor(employer) }));
    const row = await History.findById(result.request._id).lean(), current = await Subscription.findById(subscription._id).lean();
    assert.equal(funded(current), funded(subscription)); assert.equal(await payments(employer), before);
    assert.equal(current.accessPlan, "silver"); assert.equal(current.accessPlanHistory, row._id);
    assert.equal(row.fromPlan, "platinum"); assert.equal(row.toPlan, "silver"); assert.equal(row.appliedPlan, "silver");
    assert.equal(row.actionType, "downgrade"); assert.equal(row.status, "applied"); assert.equal(row.outcome, "applied");
    assert.equal(row.actorRole, role); assert.equal(String(row.requestedBy), String(role === "admin" ? admin._id : employer._id));
    assert.equal(String(row.account), String(employer._id)); assert.equal(String(row.sourcePayment), String(payment._id));
    assert.ok(row.requestedAt instanceof Date); assert.ok(row.actualEffectiveAt instanceof Date); assert.equal(+row.requestedAt, +row.actualEffectiveAt);
    assert.equal(row.scheduledEffectiveAt, null); assert.equal(row.appliedGeneration, row.generation+1);
    const access = await status(employer); assert.equal(access.effectivePlan, "silver"); assert.equal(access.paidEligible, true); assert.equal(access.eligibility.employerMessaging, true);
    assert.equal((await preview(String(employer._id))).latestAction.appliedPlan, "silver");
  });
  await t.test("successive Platinum -> Silver -> Bronze -> Free; correct previous plan and feature rules", async () => {
    const { employer, subscription } = await fixture(), before = await payments(employer);
    for (let index=0; index<10; index++) await Job.collection.insertOne({ employer: employer._id, title: `Synthetic ${index}` });
    let previous = "platinum";
    for (const toPlan of ["silver", "bronze", "free"]) {
      const result = await apply(input(employer, { toPlan })); assert.equal(result.request.fromPlan, previous); previous=toPlan;
      const access = await status(employer); assert.equal(access.effectivePlan, toPlan);
      assert.equal(access.eligibility.employerMessaging, toPlan === "silver"); assert.equal(access.eligibility.unlimitedJobPosting, toPlan !== "free");
      let denied; let next=false;
      await requireEmployerMessaging({ user: actor(employer) }, { status(code) { denied=code; return this; }, json() {} }, () => { next=true; });
      assert.equal(next, toPlan === "silver"); if (!next) assert.equal(denied,403);
      if (toPlan === "free") await assert.rejects(checkEmployerJobAccess(employer._id), { code: "JOB_POST_LIMIT_REACHED" });
      else await checkEmployerJobAccess(employer._id);
    }
    const current = await Subscription.findById(subscription._id).lean(); assert.equal(current.status, "canceled"); assert.equal(funded(current),funded(subscription));
    assert.equal(await payments(employer),before); assert.equal(await History.countDocuments({account:employer._id}),3);
    await assert.rejects(apply(input(employer,{toPlan:"bronze"})),{code:"SUBSCRIPTION_UPGRADE_NOT_ALLOWED"});
  });
  for (const toPlan of ["silver", "free"]) await t.test(`same UUID concurrency/replay applies ${toPlan} exactly once`, async () => {
    const { employer } = await fixture(), intent=input(employer,{toPlan});
    const rows=await Promise.all([apply(intent),apply(intent),apply(intent)]); assert.equal(rows.filter(x=>!x.replayed).length,1);
    const state=await Lifecycle.findById(`employer:${employer._id}`).lean(); assert.equal(state.generation,1);
    assert.equal(await History.countDocuments({account:employer._id}),1);
    await assert.rejects(apply({...intent,toPlan:toPlan==="free"?"bronze":"free"}),{code:"SUBSCRIPTION_REQUEST_CONFLICT"});
    await assert.rejects(apply({...intent,authenticatedUser:adminActor}),{code:"SUBSCRIPTION_REQUEST_CONFLICT"});
  });
  await t.test("competing signed previews commit one downgrade; stale competitor cannot overwrite", async () => {
    const { employer }=await fixture(), p=await preview(String(employer._id));
    const snap={expectedFromPlan:p.currentPlan,expectedActivationFingerprint:p.activationFingerprint};
    const result=await Promise.allSettled([apply(input(employer,{...snap,toPlan:"silver"})),apply(input(employer,{...snap,toPlan:"bronze",authenticatedUser:adminActor}))]);
    assert.equal(result.filter(x=>x.status==="fulfilled").length,1); assert.equal(result.find(x=>x.status==="rejected").reason.code,"SUBSCRIPTION_SELECTION_STALE");
    assert.equal(await History.countDocuments({account:employer._id}),1);
  });
  await t.test("rollback after access writes restores subscription/account/generation and removes history", async t => {
    const { employer,subscription }=await fixture(); const before=JSON.stringify(await Subscription.findById(subscription._id).lean()), accountBefore=JSON.stringify(await Employer.findById(employer._id).lean());
    const original=Lifecycle.updateOne;
    t.mock.method(Lifecycle,"updateOne",function(filter,update,options) { if(update.$set?.generation) throw Error("Synthetic lifecycle failure"); return original.call(this,filter,update,options); });
    await assert.rejects(apply(input(employer)),/Synthetic lifecycle failure/);
    assert.equal(JSON.stringify(await Subscription.findById(subscription._id).lean()),before); assert.equal(JSON.stringify(await Employer.findById(employer._id).lean()),accountBefore);
    assert.equal(await History.countDocuments({account:employer._id}),0); assert.equal((await Lifecycle.findById(`employer:${employer._id}`).lean()).generation,0);
  });
  for (const field of ["owner","payment","plan","generation","period","missing-history"]) await t.test(`invalid restriction evidence fails closed: ${field}`,async()=>{
    const { employer,subscription }=await fixture(); const result=await apply(input(employer,{toPlan:"bronze"}));
    const id=result.request._id;
    if(field==="owner")await History.collection.updateOne({_id:id},{$set:{account:new mongoose.Types.ObjectId()}});
    if(field==="payment")await History.collection.updateOne({_id:id},{$set:{sourcePayment:new mongoose.Types.ObjectId()}});
    if(field==="plan")await Subscription.collection.updateOne({_id:subscription._id},{$set:{accessPlan:"platinum"}});
    if(field==="generation")await Lifecycle.updateOne({_id:`employer:${employer._id}`},{$inc:{generation:1}});
    if(field==="period")await Subscription.updateOne({_id:subscription._id},{$set:{currentPeriodEnd:new Date(Date.now()+900000)}});
    if(field==="missing-history")await History.deleteOne({_id:id});
    const access=await status(employer); assert.equal(access.effectivePlan,"free"); assert.equal(access.paidEligible,false); assert.equal(access.reason,"invalid_access_restriction");
  });
  await t.test("failed/refunded funding and expired period cannot support restricted access",async()=>{
    for(const kind of ["failed","refunded","expired"]){const {employer,payment,subscription}=await fixture();await apply(input(employer));
      if(kind==="expired")await Subscription.updateOne({_id:subscription._id},{$set:{currentPeriodEnd:new Date(Date.now()-1000)}}); else await Payment.updateOne({_id:payment._id},{$set:{status:kind}});
      assert.equal((await status(employer)).paidEligible,false);
    }
  });
  for(const role of ["employer","admin"]) await t.test(`${role} upgrade rejected, ownership/active actor validated`,async()=>{
    const {employer}=await fixture("silver"),other=await fixture();
    await assert.rejects(apply(input(employer,{toPlan:"platinum",authenticatedUser:role==="admin"?adminActor:actor(employer)})),{code:"SUBSCRIPTION_UPGRADE_NOT_ALLOWED"});
    await assert.rejects(apply(input(employer,{toPlan:"bronze",authenticatedUser:actor(other.employer)})),{code:"SUBSCRIPTION_REQUEST_DENIED"});
    await Admin.updateOne({_id:admin._id},{$set:{isActive:false}});
    await assert.rejects(apply(input(employer,{toPlan:"bronze",authenticatedUser:adminActor})),{code:"SUBSCRIPTION_REQUEST_DENIED"});
    await Admin.updateOne({_id:admin._id},{$set:{isActive:true}});
    assert.equal(await History.countDocuments({account:employer._id}),0);
  });
  await t.test("old pending/scheduled records remain unchanged and are never executed or blockers",async()=>{
    const {employer,subscription}=await fixture(),p=await preview(String(employer._id));
    const old={_id:`OLD-${randomUUID()}`,role:"employer",account:employer._id,subscription:subscription._id,generation:0,activationFingerprint:p.activationFingerprint,fromPlan:"platinum",toPlan:"silver",requestedBy:admin._id,requestedAt:new Date(),status:"pending"};
    await History.collection.insertOne(old);const before=await History.findById(old._id).lean();
    await apply(input(employer,{toPlan:"bronze"})); assert.deepEqual(await History.findById(old._id).lean(),before); assert.equal((await status(employer)).effectivePlan,"bronze");
    assert.equal((await preview(String(employer._id))).pendingRequest,null);
  });
  for(const adminCancel of [false,true]) await t.test(`cancellation race and replay preserve access restrictions (Admin: ${adminCancel})`,async()=>{
    const {employer}=await fixture(),options={role:"employer",accountId:String(employer._id),adminId:String(admin._id)};
    const c=await (adminCancel?previewSubscriptionCancellation:previewOwnSubscriptionCancellation)(options),p=await preview(options.accountId);
    const results=await Promise.allSettled([apply(input(employer,{expectedFromPlan:p.currentPlan,expectedActivationFingerprint:p.activationFingerprint})),(adminCancel?cancelSubscription:cancelOwnSubscription)({...options,previewToken:c.previewToken,requestId:randomUUID()})]);
    assert.ok(results.some(x=>x.status==="fulfilled"));assert.ok(results.filter(x=>x.status==="rejected").every(x=>["SUBSCRIPTION_SELECTION_STALE","SUBSCRIPTION_UPGRADE_NOT_ALLOWED","SUBSCRIPTION_EVIDENCE_UNAVAILABLE"].includes(x.reason.code)));
    // If downgrade won, deliberate refreshed cancellation must still work.
    if((await status(employer)).paidEligible){const fresh=await (adminCancel?previewSubscriptionCancellation:previewOwnSubscriptionCancellation)(options);await (adminCancel?cancelSubscription:cancelOwnSubscription)({...options,previewToken:fresh.previewToken,requestId:randomUUID()});}
    assert.equal((await status(employer)).effectivePlan,"free");
  });
  await t.test("Admin Free downgrade deactivates access, retains payment and period, records applied audit",async()=>{
    const {employer,subscription}=await fixture(),before=await payments(employer);
    const result=await apply(input(employer,{toPlan:"free",authenticatedUser:adminActor}));
    assert.equal(result.request.actorRole,"admin");assert.equal(result.request.appliedPlan,"free");assert.equal(result.request.status,"applied");assert.ok(result.request.actualEffectiveAt instanceof Date);
    assert.equal((await status(employer)).effectivePlan,"free");assert.equal(await payments(employer),before);assert.equal(funded(await Subscription.findById(subscription._id).lean()),funded(subscription));
  });
  await t.test("replaying an older applied downgrade cannot undo a later downgrade",async()=>{
    const {employer}=await fixture(),intent=input(employer);const first=await apply(intent);
    await apply(input(employer,{toPlan:"bronze"}));const repeat=await apply(intent);
    assert.equal(repeat.replayed,true);assert.deepEqual(repeat.request,first.request);assert.equal((await status(employer)).effectivePlan,"bronze");
  });
  await t.test("Free deactivation failure rolls back audit, account, subscription and guard",async t=>{
    const {employer,subscription}=await fixture(),before=JSON.stringify(await Subscription.findById(subscription._id).lean());
    t.mock.method(Employer,"updateOne",()=>{throw Error("Synthetic Free deactivation failure");});
    await assert.rejects(apply(input(employer,{toPlan:"free"})),/Synthetic Free deactivation failure/);
    assert.equal(JSON.stringify(await Subscription.findById(subscription._id).lean()),before);assert.equal(await History.countDocuments({account:employer._id}),0);assert.equal((await Lifecycle.findById(`employer:${employer._id}`).lean()).generation,0);
  });
  await t.test("duplicate verified funding cannot restore the funded higher plan",async()=>{
    const {employer,payment}=await fixture();await apply(input(employer,{toPlan:"bronze"}));
    await activateVerifiedSubscription({role:"employer",paymentId:payment._id,transaction:{id:payment.transactionId,status:"successful",tx_ref:payment.txRef,amount:payment.amount,currency:payment.currency}});
    assert.equal((await status(employer)).effectivePlan,"bronze");
  });
  await t.test("old payment replay cannot claim a different current paid activation",async()=>{
    const {employer,payment,subscription}=await fixture(),other=await Payment.create({employer:employer._id,plan:"platinum",provider:"flutterwave",txRef:`SYN-${randomUUID()}`,transactionId:randomUUID(),amount:12.99,currency:"USD",type:"subscription",status:"successful",paidAt:new Date()});
    await Subscription.updateOne({_id:subscription._id},{$set:{lastTxRef:other.txRef,lastTransactionId:other.transactionId}});
    const replay=await activateVerifiedSubscription({role:"employer",paymentId:payment._id,transaction:{id:payment.transactionId,status:"successful",tx_ref:payment.txRef,amount:payment.amount,currency:payment.currency}});
    assert.equal(replay.activated,false);assert.equal((await status(employer)).effectivePlan,"platinum");
  });
  await t.test("unverified/suspended Employers and unsupported actors cannot change access",async()=>{
    for(const change of [{isVerified:false},{accountStatus:"suspended"}]){const {employer}=await fixture();await Employer.updateOne({_id:employer._id},{$set:change});await assert.rejects(apply(input(employer)),{code:"SUBSCRIPTION_REQUEST_DENIED"});assert.equal(await History.countDocuments({account:employer._id}),0);}
    const {employer}=await fixture();for(const authenticatedUser of [null,{_id:employer._id,role:"talent"}])await assert.rejects(apply(input(employer,{authenticatedUser})),{code:"SUBSCRIPTION_REQUEST_DENIED"});
  });
  await t.test("mounted Employer/Admin APIs: authorization, targeting, date/audit persistence and stale previews",async()=>{
    const {default:paymentsRoutes}=await import("../src/routes/paymentRoutes.js"),{default:adminRoutes}=await import("../src/routes/adminRoutes.js");
    const app=express();app.use(express.json());app.use("/api/payments",paymentsRoutes);app.use("/api/admin",adminRoutes);
    const server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
    try{const base=`http://127.0.0.1:${server.address().port}`,{employer,subscription}=await fixture(),other=await fixture();
      const token=(id,role)=>jwt.sign({id:String(id),role},process.env.JWT_SECRET),auth=token(employer._id,"employer"),adminAuth=token(admin._id,"admin");
      const own="/api/payments/employer/plan-requests",target=`/api/admin/subscriptions/employer/${employer._id}/plan-request`;
      const call=async(path,auth,body)=>{const res=await fetchLocal(base+path,{method:body?"POST":"GET",headers:{"Content-Type":"application/json",...(auth?{Authorization:`Bearer ${auth}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()};};
      assert.equal((await call(own)).status,401);assert.equal((await call(target,auth)).status,403);assert.equal((await call(own,adminAuth)).status,403);
      assert.equal((await call(`/api/admin/subscriptions/employer/${subscription._id}/plan-request`,adminAuth)).status,404);
      const a=(await call(target,adminAuth)).data,p=(await call(own,auth)).data;assert.deepEqual(a.allowedPlans,["free","bronze","silver"]);
      const intent={toPlan:"silver",requestId:randomUUID(),previewToken:p.previewToken};
      assert.equal((await call(target,adminAuth,{...intent,previewToken:a.previewToken,toPlan:"platinum"})).status,400);
      const secondAdmin=await Admin.create({name:"Other",email:`${randomUUID()}@example.invalid`,password:"Synthetic-only"});
      assert.equal((await call(target,token(secondAdmin._id,"admin"),{...intent,previewToken:a.previewToken})).status,409);
      assert.equal((await call(own,token(other.employer._id,"employer"),intent)).status,409);
      for(const key of ["requestedBy","accountId","fromPlan","actualEffectiveAt","payment","scheduledEffectiveAt"])assert.equal((await call(own,auth,{...intent,[key]:"forged"})).status,400);
      const applied=await call(own,auth,intent);assert.equal(applied.status,200);assert.equal(applied.data.request.status,"applied");assert.equal(applied.data.request.appliedPlan,"silver");assert.equal(applied.data.request.actorId,String(employer._id));assert.ok(applied.data.request.actualEffectiveAt);
      assert.equal((await call(own,auth,intent)).data.replayed,true);
      assert.equal((await call(target,adminAuth,{toPlan:"bronze",requestId:randomUUID(),previewToken:a.previewToken})).data.code,"SUBSCRIPTION_SELECTION_STALE");
      const fresh=(await call(target,adminAuth)).data;assert.equal(fresh.currentPlan,"silver");assert.deepEqual(fresh.allowedPlans,["free","bronze"]);
      assert.equal((await call(target,adminAuth,{toPlan:"platinum",requestId:randomUUID(),previewToken:fresh.previewToken})).data.code,"SUBSCRIPTION_UPGRADE_NOT_ALLOWED");
      const done=await call(target,adminAuth,{toPlan:"bronze",requestId:randomUUID(),previewToken:fresh.previewToken});assert.equal(done.status,200);assert.equal(done.data.request.fromPlan,"silver");assert.equal(done.data.request.actorRole,"admin");assert.equal(done.data.request.actorId,String(admin._id));
      assert.equal((await status(employer)).effectivePlan,"bronze");assert.equal((await call(`/api/admin/subscriptions/employer/${employer._id}/downgrade`,adminAuth)).status,409);
    }finally{await new Promise(resolve=>server.close(resolve));}
  });
  assert.equal(http.request.mock.callCount(),0);assert.equal(https.request.mock.callCount(),0);assert.equal(globalThis.fetch.mock.callCount(),0);
  console.log(`Synthetic immediate database retained: ${mongoose.connection.name}`);
});
