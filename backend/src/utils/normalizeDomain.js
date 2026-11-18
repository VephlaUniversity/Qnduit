const RESERVED_HOSTNAMES = new Set([
  "qnduit.com",
  "www.qnduit.com",
  "api.qnduit.com",
  "customers.qnduit.com",
]);

export function normalizeDomain(input) {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Enter a valid domain name.");
  }

  const raw = input.trim();

  // Accept a hostname only, not a URL or URL with a path/port.
  if (
    raw.includes("://") ||
    raw.includes("/") ||
    raw.includes("?") ||
    raw.includes("#") ||
    raw.includes("@") ||
    raw.includes(":")
  ) {
    throw new Error("Enter a domain name without https://, paths or ports.");
  }

  let hostname;

  try {
    hostname = new URL(`http://${raw}`).hostname
      .toLowerCase()
      .replace(/\.$/, "");
  } catch {
    throw new Error("Enter a valid domain name.");
  }

  if (
    !hostname ||
    hostname.length > 253 ||
    hostname === "localhost" ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ||
    hostname.includes("..")
  ) {
    throw new Error("This domain name is not valid.");
  }

  const labels = hostname.split(".");

  if (
    labels.length < 2 ||
    labels.some(
      label =>
        !label ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    )
  ) {
    throw new Error("Enter a valid public domain name.");
  }

  if (
    RESERVED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".qnduit.com")
  ) {
    throw new Error("This domain is reserved and cannot be connected.");
  }

  return hostname;
}