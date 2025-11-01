import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken.js";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    let user = await Talent.findOne({ email });
    let userType = "talent";

    if (!user) {
      user = await Employer.findOne({ email });
      userType = "employer";
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType, 
      },
    });
  } catch (error) {
    next(error);
  }
};
