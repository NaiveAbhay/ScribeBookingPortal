// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import cookieParser from "cookie-parser";

// import { pool } from "./config/db.js";
// import { authRoutes } from "./routes/auth.routes.js";
// import { studentRoutes } from "./routes/student.routes.js";
// import { scribeRoutes } from "./routes/scribe.routes.js";
// import { adminRoutes } from "./routes/admin.routes.js";
// import { locationRoutes } from "./routes/location.routes.js";
// import { startExamTimeoutCron } from "./cronjob/timeoutExam.js";

// dotenv.config();

// const app = express();

// /* ===== MIDDLEWARE ===== */
// app.use(
//   cors({
//     origin: "http://localhost:5173", // frontend
//     credentials: true,              // allow cookies if needed
//   })
// );

// app.use(express.json());
// app.use(cookieParser());

// /* ===== ROUTES ===== */
// app.use("/api/locations", locationRoutes);
// app.use("/api/auth", authRoutes);
// app.use("/api/student", studentRoutes);
// app.use("/api/scribe", scribeRoutes);
// app.use("/api/admin", adminRoutes);

// /* ===== CRON ===== */
// startExamTimeoutCron();

// /* ===== SERVER ===== */
// (async () => {
//   try {
//     const [rows] = await pool.query("SELECT 1");
//     console.log("✅ MySQL connected");
//   } catch (err) {
//     console.error("❌ DB connection failed:", err.message);
//   }
// })();

// app.listen(process.env.PORT, () => {
//   console.log(`Server running on port ${process.env.PORT}`);
// });


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
    origin: process.env.VERCEL_FRONTEND_URL || "http://localhost:5173", // frontend
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

/* ===== SERVER INITIALIZATION ===== */
const startServer = async () => {
  try {
    // 1. Attempt to connect to the database first
    const [rows] = await pool.query("SELECT 1");
    console.log("✅ MySQL connected");

    // 2. Start Cron Jobs only after DB is ready
    startExamTimeoutCron();

    // 3. Start the Express server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    // If DB fails, the server will not start
    console.error("❌ DB connection failed. Server not started:", err.message);
    process.exit(1); // Exit with failure
  }
};

startServer();