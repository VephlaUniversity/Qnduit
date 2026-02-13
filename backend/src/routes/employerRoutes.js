import express from "express";
import {
  registerEmployer,
  verifyEmployerEmail,
  updateEmployerProfile,
  selectEmployerPlan,
  getEmployerDashboard,
} from "../controllers/employerController.js";

const router = express.Router();

router.post("/signup", registerEmployer);
router.post("/verify", verifyEmployerEmail);
router.put("/update/:id", updateEmployerProfile);
router.post("/plan/:id", selectEmployerPlan);
router.get("/dashboard/:id", getEmployerDashboard);

export default router;
