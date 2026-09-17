import express from "express";

import {
  createCheckoutSession,
  getMySubscription,
  cancelSubscription,
  resumeSubscription,
  createEmployerCheckoutSession,
  getEmployerSubscription,
  cancelEmployerSubscription,
  resumeEmployerSubscription,
  employerPayLater
} from "../controllers/paymentController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Talent Routes
router.post(
  "/create-checkout",
  protect,
  createCheckoutSession
);

router.get(
  "/subscription",
  protect,
  getMySubscription
);

router.post(
  "/subscription/cancel",
  protect,
  cancelSubscription
);

router.post(
  "/subscription/resume",
  protect,
  resumeSubscription
);

// Employers Routes

router.post(
  "/employer/create-checkout",
  protect,
  createEmployerCheckoutSession
);

router.get(
  "/employer/subscription",
  protect,
  getEmployerSubscription
);

router.post(
  "/employer/subscription/cancel",
  protect,
  cancelEmployerSubscription
);

router.post(
  "/employer/subscription/resume",
  protect,
  resumeEmployerSubscription
);

router.post(
  "/employer/pay-later",
  protect,
  employerPayLater
);

export default router;