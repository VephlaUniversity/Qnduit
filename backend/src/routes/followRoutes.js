import express from "express";
import {
  searchEmployers,
  getFollowingEmployers,
  followEmployer,
  unfollowEmployer,
  getFollowStatus,
  getEmployerFollowers,
  getEmployerFollowingTalents,
  followTalent,
  unfollowTalent,
} from "../controllers/followController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Talent follows employers
router.get(
  "/employers/search",
  protect,
  authorize("talent"),
  searchEmployers
);

router.get(
  "/employers/following",
  protect,
  authorize("talent"),
  getFollowingEmployers
);

router.post(
  "/employers/:employerId",
  protect,
  authorize("talent"),
  followEmployer
);

router.delete(
  "/employers/:employerId",
  protect,
  authorize("talent"),
  unfollowEmployer
);

router.get(
  "/status/:employerId",
  protect,
  authorize("talent"),
  getFollowStatus
);

// Employers follow talents
router.get(
  "/talents/followers",
  protect,
  authorize("employer"),
  getEmployerFollowers
);

router.get(
  "/talents/following",
  protect,
  authorize("employer"),
  getEmployerFollowingTalents
);

router.post(
  "/talents/:talentId",
  protect,
  authorize("employer"),
  followTalent
);

router.delete(
  "/talents/:talentId",
  protect,
  authorize("employer"),
  unfollowTalent
);

export default router;