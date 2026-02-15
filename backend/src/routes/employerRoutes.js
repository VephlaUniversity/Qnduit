import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  registerEmployer,
  verifyEmployerEmail,
  updateEmployerProfile,
  // selectEmployerPlan,
  getEmployerProfile,
  upload,
} from "../controllers/employerController.js";

const router = express.Router();
// signup
router.post("/signup", registerEmployer);

// verify  
router.post("/verify", verifyEmployerEmail);

// profile
router.put(
  "/update",
  protect,
  authorize("employer"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  updateEmployerProfile
);

// plans
//router.post("/plan/:id", selectEmployerPlan);

// dashboard
router.get(
  "/profile", 
  protect,
  authorize("employer"),
  getEmployerProfile
);

export default router;
