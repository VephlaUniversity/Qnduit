import express from "express";
import {
  registerEmployer,
  verifyEmployerEmail,
  updateEmployerProfile,
  selectEmployerPlan,
  getEmployerDashboard,
  upload,
} from "../controllers/employerController.js";

const router = express.Router();
// signup
router.post("/signup", registerEmployer);

// verify  
router.post("/verify", verifyEmployerEmail);

// profile
router.put(
  "/profile/update/:id",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  updateEmployerProfile
);

// plans
router.post("/plan/:id", selectEmployerPlan);

// dashboard
router.get("/dashboard/:id", getEmployerDashboard);

export default router;
