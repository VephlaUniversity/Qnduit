import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import process from "node:process";
import {test} from "node:test";
import http from "node:http";
import https from "node:https";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import sgMail from "@sendgrid/mail";
import Employer from "../src/models/Employer.js";
import Admin from "../src/models/Admin.js";
import Payment from "../src/models/EmployerPayment.js";
import Subscription from "../src/models/EmployerSubscription.js";
import {SubscriptionDowngrade as History,SubscriptionLifecycle as Lifecycle} from "../src/models/SubscriptionLifecycle.js";
import {resolveSubscriptionStatus} from "../src/services/subscriptionStatus.js";
import {recordEmployerPlanRequest,employerPlanRequestContext} from "../src/services/employerPlanRequest.js";
import {previewOwnSubscriptionCancellation,cancelOwnSubscription} from "../src/services/subscriptionLifecycle.js";

test("Employer upgrades: mocked provider, real local synthetic transactions",{skip:process.env.QNDUIT_EN488C_LOCAL_TEST!=="1"},async t=>{
 const localFetch=globalThis.fetch.bind(globalThis);
 for(const module of [http,https])t.mock.method(module,"request",()=>{throw Error("Real providers blocked");});
 t.mock.method(globalThis,"fetch",()=>{throw Error("Real fetch blocked");});t.mock.method(sgMail,"send",async()=>[{statusCode:202,headers:{"x-message-id":"synthetic"}}]);
 Object.assign(process.env,{FLW_TALENT_PUBLIC_PLAN_ID:"104",FLW_EMPLOYER_BRONZE_PLAN_ID:"101",FLW_EMPLOYER_SILVER_PLAN_ID:"102",FLW_EMPLOYER_PLATINUM_PLAN_ID:"103",JWT_SECRET:randomUUID(),FLW_SECRET_HASH:randomUUID(),BACKEND_URL:"http://synthetic.invalid",FRONTEND_URL:"http://synthetic.invalid",SENDGRID_FROM_EMAIL:"test@example.invalid"});
 const {default:flutterwave}=await import("../src/utils/flutterwave.js"),{default:routes}=await import("../src/routes/paymentRoutes.js"),{default:adminRoutes}=await import("../src/routes/adminRoutes.js"),{handleFlutterwaveWebhook}=await import("../src/controllers/flutterwaveWebhookController.js");
 let initCalls=0,failInit=false;const receipts=new Map(),hosted=[];
 t.mock.method(flutterwave,"post",async(path,body)=>{assert.equal(path,"/payments");initCalls++;hosted.push(body);if(failInit)throw Error("Synthetic uncertain initialization");return {data:{data:{link:`https://checkout.example.invalid/${encodeURIComponent(body.tx_ref)}`}}};});
 t.mock.method(flutterwave,"get",async path=>{const id=path.split("/")[2];const value=receipts.get(id);if(value instanceof Error)throw value;if(!value)throw Error("Unknown synthetic receipt");return {data:{data:value}};});
 await mongoose.connect(`mongodb://127.0.0.1:28180/qnduit_en488c_upgrade_${randomUUID().replaceAll("-","")}?replicaSet=qnmanual`,{serverSelectionTimeoutMS:4000});
 for(const Model of Object.values(mongoose.models)){await Model.createCollection();await Model.init();}
 const app=express();app.use(express.json());app.use("/api/payments",routes);app.use("/api/admin",adminRoutes);app.post("/webhook",handleFlutterwaveWebhook);app.use((error,_req,res,next)=>{ void next; res.status(error.status||503).json({success:false,message:"Synthetic verification uncertainty"}); });
 const server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();});
 const base=`http://127.0.0.1:${server.address().port}`,token=(id,role="employer")=>jwt.sign({id:String(id),role},process.env.JWT_SECRET);
 const call=async(path,auth,body)=>{const res=await localFetch(base+path,{method:body?"POST":"GET",redirect:"manual",headers:{"Content-Type":"application/json",...(auth?{Authorization:`Bearer ${auth}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const raw=await res.text();return {status:res.status,location:res.headers.get("location"),data:res.headers.get("content-type")?.includes("json")?JSON.parse(raw):null};};
 const fixture=async(plan="bronze")=>{const employer=await Employer.create({email:`${randomUUID()}@example.invalid`,password:"Synthetic-Only!2026",isVerified:true,accountStatus:"active",firstName:"Synthetic",lastName:"Upgrade",selectedPlan:plan||"free",paymentStatus:plan?"active":"none"});
 if(!plan)return {employer,auth:token(employer._id)};
 const payment=await Payment.create({employer:employer._id,plan,provider:"flutterwave",txRef:`SYN-${randomUUID()}`,transactionId:randomUUID(),amount:6.99,currency:"USD",type:"subscription",status:"successful",paidAt:new Date()});
 const subscription=await Subscription.create({employer:employer._id,plan,status:"active",currentPeriodStart:new Date(Date.now()-60000),currentPeriodEnd:new Date(Date.now()+86400000),lastTxRef:payment.txRef,lastTransactionId:payment.transactionId});return {employer,payment,subscription,auth:token(employer._id)};};
 const current=f=>resolveSubscriptionStatus({role:"employer",accountId:f.employer._id});
 const snapshot=async f=>JSON.stringify({account:await Employer.findById(f.employer._id).lean(),subscription:await Subscription.findOne({employer:f.employer._id}).lean()});
 const preview=async f=>(await call("/api/payments/employer/plan-requests",f.auth)).data;
 const intent=async(f,plan="silver")=>({plan,requestId:randomUUID(),previewToken:(await preview(f)).upgradePreviewToken});
 const start=async(f,plan="silver",body)=>{body=body||await intent(f,plan);const result=await call("/api/payments/employer/create-checkout",f.auth,body);const history=await History.findOne({account:f.employer._id,requestId:body.requestId}).lean();return {...result,body,history,payment:history?await Payment.findById(history.payment).lean():null};};
 const receipt=(payment,changes={})=>{const id=`SIM-${randomUUID()}`;const data={id,status:"successful",tx_ref:payment.txRef,amount:payment.amount,currency:payment.currency,...changes};receipts.set(id,data);return id;};
 const callback=id=>call(`/api/payments/employer/payment/callback?tx_ref=${encodeURIComponent(receipts.get(id)?.tx_ref||"")}&transaction_id=${encodeURIComponent(id)}`);
 const callbackFor=(payment,id)=>call(`/api/payments/employer/payment/callback?tx_ref=${encodeURIComponent(payment.txRef)}&transaction_id=${encodeURIComponent(id)}`);
 const webhook=async id=>{const res=await localFetch(base+"/webhook",{method:"POST",headers:{"Content-Type":"application/json","verif-hash":process.env.FLW_SECRET_HASH},body:JSON.stringify({event:"charge.completed",data:{id}})});return {status:res.status,data:await res.json()};};
 await t.test("awaiting-payment history and server pricing preserve current account/subscription exactly",async()=>{
  const f=await fixture(),before=await snapshot(f),old=JSON.stringify(await Payment.findById(f.payment._id).lean()),s=await start(f);
  assert.equal(s.status,200);assert.equal(await snapshot(f),before);assert.equal((await current(f)).effectivePlan,"bronze");assert.equal(JSON.stringify(await Payment.findById(f.payment._id).lean()),old);
  assert.equal(s.history.status,"awaiting_payment");assert.equal(s.history.outcome,"awaiting_payment");assert.equal(s.history.actorRole,"employer");assert.equal(String(s.history.requestedBy),String(f.employer._id));assert.equal(s.history.fromPlan,"bronze");assert.equal(s.history.toPlan,"silver");assert.equal(s.history.actualEffectiveAt,null);assert.equal(s.history.appliedPlan,undefined);assert.ok(s.history.requestedAt instanceof Date);assert.equal(String(s.history.payment),String(s.payment._id));
  assert.equal(s.payment.amount,8.99);assert.equal(hosted.at(-1).amount,8.99);assert.equal(hosted.at(-1).payment_plan,102);assert.equal((await Lifecycle.findById(`employer:${f.employer._id}`).lean()).generation,0);
  const p=await preview(f);assert.equal(p.upgradeRequest.status,"awaiting_payment");assert.ok(p.upgradeCheckoutUrl);assert.equal(p.currentPlan,"bronze");
 });
 await t.test("successful verification activates atomically; duplicate callback/webhook does not reset period",async()=>{
  const f=await fixture(),s=await start(f),id=receipt(s.payment);assert.equal((await callback(id)).status,302);assert.equal((await current(f)).effectivePlan,"silver");
  const applied=await History.findById(s.history._id).lean(),sub=await Subscription.findById(f.subscription._id).lean();assert.equal(applied.status,"applied");assert.equal(applied.outcome,"applied");assert.equal(applied.appliedPlan,"silver");assert.ok(applied.actualEffectiveAt instanceof Date);assert.equal(applied.appliedGeneration,1);assert.equal(sub.plan,"silver");
  const before=await snapshot(f);const repeats=await Promise.all([callback(id),webhook(id),webhook(id)]);assert.ok(repeats.every(r=>[200,302].includes(r.status)));assert.equal(await snapshot(f),before);assert.equal(await History.countDocuments({account:f.employer._id}),1);assert.equal((await Lifecycle.findById(`employer:${f.employer._id}`).lean()).generation,1);
 });
 await t.test("upgrade after downgrade preserves restriction until payment, then clears it",async()=>{
  const f=await fixture("platinum"),source=JSON.stringify(await Payment.findById(f.payment._id).lean());await recordEmployerPlanRequest({authenticatedUser:{_id:f.employer._id,role:"employer"},accountId:String(f.employer._id),requestId:randomUUID(),toPlan:"bronze"});
  const before=await snapshot(f),s=await start(f,"silver");assert.equal(s.status,200);assert.equal(await snapshot(f),before);assert.equal((await current(f)).effectivePlan,"bronze");
  await callback(receipt(s.payment));const sub=await Subscription.findById(f.subscription._id).lean();assert.equal(sub.plan,"silver");assert.equal(sub.accessPlan,undefined);assert.equal(sub.accessPlanHistory,undefined);assert.equal(sub.accessPlanGeneration,undefined);assert.equal((await current(f)).effectivePlan,"silver");assert.equal(JSON.stringify(await Payment.findById(f.payment._id).lean()),source);
 });
 for(const kind of ["failed","underpayment","currency","wrong-reference","missing-id"])await t.test(`invalid/failed verified response retains current access: ${kind}`,async()=>{
  const f=await fixture(),before=await snapshot(f),s=await start(f);const changes=kind==="failed"?{status:"failed"}:kind==="underpayment"?{amount:0.01}:kind==="currency"?{currency:"NGN"}:kind==="wrong-reference"?{tx_ref:"wrong"}:{id:null};
  const id=receipt(s.payment,changes),result=await callbackFor(s.payment,id);assert.ok([302,400].includes(result.status));assert.equal(await snapshot(f),before);assert.equal((await current(f)).effectivePlan,"bronze");assert.notEqual((await History.findById(s.history._id).lean()).status,"applied");
 });
 await t.test("uncertain verification remains awaiting payment, valid retry can later apply",async()=>{
  const f=await fixture(),before=await snapshot(f),s=await start(f),id=`SIM-${randomUUID()}`;receipts.set(id,new Error("Synthetic transport timeout"));assert.equal((await callbackFor(s.payment,id)).status,503);assert.equal(await snapshot(f),before);assert.equal((await History.findById(s.history._id).lean()).status,"awaiting_payment");
  receipts.set(id,{id,status:"successful",tx_ref:s.payment.txRef,amount:s.payment.amount,currency:s.payment.currency});await callbackFor(s.payment,id);assert.equal((await current(f)).effectivePlan,"silver");
 });
 await t.test("initialization timeout cannot create a second hosted checkout on retry",async()=>{
  const f=await fixture(),before=await snapshot(f),calls=initCalls;failInit=true;let s;try{s=await start(f);}finally{failInit=false;}
  assert.equal(s.status,503);assert.equal(await snapshot(f),before);assert.equal((await start(f,"silver",s.body)).status,409);assert.equal(initCalls,calls+1);assert.equal((await start(f)).status,409);assert.equal(initCalls,calls+1);
 });
 await t.test("concurrent same UUID / competing UUID initialization never creates duplicate checkout",async()=>{
  for(const same of [true,false]){const f=await fixture(),body=await intent(f),count=initCalls;const results=await Promise.all([start(f,"silver",body),start(f,"silver",same?body:{...body,requestId:randomUUID()})]);assert.ok(results.some(x=>x.status===200));assert.ok(results.every(x=>[200,409].includes(x.status)));assert.equal(initCalls,count+1);assert.equal(await History.countDocuments({account:f.employer._id}),1);}
 });
 await t.test("only authenticated owner; forged price/actor, Admin, wrong audience and stale preview reject",async()=>{
  const f=await fixture(),other=await fixture(),body=await intent(f),calls=initCalls,admin=await Admin.create({name:"Synthetic",email:`${randomUUID()}@example.invalid`,password:"Synthetic-only"});
  assert.equal((await call("/api/payments/employer/create-checkout",null,body)).status,401);assert.equal((await call("/api/payments/employer/create-checkout",token(admin._id,"admin"),body)).status,403);assert.equal((await call("/api/payments/employer/create-checkout",other.auth,body)).status,409);
  for(const key of ["amount","currency","accountId","requestedBy","paymentPlanId"])assert.equal((await call("/api/payments/employer/create-checkout",f.auth,{...body,[key]:"forged"})).status,400);
  const p=await preview(f);assert.equal((await call("/api/payments/employer/create-checkout",f.auth,{...body,previewToken:p.previewToken})).status,409);
  await Subscription.updateOne({_id:f.subscription._id},{$set:{currentPeriodEnd:new Date(Date.now()+900000)}});assert.equal((await start(f,"silver",body)).status,409);assert.equal(initCalls,calls);
 });
 await t.test("downgrade invalidates payment permission; paid stale receipt is retained without access",async()=>{
  const f=await fixture("silver"),s=await start(f,"platinum");await recordEmployerPlanRequest({authenticatedUser:{_id:f.employer._id,role:"employer"},accountId:String(f.employer._id),requestId:randomUUID(),toPlan:"bronze"});const before=await snapshot(f);
  const id=receipt(s.payment);await callback(id);assert.equal(await snapshot(f),before);assert.equal((await current(f)).effectivePlan,"bronze");assert.equal((await Payment.findById(s.payment._id).lean()).status,"successful");assert.equal((await History.findById(s.history._id).lean()).status,"superseded");assert.equal((await start(f,"platinum",s.body)).status,409);
 });
 await t.test("concurrent cancellation and verified upgrade serialize, refreshed cancellation still works",async()=>{
  const f=await fixture(),s=await start(f),options={role:"employer",accountId:String(f.employer._id)},p=await previewOwnSubscriptionCancellation(options),id=receipt(s.payment);
  const result=await Promise.allSettled([callback(id),cancelOwnSubscription({...options,previewToken:p.previewToken,requestId:randomUUID()})]);assert.ok(result.some(x=>x.status==="fulfilled"));
  if((await current(f)).paidEligible){const fresh=await previewOwnSubscriptionCancellation(options);await cancelOwnSubscription({...options,previewToken:fresh.previewToken,requestId:randomUUID()});}
  await webhook(id);assert.equal((await current(f)).effectivePlan,"free");
 });
 await t.test("concurrent downgrade and verified upgrade cannot apply a stale signed intent",async()=>{
  const f=await fixture("silver"),s=await start(f,"platinum"),p=await employerPlanRequestContext(String(f.employer._id)),id=receipt(s.payment);
  const result=await Promise.allSettled([callback(id),recordEmployerPlanRequest({authenticatedUser:{_id:f.employer._id,role:"employer"},accountId:String(f.employer._id),requestId:randomUUID(),toPlan:"bronze",expectedActivationFingerprint:p.activationFingerprint,expectedFromPlan:p.currentPlan})]);assert.ok(result.some(x=>x.status==="fulfilled"));
  const access=await current(f);assert.ok(["platinum","bronze"].includes(access.effectivePlan));const row=await History.findById(s.history._id).lean();assert.equal(row.status,access.effectivePlan==="platinum"?"applied":"superseded");
 });
 await t.test("activation rollback retains old access/payment state and retry applies once",async t=>{
  const f=await fixture(),s=await start(f),before=await snapshot(f),id=receipt(s.payment),save=History.prototype.save;
  const mock=t.mock.method(History.prototype,"save",function(...args){if(this.executionPolicy==="payment-upgrade-v1"&&this.status==="applied")throw Error("Synthetic activation audit failure");return save.apply(this,args);});
  assert.equal((await callback(id)).status,503);assert.equal(await snapshot(f),before);assert.equal((await Payment.findById(s.payment._id).lean()).status,"pending");assert.equal((await History.findById(s.history._id).lean()).status,"awaiting_payment");mock.mock.restore();
  await callback(id);assert.equal((await current(f)).effectivePlan,"silver");
 });
 await t.test("Free entry uses explicit owner checkout and records truthful source evidence",async()=>{
  const f=await fixture(null),s=await start(f,"bronze");assert.equal(s.status,200);assert.equal(s.history.fromPlan,"free");assert.equal(s.history.sourcePayment,undefined);await callback(receipt(s.payment));assert.equal((await current(f)).effectivePlan,"bronze");
 });

 await t.test("uncertain finalization recovers a known hosted link without a second provider call",async t=>{
  const f=await fixture(),before=await snapshot(f),calls=initCalls,save=Payment.prototype.save;let failed=false;
  const mock=t.mock.method(Payment.prototype,"save",function(...args){if(!failed&&this.metadata?.checkoutState==="ready"){failed=true;throw Error("Synthetic save uncertainty");}return save.apply(this,args);});
  const started=await start(f);mock.mock.restore();assert.equal(started.status,503);assert.match(started.data.message,/Refresh status/);assert.equal(await snapshot(f),before);assert.equal(initCalls,calls+1);
  const p=await preview(f);assert.ok(p.upgradeCheckoutUrl);assert.equal(p.upgradeRequest.status,"awaiting_payment");assert.equal((await start(f,"silver",started.body)).status,200);assert.equal(initCalls,calls+1);
  const {completeEmployerUpgradeCheckout}=await import("../src/services/employerUpgrade.js");await completeEmployerUpgradeCheckout({accountId:String(f.employer._id),paymentId:started.payment._id,uncertain:true});assert.equal((await preview(f)).upgradeCheckoutUrl,p.upgradeCheckoutUrl);assert.equal(await snapshot(f),before);
 });
 await t.test("Admin plan search follows validated effective access and paginates matching rows",async()=>{
  const f=await fixture("platinum"),g=await fixture("platinum"),admin=await Admin.create({name:"Search Admin",email:`${randomUUID()}@example.invalid`,password:"Synthetic-only"});
  await recordEmployerPlanRequest({authenticatedUser:{_id:f.employer._id,role:"employer"},accountId:String(f.employer._id),requestId:randomUUID(),toPlan:"bronze"});
  const search=async(term,page=1,limit=100)=>(await call(`/api/admin/subscriptions?type=employer&search=${encodeURIComponent(term)}&page=${page}&limit=${limit}`,token(admin._id,"admin"))).data;
  const bronze=await search("BrOnZe"),platinum=await search("platinum");assert.ok(bronze.success);assert.equal(bronze.data.find(x=>x.accountId===String(f.employer._id)).plan,"bronze");assert.ok(!platinum.data.some(x=>x.accountId===String(f.employer._id)));assert.ok(platinum.data.some(x=>x.accountId===String(g.employer._id)));
  const first=await search("bronze",1,1),second=await search("bronze",2,1);assert.equal(first.pagination.total,bronze.pagination.total);assert.equal(first.data.length,1);assert.equal(second.data.length,1);assert.notEqual(first.data[0].accountId,second.data[0].accountId);
  const name=await search(f.employer.email);assert.equal(name.pagination.total,1);assert.equal(name.data[0].plan,"bronze");
  await Subscription.updateOne({_id:f.subscription._id},{$set:{accessPlanHistory:"missing-history"}});assert.ok(!(await search("bronze")).data.some(x=>x.accountId===String(f.employer._id)));assert.ok((await search("free")).data.some(x=>x.accountId===String(f.employer._id)));
  await Subscription.updateOne({_id:g.subscription._id},{$set:{currentPeriodEnd:new Date(Date.now()-1000)}});assert.ok(!(await search("platinum")).data.some(x=>x.accountId===String(g.employer._id)));assert.ok((await search("free")).data.some(x=>x.accountId===String(g.employer._id)));
 });

 await t.test("ordinary Employer checkout callback/webhook and active guard",async()=>{
  const f=await fixture(null);assert.equal((await call("/api/payments/employer/create-checkout",f.auth,{plan:"bronze"})).status,200);
  const p=await Payment.findOne({employer:f.employer._id}).lean();assert.equal(p.metadata?.upgradeRequest,undefined);assert.equal(hosted.at(-1).payment_plan,101);assert.equal(p.amount,6.99);
  const id=receipt(p);assert.equal((await callback(id)).status,302);assert.equal((await current(f)).effectivePlan,"bronze");const before=await snapshot(f);await webhook(id);await callback(id);assert.equal(await snapshot(f),before);assert.equal(await History.countDocuments({account:f.employer._id}),0);assert.equal((await call("/api/payments/employer/create-checkout",f.auth,{plan:"silver"})).status,400);
  receipts.set(id,{...receipts.get(id),status:"failed"});await webhook(id);assert.equal(await snapshot(f),before);assert.equal((await Payment.findById(p._id).lean()).status,"successful");
 });
 await t.test("ordinary Talent checkout, verification and duplicate delivery",async()=>{
  const {default:Talent}=await import("../src/models/Talent.js"),{default:TalentPayment}=await import("../src/models/TalentPayment.js"),{default:TalentSubscription}=await import("../src/models/TalentSubscription.js");
  const talent=await Talent.create({email:`${randomUUID()}@example.invalid`,password:"Synthetic-Only!2026",isVerified:true,accountStatus:"active"}),auth=token(talent._id,"talent");assert.equal((await call("/api/payments/create-checkout",auth,{plan:"public"})).status,200);const p=await TalentPayment.findOne({talent:talent._id}).lean();assert.equal(hosted.at(-1).payment_plan,104);assert.equal(p.amount,1.99);const id=receipt(p);const cb=()=>call(`/api/payments/callback?tx_ref=${encodeURIComponent(p.txRef)}&transaction_id=${encodeURIComponent(id)}`);assert.equal((await cb()).status,302);const sub=await TalentSubscription.findOne({talent:talent._id}).lean();assert.equal(sub.status,"active");const before=JSON.stringify(sub);await cb();await webhook(id);assert.equal(JSON.stringify(await TalentSubscription.findById(sub._id).lean()),before);assert.equal(await History.countDocuments({account:talent._id}),0);assert.equal((await call("/api/payments/create-checkout",auth,{plan:"public"})).status,400);
 });
 assert.equal(http.request.mock.callCount(),0);assert.equal(https.request.mock.callCount(),0);assert.equal(globalThis.fetch.mock.callCount(),0);
 console.log(`Synthetic upgrade database retained: ${mongoose.connection.name}`);
});
