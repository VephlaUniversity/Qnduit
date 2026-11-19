import mongoose from "mongoose";
import { readAdminDiscountUsage, usageFields } from "../services/adminDiscountUsage.js";
import DiscountCode, { discountCapacityUsed, discountRevisionFilter } from "../models/DiscountCode.js";

const editableFields = ["terms", "startsOn", "expiresOn", "maxTotalUses", "eligiblePlans", "active"];
const createFields = new Set(["code", ...editableFields]);
const updateFields = new Set(["revision", ...editableFields]);
const paidPlans = new Set(["talent:public", "employer:bronze", "employer:silver", "employer:platinum"]);
const codePattern = /^[A-Za-z0-9_-]{1,64}$/;
const listFields = new Set(["search", "sort", "page", "limit"]);
const discountSorts = {
  newest: { createdAt: -1, _id: 1 },
  oldest: { createdAt: 1, _id: 1 },
  "code-asc": { _id: 1 },
};
const maxPages = 10_000;
const configurationFields = "_id terms startsAt expiresAt maxTotalUses eligiblePlans active";
const toDiscountCode = ({ _id, terms, startsAt, expiresAt, maxTotalUses, eligiblePlans, active }) =>
  ({ code: _id, terms, startsAt, expiresAt, maxTotalUses, eligiblePlans, active });
const editDto = row => ({ ...toDiscountCode(row), revision: row.revision ?? 0 });
const normalizedCode = value => codePattern.test(value.trim()) ? value.trim().toUpperCase() : "";

export async function listAdminDiscountCodes(req, res) {
  const query = req.query;
  const exact = Object.hasOwn(query, "code");
  const { search = "", sort = "newest", page = "1", limit = "10", code } = query;
  const validPage = typeof page === "string" && /^[1-9]\d{0,4}$/.test(page) && Number(page) <= maxPages;
  const validLimit = typeof limit === "string" && /^[1-9]\d?$/.test(limit) && Number(limit) <= 50;
  if (exact ? Object.keys(query).length !== 1 || typeof code !== "string" || !codePattern.test(code.trim())
    : Object.keys(query).some(key => !listFields.has(key)) || typeof search !== "string" || search.length > 64 ||
      typeof sort !== "string" || !Object.hasOwn(discountSorts, sort) || !validPage || !validLimit) {
    return res.status(400).json({ success: false, message: "Invalid discount code search, sort, or pagination." });
  }

  const term = search.trim().toUpperCase();
  const filter = exact ? { _id: code.trim().toUpperCase() }
    : term ? { _id: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") } } : {};
  const pageSize = exact ? 1 : Number(limit);
  let session;
  try {
    if (!exact) session = await mongoose.startSession({ snapshot: true });
    const total = await DiscountCode.countDocuments(filter).session(session ?? null);
    const totalPages = Math.max(1, Math.min(maxPages, Math.ceil(total / pageSize)));
    const currentPage = exact ? 1 : Math.min(Number(page), totalPages);
    const rows = await DiscountCode.find(filter).select(exact ? configurationFields : `${configurationFields} ${usageFields}`).session(session ?? null)
      .sort(discountSorts[sort]).skip((currentPage - 1) * pageSize).limit(pageSize).lean();
    const pagination = { page: currentPage, limit: pageSize, total, totalPages };
    if (exact) return res.json({ success: true, data: rows.map(toDiscountCode), pagination });
    const { overview, usageByCode } = await readAdminDiscountUsage(rows, session);
    return res.json({ success: true, data: rows.map((row, index) => ({
      ...toDiscountCode(row), usage: usageByCode[index],
    })), pagination, overview });
  } catch {
    return res.status(503).json({ success: false, message: "Discount codes could not be loaded." });
  } finally {
    await session?.endSession();
  }
}

function parseDateOnly(value) {
  if (typeof value !== "string" || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

const validBody = (body, allowed) => body && typeof body === "object" && !Array.isArray(body)
  && Object.keys(body).every(key => allowed.has(key));

function validateConfiguration(body, errors) {
  const terms = body.terms;
  const percentage = terms?.type === "percentage" && Object.keys(terms).length === 2 &&
    Number.isSafeInteger(terms.basisPoints) && terms.basisPoints >= 1 && terms.basisPoints <= 10_000;
  const fixed = terms?.type === "fixed" && Object.keys(terms).length === 3 &&
    Number.isSafeInteger(terms.amountMinor) && terms.amountMinor > 0 && terms.currency === "USD";
  if (!percentage && !fixed) {
    errors.terms = "Enter 1–10000 basis points or a positive fixed amount in USD cents.";
  }

  const startsAt = parseDateOnly(body.startsOn);
  const expiresAt = parseDateOnly(body.expiresOn);
  if (!startsAt) errors.startsOn = "Enter a valid start date in YYYY-MM-DD format.";
  if (!expiresAt || (startsAt && expiresAt <= startsAt)) {
    errors.expiresOn = "Enter a valid expiration date after the start date.";
  }
  const { maxTotalUses, eligiblePlans, active } = body;
  if (!Number.isSafeInteger(maxTotalUses) || maxTotalUses <= 0) {
    errors.maxTotalUses = "Enter a positive whole number of uses.";
  }
  if (!Array.isArray(eligiblePlans) || eligiblePlans.length === 0 || eligiblePlans.length > paidPlans.size ||
      eligiblePlans.some(plan => !paidPlans.has(plan)) || new Set(eligiblePlans).size !== eligiblePlans.length) {
    errors.eligiblePlans = "Select one or more distinct eligible paid plans.";
  }
  if (typeof active !== "boolean") errors.active = "Specify whether the code is active.";
  return { terms, startsAt, expiresAt, maxTotalUses, eligiblePlans, active };
}

function invalidDetails(res, errors) {
  return res.status(400).json({ success: false, message: "Check the discount details.", errors });
}

export async function createAdminDiscountCode(req, res) {
  if (!req.is("application/json")) {
    return res.status(415).json({ success: false, message: "Send discount details as JSON." });
  }
  const body = req.body;
  if (!validBody(body, createFields)) {
    return res.status(400).json({ success: false, message: "Send only the discount creation fields." });
  }
  const errors = {};
  const rawCode = typeof body.code === "string" ? body.code.trim() : "";
  if (!codePattern.test(rawCode)) errors.code = "Use 1–64 letters, numbers, hyphens, or underscores.";
  const code = rawCode.toUpperCase();
  const configuration = validateConfiguration(body, errors);
  if (Object.keys(errors).length) {
    return invalidDetails(res, errors);
  }

  const details = { ...configuration, maxUsesPerUser: 1 };
  try {
    await DiscountCode.create({ _id: code, ...details, createdBy: req.user._id });
    return res.status(201).json({ success: true, discountCode: { code, ...details } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A discount code with that name already exists.",
        errors: { code: "Choose a unique discount code." },
      });
    }
    return res.status(503).json({
      success: false,
      message: "Discount code creation could not be confirmed. Check the code before retrying.",
    });
  }
}

export async function getAdminDiscountCode(req, res) {
  const code = normalizedCode(req.params.code);
  if (!code) return res.status(400).json({ success: false, message: "Invalid discount code." });
  try {
    const row = await DiscountCode.findById(code).select(`${configurationFields} revision`).lean();
    if (!row) return res.status(404).json({ success: false, message: "Discount code not found." });
    return res.json({ success: true, discountCode: editDto(row) });
  } catch {
    return res.status(503).json({ success: false, message: "Discount code details could not be loaded." });
  }
}

export async function updateAdminDiscountCode(req, res) {
  const code = normalizedCode(req.params.code);
  if (!code) return res.status(400).json({ success: false, message: "Invalid discount code." });
  if (!req.is("application/json")) {
    return res.status(415).json({ success: false, message: "Send discount details as JSON." });
  }
  const body = req.body;
  if (!validBody(body, updateFields)) {
    return res.status(400).json({ success: false, message: "Send only editable discount fields and the saved revision." });
  }
  const { revision } = body;
  if (!Number.isSafeInteger(revision) || revision < 0 || revision === Number.MAX_SAFE_INTEGER) {
    return res.status(400).json({ success: false, message: "A valid saved discount revision is required." });
  }
  const errors = {};
  const configuration = validateConfiguration(body, errors);
  if (Object.keys(errors).length) return invalidDetails(res, errors);

  const version = discountRevisionFilter(revision);
  try {
    const row = await DiscountCode.findOneAndUpdate({
      _id: code, ...version, $expr: { $lte: [discountCapacityUsed, configuration.maxTotalUses] },
    },
      { $set: configuration, $inc: { revision: 1 } }, { new: true, runValidators: true })
      .select(`${configurationFields} revision`).lean();
    if (row) return res.json({ success: true, discountCode: editDto(row) });
    const current = await DiscountCode.findById(code).select("revision heldUses successfulUses").lean();
    if (!current) {
      return res.status(404).json({ success: false, message: "Discount code not found." });
    }
    if ((current.revision ?? 0) === revision &&
        (current.heldUses ?? 0) + (current.successfulUses ?? 0) > configuration.maxTotalUses) {
      return invalidDetails(res, { maxTotalUses: "The cap must cover successful uses and active reservations." });
    }
    return res.status(409).json({ success: false, message: "This discount code changed. Load the saved version before editing again." });
  } catch {
    return res.status(503).json({ success: false, message: "The discount code update could not be confirmed." });
  }
}
