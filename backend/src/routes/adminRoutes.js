import { requireEmployerJobSource } from "../middleware/requireEmployerJobSource.js";
import express from "express";
import { previewDowngrade, requestDowngrade } from "../controllers/subscriptionDowngradeController.js";
import { previewAdminEmployerPlanRequest, submitAdminEmployerPlanRequest } from "../controllers/adminEmployerPlanRequestController.js";
import { previewCancellation, cancelActiveSubscription } from "../controllers/subscriptionCancellationController.js";
import { previewInvoice, emailInvoice } from "../controllers/subscriptionInvoiceController.js";

import {
  getAdminDashboard,
  getAdminTalentProfile,
  getAdminEmployerProfile,

  getAdminTalents,
  updateTalentStatus,
  updateTalentVerification,
  deleteTalent,

  getAdminEmployers,
  updateEmployerStatus,
  updateEmployerVerification,
  deleteEmployer,

  getAdminJobs,
  getAdminJob,
  toggleJobFlag,
  deleteAdminJob,


  getAdminSubscriptionStats,
  getAdminSubscriptions,
  getAdminSubscription,
} from "../controllers/adminController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Include authorization/validation failures in the detail cache policy too.
router.use((req, res, next) => {
  if (/^\/subscriptions\/[^/]+\/[^/]+\/(invoice-email|cancel|downgrade|plan-request)\/?$/i.test(req.path)) res.set("Cache-Control", "private, no-store");
  if (req.method === "GET" && /^\/(talents|employers)\/[^/]+\/?$/i.test(req.path)) res.set("Cache-Control", "private, no-store");
  next();
});

router.use(protect);
router.use(authorize("admin"));
router.use("/jobs", requireEmployerJobSource);
router.get("/subscriptions/employer/:accountId/plan-request", previewAdminEmployerPlanRequest);
router.post("/subscriptions/employer/:accountId/plan-request", submitAdminEmployerPlanRequest);

router.get("/subscriptions/:role/:accountId/downgrade", previewDowngrade);
router.post("/subscriptions/:role/:accountId/downgrade", requestDowngrade);
router.get("/subscriptions/:role/:accountId/cancel", previewCancellation);
router.post("/subscriptions/:role/:accountId/cancel", cancelActiveSubscription);
router.get("/subscriptions/:role/:accountId/invoice-email", previewInvoice);
router.post("/subscriptions/:role/:accountId/invoice-email", emailInvoice);


router.get(
  "/dashboard",
  getAdminDashboard
);

router.get(
  "/talents",
  getAdminTalents
);
router.get("/talents/:id", getAdminTalentProfile);

router.patch(
  "/talents/:id/status",
  updateTalentStatus
);

router.patch(
  "/talents/:id/verification",
  updateTalentVerification
);

router.delete(
  "/talents/:id",
  deleteTalent
);

router.get(
  "/employers",
  getAdminEmployers
);
router.get("/employers/:id", getAdminEmployerProfile);

router.patch(
  "/employers/:id/status",
  updateEmployerStatus
);

router.patch(
  "/employers/:id/verification",
  updateEmployerVerification
);

router.delete(
  "/employers/:id",
  deleteEmployer
);

router.get(
  "/jobs",
  getAdminJobs
);

router.get(
  "/jobs/:id",
  getAdminJob
);

router.patch(
  "/jobs/:id/flag",
  toggleJobFlag
);

router.delete(
  "/jobs/:id",
  deleteAdminJob
);


router.get(
  "/subscriptions/stats",
  getAdminSubscriptionStats
);

router.get(
  "/subscriptions",
  getAdminSubscriptions
);

router.get(
  "/subscriptions/:type/:id",
  getAdminSubscription
);

export default router;
