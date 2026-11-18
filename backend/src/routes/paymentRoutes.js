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

import { protect, authorize } from "../middleware/authMiddleware.js";
import { getOwnPlanRequests, submitOwnPlanRequest } from "../controllers/employerPlanRequestController.js";
import { getCheckoutPrice, quoteDiscount } from "../controllers/discountQuoteController.js";
import { reserveDiscount } from "../controllers/discountReservationController.js";
import { activateZeroDiscountCheckout, createDiscountCheckout, getDiscountCheckout } from "../controllers/discountCheckoutController.js";

import { releaseDiscount } from "../controllers/discountReleaseController.js";

const router = express.Router();
const discountAccess = [
  (req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); },
  protect, authorize("talent", "employer"),
];
router.get("/checkout-price", ...discountAccess, getCheckoutPrice);
router.post("/discount-quote", ...discountAccess, quoteDiscount);
router.post("/discount-reservation", ...discountAccess, reserveDiscount);
router.post("/discount-reservation/release", ...discountAccess, releaseDiscount);
router.get("/discount-checkout", ...discountAccess, getDiscountCheckout);
router.post("/discount-checkout", ...discountAccess, createDiscountCheckout);
router.post("/discount-checkout/activate-zero", ...discountAccess, activateZeroDiscountCheckout);
router.get("/employer/plan-requests", protect, getOwnPlanRequests);
router.post("/employer/plan-requests", protect, submitOwnPlanRequest);

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
