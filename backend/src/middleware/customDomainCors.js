import TalentCustomDomain from "../models/TalentCustomDomain.js";

const cache = new Map();
const MAX_CACHE_ENTRIES = 5000;
const POSITIVE_TTL = 15_000;
const NEGATIVE_TTL = 5_000;

const allowedOrigins = new Set([
  "https://qnduit.com",
  "https://www.qnduit.com",
]);

function cacheResult(key, allowed) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, {
    allowed,
    expiresAt: Date.now() + (
      allowed ? POSITIVE_TTL : NEGATIVE_TTL
    ),
  });
}

export async function isAllowedCustomDomainOrigin(origin) {
  let parsed;

  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    return false;
  }

  const normalizedOrigin = parsed.origin.toLowerCase();

  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  const cached = cache.get(normalizedOrigin);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.allowed;
  }

  const hostname = parsed.hostname.toLowerCase();

  const domain = await TalentCustomDomain.exists({
    hostname,
    status: "active",
    isClaimed: true,
  });

  const allowed = Boolean(domain);

  cacheResult(normalizedOrigin, allowed);

  return allowed;
}

export function createCustomDomainCorsOrigin() {
  return (origin, callback) => {
    // Non-browser requests do not send Origin.
    if (!origin) {
      return callback(null, false);
    }

    isAllowedCustomDomainOrigin(origin)
      .then(allowed => callback(null, allowed ? origin : false))
      .catch(error => callback(error));
  };
}