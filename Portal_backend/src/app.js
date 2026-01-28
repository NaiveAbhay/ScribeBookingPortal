import express from "express";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import {authRoutes}  from "./routes/auth.routes.js";
import {studentRoutes}  from "./routes/student.routes.js";
import { startExamTimeoutCron } from "./cronjob/timeoutExam.js";
import { adminRoutes } from "./routes/admin.routes.js";
import cookieParser from "cookie-parser";


dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());


//cronjob
startExamTimeoutCron();

//auth
app.use("/api/auth",authRoutes)
app.use("/api/student",studentRoutes)
<<<<<<< HEAD
app.use("/api/scribe",scribeRoutes)

=======
app.use("/api/admin",adminRoutes)
>>>>>>> upstream/main

// app.get("/health", async (req, res) => {
//   try {
//     const [rows] = await pool.query("SELECT 1 AS result");
//     res.json({
//       status: "Backend running",
//       db: rows[0].result,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
