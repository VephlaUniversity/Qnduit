import { allowsSuspendedAccess } from "../config/accountAccess.js";
import jwt from "jsonwebtoken";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";
import Admin from "../models/Admin.js";

// The promise belongs only to this request. Token/account changes on subsequent
// requests always require fresh verification and a fresh account lookup.
const authentication = Symbol("verifiedAuthentication");
const failure = (status, message, code) => Object.assign(new Error(message), { status, ...(code ? { code } : {}) });

export function resolveAuthentication(req) {
  if (!req[authentication]) req[authentication] = authenticate(req);
  return req[authentication];
}

async function authenticate(req) {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer")) {
    throw failure(401, "No token provided");
  }
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const models = { talent: Talent, employer: Employer, admin: Admin };
    let role = decoded.role || null;
    let user;
    if (Object.hasOwn(models, role)) {
      user = await models[role].findById(decoded.id).select("-password");
      if (!user) throw failure(401, `${role === "talent" ? "Talent" : role === "employer" ? "Employer" : "Admin"} not found`, "AUTH_ACCOUNT_MISSING");
    } else {
      // Preserve existing role-less talent/employer token compatibility.
      for (const candidate of ["talent", "employer", "admin"]) {
        user = await models[candidate].findById(decoded.id).select("-password");
        if (user) { role = candidate; break; }
      }
    }
    if (!user) throw failure(401, "User not found", "AUTH_ACCOUNT_MISSING");
    if (role === "admin" && !user.isActive) throw failure(403, "Admin account is inactive");
    if (["talent", "employer"].includes(role) && user.accountStatus === "suspended" && !allowsSuspendedAccess(req.method, `${req.baseUrl || ""}${req.path || ""}`)) {
      throw Object.assign(failure(403, "Your account has been suspended"), { code: "ACCOUNT_SUSPENDED" });
    }
    user.role = role;
    return { user, role };
  } catch (error) {
    if (error.status) throw error;
    if (error.name === "TokenExpiredError") throw failure(401, "Your session has expired. Please sign in again.", "AUTH_SESSION_EXPIRED");
    if (["JsonWebTokenError", "NotBeforeError"].includes(error.name)) throw failure(401, "Not authorized, token failed", "AUTH_TOKEN_INVALID");
    // Database/service failures do not establish an invalid session.
    throw failure(503, "Authentication could not be checked. Please try again.");
  }
}

export const protect = async (req, res, next) => {
  try {
    req.user = (await resolveAuthentication(req)).user;
    next();
  } catch (error) {
    return res.status(error.status || 401).json({ success: false, message: error.message, ...(error.code ? { code: error.code } : {}) });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "You are not allowed to access this resource" });
  }
  next();
};
