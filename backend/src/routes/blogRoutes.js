import express from "express";
import { blogController } from "../controllers/blogController.js";

const router = express.Router();
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/", blogController.listPublic);
router.get("/:id", blogController.detail);
export default router;
