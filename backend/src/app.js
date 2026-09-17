import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import talentRoutes from "./routes/talentRoutes.js";
import employerRoutes from "./routes/employerRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import jobApplicationRoutes from "./routes/jobApplicationRoutes.js";
import savedJobRoutes from "./routes/savedJobRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { handleStripeWebhook } from "./controllers/talentStripeWebhookController.js";
import { handleEmployerStripeWebhook } from "./controllers/employerStripeWebhookController.js"
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();
connectDB();

const app = express();

// Webhook Routes
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.post(
  "/api/payments/employer/webhook",
  express.raw({ type: "application/json" }),
  handleEmployerStripeWebhook
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "https://qnduit.com",
      "https://www.qnduit.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(helmet());
app.use(morgan("dev"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/talents", talentRoutes);
app.use("/api/employers", employerRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/applications", jobApplicationRoutes);
app.use("/api/saved-jobs", savedJobRoutes);
app.use("/api/payments", paymentRoutes);

// Error Handler
app.use(errorHandler);

export default app;
