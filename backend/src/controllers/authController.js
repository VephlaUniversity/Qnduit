import { authIdentity } from "../utils/authSession.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken.js";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    let user = await Talent.findOne({ email });
    let userType = "talent";

    if (!user) {
      user = await Employer.findOne({ email });
      userType = "employer";
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    const token = generateToken(user._id, userType);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: authIdentity(user, userType),
    });
  } catch (error) {
    next(error);
  }
};
