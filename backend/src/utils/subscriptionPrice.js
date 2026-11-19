// The supported paid catalogs and provider plans are denominated in USD.
export function usdMinorUnits(amount) {
  const parts = (typeof amount === "number" || typeof amount === "string")
    ? String(amount).match(/^(\d+)(?:\.(\d{1,2}))?$/) : null;
  if (!parts) return null;
  const minor = Number(parts[1] + (parts[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}
