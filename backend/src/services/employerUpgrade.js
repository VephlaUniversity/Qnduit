import crypto from "node:crypto";
import EmployerPayment from "../models/EmployerPayment.js";
import { SubscriptionDowngrade as History, SubscriptionLifecycle as Lifecycle } from "../models/SubscriptionLifecycle.js";
import { withSubscriptionLifecycleTransaction } from "./subscriptionLifecycle.js";
import { loadSubscriptionEvidence, subscriptionStatusFromEvidence } from "./subscriptionStatus.js";
import { employerRequestActivation, employerPlanRequestDto } from "./employerPlanRequest.js";
import { EMPLOYER_PLAN_ORDER, PLAN_REQUEST_ID, employerPlanAction, employerPlanRequestKey, planRequestHash } from "../utils/employerPlanRequest.js";

export const UPGRADE_POLICY = "payment-upgrade-v1";
const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
const eligible = status => ["active", "unpaid", "expired", "cancelled"].includes(status.status) && !["successful_payment_not_linked", "subscription_pending"].includes(status.reason);

export async function employerUpgradeOptions(accountId, context) {
  const history = await History.findOne({ role: "employer", account: accountId, executionPolicy: UPGRADE_POLICY,
    activationFingerprint: context.activationFingerprint, fromPlan: context.currentPlan, status: { $in: ["awaiting_payment", "failed"] } }).sort({ requestedAt: -1, _id: -1 }).lean();
  let checkoutUrl = null;
  if (history?.status === "awaiting_payment") {
    const payment = await EmployerPayment.findOne({ _id: history.payment, employer: accountId, "metadata.upgradeRequest": history._id }).select("metadata").lean();
    if (payment?.metadata?.checkoutState === "ready") checkoutUrl = payment.metadata.checkoutUrl;
  }
  return { upgradePlans: eligible({ status: context.currentStatus, reason: context.currentReason })
    ? EMPLOYER_PLAN_ORDER.filter(plan => employerPlanAction(context.currentPlan, plan) === "upgrade") : [],
  upgradeRequest: employerPlanRequestDto(history), upgradeCheckoutUrl: checkoutUrl };
}

// Authenticated Employer principal and server pricing only. Never called by Admin routes.
export async function initiateEmployerUpgrade({ authenticatedUser, plan, requestId, selected, price, ...unsupported }) {
  const accountId = String(authenticatedUser?._id || "").toLowerCase();
  if (authenticatedUser?.role !== "employer" || !/^[a-f\d]{24}$/.test(accountId)) throw fail(403, "SUBSCRIPTION_UPGRADE_NOT_ALLOWED", "Only the authenticated Employer can initiate an upgrade.");
  if (Object.keys(unsupported).length || !PLAN_REQUEST_ID.test(requestId || "") || !EMPLOYER_PLAN_ORDER.includes(plan) || !selected) throw fail(400, "SUBSCRIPTION_REQUEST_INVALID", "A requested plan, request UUID and preview are required.");
  if (!price || !Number.isSafeInteger(price.paymentPlanId) || price.paymentPlanId <= 0 || !Number.isFinite(price.amount) || price.amount <= 0 || !/^[A-Z]{3}$/.test(price.currency)) throw fail(503, "SUBSCRIPTION_CHECKOUT_CONFIGURATION", "Payment configuration is unavailable.");
  requestId=requestId.toLowerCase(); const id=employerPlanRequestKey(accountId,requestId), requestFingerprint=planRequestHash([UPGRADE_POLICY,accountId,"employer",accountId,plan]);
  return withSubscriptionLifecycleTransaction("employer",accountId,async({Payment,account,state,session})=>{
    if(account.accountStatus!=="active"||!account.isVerified)throw fail(403,"SUBSCRIPTION_CHECKOUT_DENIED","An active verified Employer is required.");
    const prior=await History.findById(id).session(session).lean();
    if(prior){
      if(prior.executionPolicy!==UPGRADE_POLICY||prior.requestFingerprint!==requestFingerprint||String(prior.account)!==accountId||String(prior.requestedBy)!==accountId)throw fail(409,"SUBSCRIPTION_REQUEST_CONFLICT","This request ID belongs to another action.");
      const payment=await Payment.findOne({_id:prior.payment,employer:accountId,"metadata.upgradeRequest":id}).session(session).lean();
      if(!payment)throw fail(409,"SUBSCRIPTION_EVIDENCE_UNAVAILABLE","The checkout payment could not be confirmed.");
      const evidence=await loadSubscriptionEvidence({role:"employer",accountId,session});
      const current=subscriptionStatusFromEvidence(evidence,{role:"employer"});
      const stale=prior.generation!==(state.generation||0)||String(state.pendingPayment||"")!==String(payment._id)||prior.fromPlan!==current.effectivePlan||prior.activationFingerprint!==employerRequestActivation(evidence.subscription,state,accountId);
      return {created:false,request:prior,payment,stale};
    }
    const evidence=await loadSubscriptionEvidence({role:"employer",accountId,session}),status=subscriptionStatusFromEvidence(evidence,{role:"employer"});
    const activationFingerprint=employerRequestActivation(evidence.subscription,state,accountId);
    if(selected.accountId!==accountId||selected.fromPlan!==status.effectivePlan||selected.activationFingerprint!==activationFingerprint||selected.executionPolicy!==UPGRADE_POLICY)throw fail(409,"SUBSCRIPTION_SELECTION_STALE","Your current plan changed. Refresh before checkout.");
    if(!eligible(status))throw fail(409,"SUBSCRIPTION_EVIDENCE_UNAVAILABLE","Your current subscription evidence needs review before checkout.");
    if(employerPlanAction(status.effectivePlan,plan)!=="upgrade")throw fail(400,"SUBSCRIPTION_PLAN_CHANGE_INVALID","Select an eligible higher plan.");
    if(await History.exists({role:"employer",account:accountId,executionPolicy:UPGRADE_POLICY,generation:state.generation||0,activationFingerprint,fromPlan:status.effectivePlan,status:"awaiting_payment"}).session(session))throw fail(409,"SUBSCRIPTION_CHANGE_PENDING","An upgrade checkout already exists. Refresh to resume it.");
    const now=new Date(),paymentId=new Payment()._id,txRef=`QND-EMP-UP-${accountId}-${crypto.randomUUID()}`;
    const [payment]=await Payment.create([{_id:paymentId,employer:accountId,plan,provider:"flutterwave",txRef,amount:price.amount,currency:price.currency,type:"subscription",status:"pending",activationGeneration:state.generation||0,
      metadata:{employerId:accountId,plan,paymentPlanId:price.paymentPlanId,upgradeRequest:id,checkoutState:"initializing"}}],{session});
    const [request]=await History.create([{_id:id,requestVersion:2,executionPolicy:UPGRADE_POLICY,role:"employer",account:accountId,actorRole:"employer",requestedBy:accountId,requestId,requestFingerprint,
      fromPlan:status.effectivePlan,toPlan:plan,actionType:"upgrade",status:"awaiting_payment",outcome:"awaiting_payment",requestedAt:now,actualEffectiveAt:null,scheduledEffectiveAt:null,
      generation:state.generation||0,activationFingerprint,payment:paymentId,
      ...(evidence.subscription?{subscription:evidence.subscription._id,lastTxRef:evidence.subscription.lastTxRef,lastTransactionId:evidence.subscription.lastTransactionId,sourcePeriodStart:evidence.subscription.currentPeriodStart,sourcePeriodEnd:evidence.subscription.currentPeriodEnd}:{}),
      ...(evidence.payment?{sourcePayment:evidence.payment._id}:{})}],{session});
    // Pending checkout permission does not change the active generation, account flags or access restriction.
    await Lifecycle.updateOne({_id:state._id},{$set:{pendingPayment:paymentId}},{session});
    return {created:true,request:request.toObject(),payment:payment.toObject()};
  });
}

export async function completeEmployerUpgradeCheckout({accountId,paymentId,checkoutUrl,uncertain=false}) {
  return withSubscriptionLifecycleTransaction("employer",accountId,async({Payment,state,session})=>{
    const payment=await Payment.findOne({_id:paymentId,employer:accountId}).session(session);
    if(!payment?.metadata?.upgradeRequest)throw fail(409,"SUBSCRIPTION_EVIDENCE_UNAVAILABLE","Upgrade checkout not found.");
    // A lost acknowledgement must never demote a durably stored usable link.
    const ready = checkoutUrl || (payment.metadata.checkoutState === "ready" && payment.metadata.checkoutUrl);
    payment.metadata={...payment.metadata,checkoutState:ready?"ready":uncertain?"unconfirmed":"initializing",...(ready?{checkoutUrl:ready}:{})};
    await payment.save({session});
    return {current:payment.activationGeneration===(state.generation||0)&&String(state.pendingPayment||"")===String(paymentId)};
  });
}
