import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

const generateToken = (id, role) => {
  return jwt.sign({ id, ...(role ? { role } : {}) }, process.env.JWT_SECRET, {
    expiresIn: "30d",
    // Same-second re-logins must not reuse the old session's identity.
    jwtid: randomUUID(),
  });
};

export default generateToken;
