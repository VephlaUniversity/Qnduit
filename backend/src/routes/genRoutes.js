// routes/authRoutes.js

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  changePassword,
  deleteAccount,
  searchUsers,
  getPublicStats
} from "../controllers/genController.js";

const router = express.Router();

router.put(
  "/change-password",
  protect,
  changePassword
);

router.delete(
  "/delete-account",
  protect,
  deleteAccount
);

router.get("/search", protect, searchUsers);

// Public: registered member counts for the landing page (no auth, counts only)
router.get("/stats", getPublicStats);

export default router;
