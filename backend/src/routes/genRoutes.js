// routes/authRoutes.js

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  changePassword,
  deleteAccount,
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

export default router;
