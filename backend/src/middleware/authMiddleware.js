import jwt from "jsonwebtoken";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";
import Admin from "../models/Admin.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user = null;
      let role = decoded.role || null;

      // ADMIN 
      if (role === "admin") {
        user = await Admin.findById(decoded.id).select("-password");

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "Admin not found",
          });
        }

        if (!user.isActive) {
          return res.status(403).json({
            success: false,
            message: "Admin account is inactive",
          });
        }
      }

      // TALENT 
      else if (role === "talent") {
        user = await Talent.findById(decoded.id).select("-password");

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "Talent not found",
          });
        }
      }

      // EMPLOYER
      else if (role === "employer") {
        user = await Employer.findById(decoded.id).select("-password");

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "Employer not found",
          });
        }
      }

      else {
        user = await Talent.findById(decoded.id).select("-password");

        if (user) {
          role = "talent";
        }

        if (!user) {
          user = await Employer.findById(decoded.id).select("-password");

          if (user) {
            role = "employer";
          }
        }

        if (!user) {
          user = await Admin.findById(decoded.id).select("-password");

          if (user) {
            role = "admin";
          }
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      if (
        (role === "talent" || role === "employer") &&
        user.accountStatus === "suspended"
      ) {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended",
        });
      }

      req.user = user;
      req.user.role = role;

      next();
    } catch (error) {
      console.error("Auth middleware error:", error);

      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this resource",
      });
    }

    next();
  };
};