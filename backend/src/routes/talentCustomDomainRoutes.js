import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";

import {
  getMyCustomDomain,
  connectCustomDomain,
  verifyCustomDomain,
  disconnectCustomDomain,
  getPublicTalentByDomain,
  getPublicTalentCvByDomain,
} from "../controllers/talentCustomDomainController.js";

const router = express.Router();

// Public custom-domain portfolio endpoints.
router.get("/public-domain", getPublicTalentByDomain);
router.get("/public-domain/cvs/:cvId", getPublicTalentCvByDomain);

// Authenticated talent domain-management endpoints.
router.use(protect, authorize("talent"));

router.get("/", getMyCustomDomain);
router.post("/", connectCustomDomain);
router.post("/verify", verifyCustomDomain);
router.delete("/", disconnectCustomDomain);

export default router;