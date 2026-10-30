import jwt from "jsonwebtoken";
import process from "node:process";
import Employer from "../models/Employer.js";
import { employerPlanRequestContext, employerPlanRequestDto, recordEmployerPlanRequest } from "../services/employerPlanRequest.js";
import { EMPLOYER_PLAN_ORDER } from "../utils/employerPlanRequest.js";

const audience = "admin-employer-immediate-downgrade";
const respond = async (req, res, submit) => {
  res.set("Cache-Control", "private, no-store");
  if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Admin account required." });
  const accountId = String(req.params.accountId || "").toLowerCase(), adminId = String(req.user._id);
  if (!/^[a-f\d]{24}$/.test(accountId)) return res.status(400).json({ success: false, code: "SUBSCRIPTION_REQUEST_INVALID", message: "A valid Employer account ID is required." });
  try {
    if (!submit) {
      const account = await Employer.findById(accountId).select("companyName displayName firstName lastName email").lean();
      if (!account) return res.status(404).json({ success: false, message: "Employer not found." });
      const { activationFingerprint, ...context } = await employerPlanRequestContext(accountId);
      return res.json({ success: true, ...context, subscription: { accountId, role: "employer", plan: context.currentPlan,
        status: context.currentStatus, name: account.companyName || account.displayName || `${account.firstName || ""} ${account.lastName || ""}`.trim(), email: account.email },
        allowedPlans: context.allowedPlans,
        previewToken: jwt.sign({ accountId, role: "employer", activationFingerprint, fromPlan: context.currentPlan, executionPolicy: context.executionPolicy }, process.env.JWT_SECRET,
          { algorithm: "HS256", audience, subject: adminId, expiresIn: "10m" }) });
    }
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some(key => !["requestId", "toPlan", "previewToken"].includes(key))) {
      return res.status(400).json({ success: false, code: "SUBSCRIPTION_REQUEST_INVALID", message: "Only request ID, requested plan and confirmation token are accepted." });
    }
    let preview;
    try { preview = jwt.verify(req.body.previewToken, process.env.JWT_SECRET, { algorithms: ["HS256"], audience, subject: adminId }); }
    catch { return res.status(409).json({ success: false, code: "SUBSCRIPTION_SELECTION_STALE", message: "Refresh the selected Employer confirmation before submitting." }); }
    if (preview.accountId !== accountId || preview.role !== "employer" || typeof preview.activationFingerprint !== "string" || preview.executionPolicy !== "immediate-downgrade-v1"
        || !EMPLOYER_PLAN_ORDER.includes(preview.fromPlan)) {
      return res.status(409).json({ success: false, code: "SUBSCRIPTION_SELECTION_STALE", message: "The selected Employer changed. Refresh the confirmation." });
    }
    const result = await recordEmployerPlanRequest({ authenticatedUser: req.user, accountId, requestId: req.body.requestId,
      toPlan: req.body.toPlan, expectedActivationFingerprint: preview.activationFingerprint, expectedFromPlan: preview.fromPlan });
    return res.json({ success: true, replayed: result.replayed, request: employerPlanRequestDto(result.request) });
  } catch (error) {
    const expected = typeof error.code === "string" && error.code.startsWith("SUBSCRIPTION_");
    return res.status(expected ? error.status === 401 ? 404 : error.status : 503).json({ success: false,
      code: expected ? error.code : "SUBSCRIPTION_SERVICE_UNAVAILABLE",
      message: expected ? error.message : "Request outcome unconfirmed. Refresh the selected Employer before retrying." });
  }
};
export const previewAdminEmployerPlanRequest = (req, res) => respond(req, res, false);
export const submitAdminEmployerPlanRequest = (req, res) => respond(req, res, true);
