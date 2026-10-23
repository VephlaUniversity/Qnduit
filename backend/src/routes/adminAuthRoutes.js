import express from "express";
import { adminLogin} from "../controllers/adminAuthController.js";
import { updateTalentVerification, updateEmployerVerification } from "../controllers/adminController.js";


import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", adminLogin);
// Retain compatibility URLs with the same mandatory admin authorization.
router.use(protect, authorize("admin"));
router.patch("/talents/:id/verification", updateTalentVerification);
router.patch("/employers/:id/verification", updateEmployerVerification);

export default router;