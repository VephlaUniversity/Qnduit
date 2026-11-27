import { getPortfolioPreview } from "../controllers/portfolio/appearance/portfolioPreviewController.js";
import { ingestPortfolioEvent, getPortfolioAnalytics } from "../controllers/portfolio/portfolioAnalyticsController.js";
import { getPublicTalentCv } from "../controllers/publicTalentCvController.js";
import { getPortfolioAppearance, putPortfolioAppearance } from "../controllers/portfolio/appearance/portfolioAppearanceController.js";
import { requirePaidCoverOwner, putPortfolioCover, deletePortfolioCover } from "../controllers/portfolio/appearance/portfolioCoverController.js";
import { portfolioCoverUpload } from "../middleware/portfolioCoverUpload.js";
import express from "express";
import {
  registerTalent,
  recoverTalentPortfolioUsername,
  verifyTalentEmail,
  updateTalentProfile,
  selectTalentPlan,
  getTalentDashboard,
  getTalentProfile,
  getPublicTalentProfile,
  listPublicTalents,
  upload,
  talentUpload,
  searchTalentByEmail,
  uploadResume
} from "../controllers/talentController.js";
import {
  getPortfolioEngagement,
  updatePortfolioEngagement,
  getTalentEnquiries,
  updateTalentEnquiryStatus,
  submitPublicTalentEnquiry,
} from "../controllers/talentPortfolioEngagementController.js";
import {
  getTalentPortfolioVersions,
  getPortfolioVersionProjects,
  createTalentPortfolioVersion,
  updateTalentPortfolioVersion,
  publishTalentPortfolioVersion,
  unpublishTalentPortfolioVersion,
  deleteTalentPortfolioVersion,
  getPublicTalentPortfolioVersion,
} from "../controllers/talentPortfolioVersionController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/portfolio-appearance/preview", protect, authorize("talent"), getPortfolioPreview);
router.get("/portfolio-appearance", protect, authorize("talent"), getPortfolioAppearance);
router.put("/portfolio-appearance", protect, authorize("talent"), putPortfolioAppearance);
router.put("/portfolio-appearance/cover", protect, authorize("talent"), requirePaidCoverOwner, portfolioCoverUpload, putPortfolioCover);
router.delete("/portfolio-appearance/cover", protect, authorize("talent"), requirePaidCoverOwner, deletePortfolioCover);

router.get("/portfolio-analytics", protect, authorize("talent"), getPortfolioAnalytics);
router.post("/public/:username/events", express.json({ limit: "2kb" }), ingestPortfolioEvent);

router.post("/register", registerTalent);

router.post("/verify", verifyTalentEmail);

router.post(
  "/portfolio-username",
  protect,
  authorize("talent"),
  recoverTalentPortfolioUsername,
);

router.post(
  "/resume",
  protect,
  authorize("talent"),
  upload.single("resume"),
  uploadResume
);

router.put(
  "/:id/profile",
  protect,
  authorize("talent"),
  updateTalentProfile
);

router.put("/:id/plan", protect, authorize("talent"), selectTalentPlan);

router.put(
  "/update",
  protect,
  authorize("talent"),
  talentUpload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "introVideo", maxCount: 1 }
  ]),
  updateTalentProfile
);

router.get("/profile", protect, getTalentProfile);

router.get("/:id/dashboard", protect, authorize("talent"), getTalentDashboard);

router.get(
  "/search-by-email",
  protect,
  authorize("employer"),
  searchTalentByEmail
);

router.get("/public", listPublicTalents);

router.get("/public/:username/cvs/:cvId", getPublicTalentCv);
router.get("/public/:username/cvs/:cvId/file", getPublicTalentCv);
router.get("/public/:username", getPublicTalentProfile);

// Paid Talent portfolio engagement settings
router.get(
  "/portfolio-engagement",
  protect,
  authorize("talent"),
  getPortfolioEngagement
);

router.put(
  "/portfolio-engagement",
  protect,
  authorize("talent"),
  updatePortfolioEngagement
);

// Paid Talent enquiry inbox
router.get(
  "/portfolio-enquiries",
  protect,
  authorize("talent"),
  getTalentEnquiries
);

router.patch(
  "/portfolio-enquiries/:id",
  protect,
  authorize("talent"),
  updateTalentEnquiryStatus
);

// Public portfolio contact form
router.post(
  "/public/:username/enquiries",
  submitPublicTalentEnquiry
);

// Paid Targeted Portfolio Versions

router.get(
  "/portfolio-versions",
  protect,
  authorize("talent"),
  getTalentPortfolioVersions
);

router.get(
  "/portfolio-versions/projects",
  protect,
  authorize("talent"),
  getPortfolioVersionProjects
);

router.post(
  "/portfolio-versions",
  protect,
  authorize("talent"),
  createTalentPortfolioVersion
);

router.patch(
  "/portfolio-versions/:id",
  protect,
  authorize("talent"),
  updateTalentPortfolioVersion
);

router.post(
  "/portfolio-versions/:id/publish",
  protect,
  authorize("talent"),
  publishTalentPortfolioVersion
);

router.post(
  "/portfolio-versions/:id/unpublish",
  protect,
  authorize("talent"),
  unpublishTalentPortfolioVersion
);

router.delete(
  "/portfolio-versions/:id",
  protect,
  authorize("talent"),
  deleteTalentPortfolioVersion
);

router.get(
  "/public/:username/portfolio-versions/:slug",
  getPublicTalentPortfolioVersion
);

export default router;
