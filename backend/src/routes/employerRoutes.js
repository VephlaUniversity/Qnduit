import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  registerEmployer,
  verifyEmployerEmail,
  updateEmployerProfile,
  selectEmployerPlan,
  getEmployerProfile,
  upload,
  addSavedCandidate,
  getSavedCandidates,
  removeSavedCandidate
} from "../controllers/employerController.js";
import {
  createEmployerCheckoutSession,
  getEmployerSubscription,
  cancelEmployerSubscription,
  resumeEmployerSubscription
} from "../controllers/paymentController.js";

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

router.post(
  "/pay",
  protect,
  authorize("employer"),
  createEmployerCheckoutSession
);

router.get(
  "/subscription",
  protect,
  authorize("employer"),
  getEmployerSubscription
);

router.post(
  "/subscription/cancel",
  protect,
  authorize("employer"),
  cancelEmployerSubscription
);

router.post(
  "/subscription/resume",
  protect,
  authorize("employer"),
  resumeEmployerSubscription
);

router.post("/saved-candidates/:id", protect, authorize("employer"), addSavedCandidate);
router.get("/saved-candidates", protect, authorize("employer"), getSavedCandidates);
router.delete("/saved-candidates/:id", protect, authorize("employer"), removeSavedCandidate);

export default router;
