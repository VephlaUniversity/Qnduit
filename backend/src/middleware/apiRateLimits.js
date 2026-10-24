import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { resolveAuthentication } from "./authMiddleware.js";
import { pollingRoles, POLLING_BUDGETS } from "../config/pollingPolicy.js";

// Separate stores per scope/window. Default stores are per-process memory;
// multi-instance deployment requires shared atomic stores with unique prefixes.
export function createApiRateLimits({ authenticate = resolveAuthentication, storeFactory } = {}) {
  const make = (policy) => rateLimit({
    windowMs: policy.windowMs,
    limit: policy.limit,
    standardHeaders: true,
    legacyHeaders: false,
    ...(storeFactory ? { store: storeFactory(policy) } : {}),
    keyGenerator: policy.scope === "poll-account"
      ? req => `${req.user.role}:${req.user._id}`
      : req => ipKeyGenerator(req.ip),
    handler(req, res) {
      res.set("RateLimit-Scope", policy.scope);
      return res.status(429).json({
        success: false, code: "RATE_LIMITED", scope: policy.scope,
        windowMs: policy.windowMs, limit: policy.limit,
        message: policy.scope === "general-ip"
          ? "Too many requests. Please try again later."
          : "Too many polling requests. Please wait before refreshing.",
      });
    },
  });
  const general = make({ scope: "general-ip", windowMs: 900_000, limit: 100 });
  const ip = POLLING_BUDGETS.filter(policy => policy.scope === "poll-ip").map(make);
  const account = POLLING_BUDGETS.filter(policy => policy.scope === "poll-account").map(make);
  const run = (stack, req, res, done) => {
    const step = index => error => {
      if (error) return done(error);
      if (index === stack.length) return done();
      return stack[index](req, res, step(index + 1));
    };
    return step(0)();
  };
  return (req, res, next) => {
    const roles = pollingRoles(req.method, `${req.baseUrl}${req.path}`);
    if (!roles) return general(req, res, next);
    // Bound all polling ingress before JWT/account work, including invalid tokens.
    return run(ip, req, res, async error => {
      if (error) return next(error);
      try {
        const identity = await authenticate(req);
        if (!roles.includes(identity.role)) {
          throw Object.assign(new Error("You are not allowed to access this resource"), { status: 403 });
        }
        req.user = identity.user;
      } catch (authError) {
        // Failed identities never acquire an account budget or reach controllers.
        return general(req, res, () => res.status(authError.status || 401).json({
          success: false, message: authError.message,
          ...(authError.code ? { code: authError.code } : {}),
        }));
      }
      return run(account, req, res, next);
    });
  };
}
