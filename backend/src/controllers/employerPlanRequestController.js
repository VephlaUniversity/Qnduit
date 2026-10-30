import { employerUpgradeOptions, UPGRADE_POLICY } from "../services/employerUpgrade.js";
import { UPGRADE_AUDIENCE } from "./employerUpgradeController.js";
import jwt from "jsonwebtoken";
import process from "node:process";
import { employerPlanRequestContext, employerPlanRequestDto, recordEmployerPlanRequest } from "../services/employerPlanRequest.js";

const audience = "employer-immediate-downgrade";
const respond = async (req, res, submit) => {
  res.set("Cache-Control", "private, no-store");
  if (req.user.role !== "employer") return res.status(403).json({ success: false, message: "Employer account required." });
  try {
    const accountId = String(req.user._id);
    if (!submit) {
      const { activationFingerprint, ...context } = await employerPlanRequestContext(accountId);
      const previewToken = jwt.sign({ accountId, activationFingerprint, fromPlan: context.currentPlan, executionPolicy: context.executionPolicy }, process.env.JWT_SECRET,
        { algorithm: "HS256", audience, subject: accountId, expiresIn: "10m" });
      const upgrade = await employerUpgradeOptions(accountId, { ...context, activationFingerprint });
      const upgradePreviewToken = jwt.sign({ accountId, activationFingerprint, fromPlan: context.currentPlan, executionPolicy: UPGRADE_POLICY }, process.env.JWT_SECRET,
        { algorithm: "HS256", audience: UPGRADE_AUDIENCE, subject: accountId, expiresIn: "10m" });
      return res.json({ success: true, ...context, ...upgrade, previewToken, upgradePreviewToken });
    }
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some(key => !["requestId", "toPlan", "previewToken"].includes(key))) {
      return res.status(400).json({ success: false, code: "SUBSCRIPTION_REQUEST_INVALID", message: "Only request ID, requested plan and confirmation token are accepted." });
    }
    let preview;
    try { preview = jwt.verify(req.body.previewToken, process.env.JWT_SECRET, { algorithms: ["HS256"], audience, subject: accountId }); }
    catch { return res.status(409).json({ success: false, code: "SUBSCRIPTION_SELECTION_STALE", message: "Refresh your plan details before submitting." }); }
    if (preview.accountId !== accountId || typeof preview.activationFingerprint !== "string" || preview.executionPolicy !== "immediate-downgrade-v1") {
      return res.status(409).json({ success: false, code: "SUBSCRIPTION_SELECTION_STALE", message: "The confirmation belongs to another account." });
    }
    const result = await recordEmployerPlanRequest({ authenticatedUser: req.user, accountId,
      requestId: req.body.requestId, toPlan: req.body.toPlan, expectedActivationFingerprint: preview.activationFingerprint,
      expectedFromPlan: preview.fromPlan });
    return res.json({ success: true, replayed: result.replayed, request: employerPlanRequestDto(result.request) });
  } catch (error) {
    const expected = typeof error.code === "string" && error.code.startsWith("SUBSCRIPTION_");
    return res.status(expected ? error.status : 503).json({ success: false,
      code: expected ? error.code : "SUBSCRIPTION_SERVICE_UNAVAILABLE",
      message: expected ? error.message : "The request outcome could not be confirmed. Refresh to check before trying again." });
  }
};
export const getOwnPlanRequests = (req, res) => respond(req, res, false);
export const submitOwnPlanRequest = (req, res) => respond(req, res, true);
