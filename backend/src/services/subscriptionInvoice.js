import { createHash } from "node:crypto";
import process from "node:process";
import jwt from "jsonwebtoken";
import { loadSubscriptionEvidence, subscriptionStatusFromEvidence } from "./subscriptionStatus.js";
import { SubscriptionEmailGate as Gate, SubscriptionEmailAttempt as Attempt } from "../models/SubscriptionEmailDelivery.js";
import { renderSubscriptionEmail } from "../utils/subscriptionEmailTemplate.js";
import { sendSubscriptionEmail } from "../utils/sendEmail.js";

const fail = (status, code, message, extra = {}) => Object.assign(new Error(message), { status, code, ...extra });
const email = value => typeof value === "string" && value.length <= 254 && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value) && !/[\r\n]/.test(value);
const reference = value => typeof value === "string" && value.length > 0 && value.length <= 512 && !Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
const audience = "admin-subscription-invoice-preview";
const cooldown = 60_000, hour = 3_600_000;

async function invoiceEvidence(role, accountId, now) {
  if (!["talent", "employer"].includes(role) || !/^[a-f\d]{24}$/i.test(accountId || "")) throw fail(400, "INVALID_INVOICE_TARGET", "A valid account role and ID are required.");
  const evidence = await loadSubscriptionEvidence({ accountId, role, invoice: true });
  const { account, subscription, payment, ambiguousPayment } = evidence;
  if (!account) throw fail(404, "INVOICE_ACCOUNT_MISSING", "Account not found.");
  if (ambiguousPayment) throw fail(409, "INVOICE_PAYMENT_AMBIGUOUS", "The subscription payment evidence is ambiguous.");
  const status = subscriptionStatusFromEvidence(evidence, { role, now });
  if (!status.paidEligible) throw fail(409, "INVOICE_EVIDENCE_UNAVAILABLE",
    account.accountStatus !== "active" ? "Invoices require an active account."
      : !subscription ? "No active subscription is available for this account."
        : !payment ? "The active subscription has no successful payment matching its stored references."
          : "The subscription has expired or its billing evidence is inactive or inconsistent.");
  if (!["subscription", "subscription_renewal"].includes(payment.type)) throw fail(422, "INVOICE_PAYMENT_INVALID", "A successful subscription payment is required.");
  if (!email(account.email)) throw fail(422, "INVOICE_RECIPIENT_MISSING", "The account does not have a valid invoice recipient.");
  const currency = payment.currency;
  const paidAt = payment.paidAt && new Date(payment.paidAt);
  const paymentReference = reference(payment.txRef) ? payment.txRef : payment.transactionId;
  if (typeof payment.amount !== "number" || !Number.isFinite(payment.amount) || payment.amount < 0
    || typeof currency !== "string" || !Intl.supportedValuesOf("currency").includes(currency)
    || !paidAt || !Number.isFinite(paidAt.getTime()) || !reference(paymentReference)) {
    throw fail(422, "INVOICE_PAYMENT_DATA_MISSING", "The linked payment needs a valid recorded amount, currency, reference and payment date.");
  }
  const rawName = role === "talent" ? account.fullName : account.companyName || account.displayName;
  const name = (typeof rawName === "string" && rawName.trim()) || [account.firstName, account.lastName].filter(value => typeof value === "string").join(" ").trim();
  const invoice = {
    accountId: String(account._id), role, name: name || (role === "talent" ? "Talent" : "Employer"), recipient: account.email,
    subscriptionId: String(subscription._id), paymentId: String(payment._id), plan: subscription.plan,
    recordedPaymentAmount: payment.amount, currency, reference: paymentReference,
    paymentDate: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(paidAt),
  };
  const fingerprint = createHash("sha256").update(JSON.stringify({ invoice, paidAt: paidAt.toISOString(),
    periodStart: status.periodStart, periodEnd: status.expiry, txRef: subscription.lastTxRef, transactionId: subscription.lastTransactionId })).digest("hex");
  return { invoice, fingerprint };
}

export async function previewSubscriptionInvoice({ role, accountId, adminId }, { now = () => new Date() } = {}) {
  const { invoice, fingerprint } = await invoiceEvidence(role, accountId, now());
  const gate = await Gate.findById(`invoice:${role}:${invoice.paymentId}`).lean();
  const time = now().getTime();
  const recent = (gate?.attemptTimes || []).filter(at => new Date(at).getTime() > time - hour);
  const until = Math.max(time, new Date(gate?.lastAttemptAt || 0).getTime() + cooldown,
    recent.length >= 3 ? new Date(recent[0]).getTime() + hour : 0);
  const previewToken = jwt.sign({ role, accountId, fingerprint }, process.env.JWT_SECRET, {
    algorithm: "HS256", audience, subject: String(adminId), expiresIn: "10m",
  });
  return { invoice, previewToken, delivery: { blocked: Boolean(gate?.pending), retryAfterSeconds: Math.max(0, Math.ceil((until - time) / 1000)) } };
}

function previousResult(attempt) {
  if (attempt.status === "accepted") return { success: true, code: "INVOICE_REQUESTED", message: "Invoice email sent successfully.", requestId: attempt._id };
  if (attempt.status === "blocked" && attempt.retryAt) throw fail(429, "INVOICE_RESEND_LIMITED", "Invoice resend is limited. Wait before requesting another send.", { retryAt: attempt.retryAt });
  if (attempt.status === "failed") throw fail(502, "INVOICE_EMAIL_FAILED", "The invoice email request was rejected. Please try again deliberately after the cooldown.", { retryAt: new Date(new Date(attempt.createdAt).getTime() + cooldown) });
  throw fail(409, "INVOICE_SEND_UNCONFIRMED", "An invoice send is pending or unconfirmed. Check the inbox and request administrator review before another send.");
}

export async function sendInvoice({ role, accountId, adminId, previewToken, requestId }, { now = () => new Date(), send = sendSubscriptionEmail } = {}) {
  if (typeof requestId !== "string" || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(requestId) || typeof previewToken !== "string") {
    throw fail(400, "INVALID_INVOICE_REQUEST", "A preview and valid request ID are required.");
  }
  let selected;
  try { selected = jwt.verify(previewToken, process.env.JWT_SECRET, { algorithms: ["HS256"], audience, subject: String(adminId) }); }
  catch { throw fail(409, "INVOICE_PREVIEW_STALE", "Refresh the invoice preview before sending."); }
  const evidence = await invoiceEvidence(role, accountId, now());
  const { invoice, fingerprint } = evidence;
  if (selected.role !== role || selected.accountId !== accountId || selected.fingerprint !== fingerprint) throw fail(409, "INVOICE_PREVIEW_STALE", "Subscription or payment details changed. Refresh the invoice preview.");
  const scope = `invoice:${role}:${invoice.paymentId}`;
  const owner = { scope, admin: adminId, account: accountId, role, subscription: invoice.subscriptionId, payment: invoice.paymentId, fingerprint };
  let attempt;
  try { attempt = await Attempt.create({ _id: requestId, ...owner }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    attempt = await Attempt.findById(requestId).lean();
    if (!attempt || attempt.scope !== scope || String(attempt.admin) !== String(adminId) || attempt.fingerprint !== fingerprint) throw fail(409, "INVOICE_REQUEST_CONFLICT", "This request ID belongs to a different invoice request.");
    return previousResult(attempt);
  }
  try { await Gate.updateOne({ _id: scope }, { $setOnInsert: { pending: null, attemptTimes: [] } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
  const time = now(), cutoff = new Date(time.getTime() - hour);
  const claimed = await Gate.findOneAndUpdate({ _id: scope, pending: null,
    $and: [{ $or: [{ lastAttemptAt: { $exists: false } }, { lastAttemptAt: { $lte: new Date(time.getTime() - cooldown) } }] },
      { $expr: { $lt: [{ $size: { $filter: { input: "$attemptTimes", as: "at", cond: { $gt: ["$$at", cutoff] } } } }, 3] } }],
  }, { $set: { pending: requestId, lastAttemptAt: time }, $push: { attemptTimes: { $each: [time], $slice: -3 } } }, { new: true }).lean();
  if (!claimed) {
    const gate = await Gate.findById(scope).lean();
    if (gate?.pending) {
      await Attempt.updateOne({ _id: requestId }, { $set: { status: "blocked" } });
      throw fail(409, "INVOICE_SEND_UNCONFIRMED", "An invoice send is pending or unconfirmed. Check the inbox and request administrator review before another send.");
    }
    const recent = (gate?.attemptTimes || []).filter(at => at > cutoff);
    const retryAt = new Date(Math.max(time.getTime(), new Date(gate?.lastAttemptAt || time).getTime() + cooldown,
      recent.length >= 3 ? new Date(recent[0]).getTime() + hour : 0));
    await Attempt.updateOne({ _id: requestId }, { $set: { status: "blocked", retryAt } });
    throw fail(429, "INVOICE_RESEND_LIMITED", "Invoice resend is limited. Wait before requesting another send.", { retryAt });
  }
  let providerStarted = false;
  try {
    // Detect changed evidence after the atomic claim, before contacting SendGrid.
    const current = await invoiceEvidence(role, accountId, now());
    if (current.fingerprint !== fingerprint) throw fail(409, "INVOICE_PREVIEW_STALE", "Subscription or payment details changed. Refresh the invoice preview.");
    const message = renderSubscriptionEmail({ title: "Invoice", introduction: "Your subscription payment is recorded below.", fields: [
      ["Account", invoice.name], ["Role", role === "talent" ? "Talent" : "Employer"], ["Plan", invoice.plan],
      ["Recorded payment amount", `${String(invoice.recordedPaymentAmount)} ${invoice.currency}`],
      ["Payment reference", invoice.reference], ["Recorded payment date", invoice.paymentDate],
    ] });
    providerStarted = true;
    const response = await send({ to: invoice.recipient, ...message });
    if (response?.[0]?.statusCode !== 202) throw new Error("Acceptance unconfirmed");
    // Persist acceptance before releasing the gate. A failed audit write must
    // leave the gate locked, even when the provider might have accepted email.
    await Attempt.updateOne({ _id: requestId }, { $set: { status: "accepted" } });
    await Gate.updateOne({ _id: scope, pending: requestId }, { $set: { pending: null } });
    return previousResult({ _id: requestId, status: "accepted" });
  } catch (error) {
    const providerStatus = Number(error.response?.statusCode || error.response?.status || error.code);
    const definite = !providerStarted || providerStatus >= 400 && providerStatus < 500;
    await Attempt.updateOne({ _id: requestId }, { $set: { status: definite ? "failed" : "uncertain" } });
    if (definite) await Gate.updateOne({ _id: scope, pending: requestId }, { $set: { pending: null } });
    if (!providerStarted && error.status) throw error;
    throw fail(definite ? 502 : 503, definite ? "INVOICE_EMAIL_FAILED" : "INVOICE_SEND_UNCONFIRMED",
      definite ? "Unable to request the invoice email. Please try again deliberately after the cooldown."
        : "The invoice email request could not be confirmed. Check the inbox and request administrator review before another send.",
      definite ? { retryAt: new Date(time.getTime() + cooldown) } : {});
  }
}
