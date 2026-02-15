import jwt from "jsonwebtoken";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";

export const protect = async (req, res, next) => {

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {

    try {

      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // check Talent first
      let user = await Talent.findById(decoded.id).select("-password");
      let role = "talent";

      // if not talent, check employer
      if (!user) {
        user = await Employer.findById(decoded.id).select("-password");
        role = "employer";
      }

      if (!user) {
        return res.status(401).json({
          success:false,
          message:"User not found"
        });
      }

      req.user = user;
      req.user.role = role;

      next();

    } catch (error) {
      return res.status(401).json({
        success:false,
        message:"Not authorized, token failed"
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success:false,
      message:"No token provided"
    });
  }
};


export const authorize = (...roles) => {

  return (req, res, next) => {

    if (!req.user || !roles.includes(req.user.role)) {

      return res.status(403).json({
        success:false,
        message:"You are not allowed to access this resource"
      });

    }

    next();
  };
};
