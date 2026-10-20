// Resets on restart and is per server instance; swap for a shared store if you scale out.
export const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map();

  return (req, res, next) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") ||
      req.ip ||
      "unknown";
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((time) => now - time < windowMs);

    if (recent.length >= max) {
      return res.status(429).json({ success: false, message });
    }

    recent.push(now);
    hits.set(ip, recent);

    if (hits.size > 5000) {
      for (const [key, times] of hits) {
        if (!times.some((time) => now - time < windowMs)) hits.delete(key);
      }
    }
    next();
  };
};
