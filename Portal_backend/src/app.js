import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import { pool } from "./config/db.js";
import { authRoutes } from "./routes/auth.routes.js";
import { studentRoutes } from "./routes/student.routes.js";
import { scribeRoutes } from "./routes/scribe.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { locationRoutes } from "./routes/location.routes.js";
import { startExamTimeoutCron } from "./cronjob/timeoutExam.js";

dotenv.config();

const app = express();

/* ===== MIDDLEWARE ===== */
app.use(
  cors({
    origin: "http://localhost:5173", // frontend
    credentials: true,              // allow cookies if needed
  })
);

app.use(express.json());
app.use(cookieParser());

/* ===== ROUTES ===== */
app.use("/api/locations", locationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/scribe", scribeRoutes);
app.use("/api/admin", adminRoutes);

/* ===== CRON ===== */
startExamTimeoutCron();

/* ===== SERVER ===== */
(async () => {
  try {
    const [rows] = await pool.query("SELECT 1");
    console.log("✅ MySQL connected");
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
  }
})();

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
