const BASIS_POINTS_PER_WHOLE = 10_000;
const CURRENCY_CODE = /^[A-Z]{3}$/;

export function calculateDiscount(originalMinor, currency, terms) {
  if (!Number.isSafeInteger(originalMinor) || originalMinor < 0) {
    throw new RangeError("Original price must be a non-negative safe integer in minor units.");
  }
  if (typeof currency !== "string" || currency.length !== 3 || !CURRENCY_CODE.test(currency)) {
    throw new TypeError("Currency must be a three-letter uppercase code.");
  }
  if (!terms || typeof terms !== "object" || Array.isArray(terms)) {
    throw new TypeError("Discount terms must be an object.");
  }

  let discountMinor;
  switch (terms.type) {
    case "percentage": {
      const { basisPoints } = terms;
      if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > BASIS_POINTS_PER_WHOLE) {
        throw new RangeError("Percentage must be an integer from 0 to 10000 basis points.");
      }
      const denominator = BigInt(BASIS_POINTS_PER_WHOLE);
      // The product can exceed Number.MAX_SAFE_INTEGER even though the result
      // cannot exceed the original price. Round half-up before converting back.
      const numerator = BigInt(originalMinor) * BigInt(basisPoints);
      discountMinor = Number((numerator + denominator / 2n) / denominator);
      break;
    }
    case "fixed":
      if (!Number.isSafeInteger(terms.amountMinor) || terms.amountMinor < 0) {
        throw new RangeError("Fixed discount must be a non-negative safe integer in minor units.");
      }
      if (terms.currency !== currency) {
        throw new TypeError("Fixed discount currency must match the original price currency.");
      }
      discountMinor = Math.min(originalMinor, terms.amountMinor);
      break;
    default:
      throw new TypeError("Discount type must be percentage or fixed.");
  }

  return {
    originalMinor: originalMinor + 0,
    discountMinor: discountMinor + 0,
    payableMinor: originalMinor - discountMinor + 0,
  };
}
