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
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(morgan("dev"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/talents", talentRoutes);
app.use("/api/employers", employerRoutes);
app.use("/api/job", jobRoutes);

// Error Handler
app.use(errorHandler);

export default app;
