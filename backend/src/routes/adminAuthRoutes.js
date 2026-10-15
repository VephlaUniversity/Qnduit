import express from "express";
import { adminLogin} from "../controllers/adminAuthController.js";
import { updateTalentVerification, updateEmployerVerification } from "../controllers/adminController.js";


const router = express.Router();

router.post("/login", adminLogin);
router.patch("/talents/:id/verification", updateTalentVerification);
router.patch("/employers/:id/verification", updateEmployerVerification);

export default router;