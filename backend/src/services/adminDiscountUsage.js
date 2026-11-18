import DiscountCode from "../models/DiscountCode.js";
import { DiscountCheckoutAttempt } from "../models/DiscountCheckoutAttempt.js";

export const usageFields = "successfulUses heldUses";
const counter = field => ({ $ifNull: [`$${field}`, 0] });
const validCount = value => ({
  $cond: [{ $isNumber: value }, {
    $and: [{ $gte: [value, 0] }, { $lte: [value, Number.MAX_SAFE_INTEGER] }, { $eq: [value, { $trunc: value }] }],
  }, false],
});
const capped = { $ne: [{ $ifNull: ["$maxTotalUses", null] }, null] };

function discountUsage(row, discountValue) {
  const { maxTotalUses } = row;
  const successfulUses = row.successfulUses ?? 0;
  const heldUses = row.heldUses ?? 0;
  const uncapped = maxTotalUses == null;
  const valid = [successfulUses, heldUses].every(value => Number.isSafeInteger(value) && value >= 0);
  const occupied = successfulUses + heldUses;
  const inconsistent = !valid || !Number.isSafeInteger(occupied) ||
    (!uncapped && (!Number.isSafeInteger(maxTotalUses) || maxTotalUses < occupied));
  return {
    successfulUses: valid ? successfulUses : null,
    heldCapacity: valid ? heldUses : null,
    discountValue,
    remainingCapacity: inconsistent || uncapped ? null : maxTotalUses - occupied,
    uncapped,
    inconsistent,
  };
}

export async function readAdminDiscountUsage(rows, session) {
  const [counts] = await DiscountCode.aggregate([
    { $project: { active: 1, capped, cap: "$maxTotalUses", successful: counter("successfulUses"), held: counter("heldUses") } },
    { $set: {
      valid: { $and: [validCount("$successful"), validCount("$held")] },
      occupied: { $add: [
        { $cond: [validCount("$successful"), "$successful", 0] },
        { $cond: [validCount("$held"), "$held", 0] },
      ] },
    } },
    { $set: { consistent: { $and: [
      "$valid", validCount("$occupied"),
      { $or: [{ $not: ["$capped"] }, { $and: [validCount("$cap"), { $gte: ["$cap", "$occupied"] }] }] },
    ] } } },
    { $group: {
      _id: null, totalCodes: { $sum: 1 },
      activeCodes: { $sum: { $cond: [{ $eq: ["$active", true] }, 1, 0] } },
      uncappedCodes: { $sum: { $cond: ["$capped", 0, 1] } },
      successfulUses: { $sum: { $cond: ["$valid", "$successful", 0] } },
      heldCapacity: { $sum: { $cond: ["$valid", "$held", 0] } },
      cappedRemainingCapacity: { $sum: { $cond: [
        { $and: ["$capped", "$consistent"] }, { $subtract: ["$cap", "$occupied"] }, 0,
      ] } },
      inconsistentCodes: { $sum: { $cond: ["$consistent", 0, 1] } },
      invalidCounters: { $sum: { $cond: ["$valid", 0, 1] } },
    } },
  ]).session(session);
  const codeIds = rows.map(row => row._id);
  const [values] = await DiscountCheckoutAttempt.aggregate([
    { $match: { status: "redeemed" } },
    { $project: { code: 1, currency: 1, minor: { $toDecimal: { $toLong: "$discountMinor" } } } },
    { $facet: {
      all: [{ $group: { _id: "$currency", minor: { $sum: "$minor" } } }],
      page: [
        { $match: { code: { $in: codeIds } } },
        { $group: { _id: { code: "$code", currency: "$currency" }, minor: { $sum: "$minor" } } },
      ],
    } },
  ]).session(session);
  const entries = values?.page ?? [];
  const money = (currency, amount) => ({ currency, amountMinor: amount.toString() });
  // Decimal128 string conversion avoids rounding large currency totals in JavaScript.
  const amounts = (groups, currency) => groups.map(row => money(currency(row), row.minor)).sort((a, b) => a.currency.localeCompare(b.currency));
  const safeTotal = value => Number.isSafeInteger(value ?? 0) ? value ?? 0 : null;
  return {
    overview: {
      totalCodes: counts?.totalCodes ?? 0,
      activeCodes: counts?.activeCodes ?? 0,
      inactiveCodes: (counts?.totalCodes ?? 0) - (counts?.activeCodes ?? 0),
      uncappedCodes: counts?.uncappedCodes ?? 0,
      successfulUses: counts?.invalidCounters ? null : safeTotal(counts?.successfulUses),
      heldCapacity: counts?.invalidCounters ? null : safeTotal(counts?.heldCapacity),
      cappedRemainingCapacity: counts?.inconsistentCodes ? null : safeTotal(counts?.cappedRemainingCapacity),
      inconsistentCodes: counts?.inconsistentCodes ?? 0,
      discountValue: amounts(values?.all ?? [], row => row._id),
    },
    usageByCode: rows.map(row => discountUsage(row, amounts(entries.filter(entry => entry._id.code === row._id), entry => entry._id.currency))),
  };
}
