import express from "express";

import {
  createCheckoutSession,
  getMySubscription,
  talentFlutterwaveCallback,

  createEmployerCheckoutSession,
  employerFlutterwaveCallback,
  getEmployerSubscription,
  employerPayLater
} from "../controllers/paymentController.js";
import {
  previewOwnCancellation,
  confirmOwnCancellation,
} from "../controllers/userSubscriptionCancellationController.js";

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

router.get(
  "/callback",
  talentFlutterwaveCallback
);

// Employers Routes

router.post(
  "/employer/create-checkout",
  protect,
  createEmployerCheckoutSession
);

router.get(
  "/employer/payment/callback",
  employerFlutterwaveCallback
);

router.get(
  "/employer/subscription",
  protect,
  getEmployerSubscription
);

router.post(
  "/employer/pay-later",
  protect,
  employerPayLater
);

// All User Routes

router.get(
  "/cancellation/preview",
  protect,
  previewOwnCancellation,
);

router.post(
  "/cancellation",
  protect,
  confirmOwnCancellation,
);

export default router;