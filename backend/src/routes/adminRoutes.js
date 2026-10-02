import express from "express";

import {
  getAdminDashboard,

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
} from "../controllers/adminController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));


router.get(
  "/dashboard",
  getAdminDashboard
);

router.get(
  "/talents",
  getAdminTalents
);

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

export default router;