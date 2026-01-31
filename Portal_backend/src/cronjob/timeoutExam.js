import cron from "node-cron";
import { pool } from "../config/db.js";

export const startExamTimeoutCron = () => {
  // Runs every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("⏱️ Running exam timeout cron...");

      // Execute directly on the pool - it handles connection management for you
      const [result] = await pool.execute(
        `
        UPDATE exam_requests 
        SET status = 'TIMED_OUT' 
        WHERE status IN ('OPEN', 'ACCEPTED') 
          AND TIMESTAMP(exam_date, IFNULL(exam_time, '23:59:59')) < NOW()
        `
      );

      if (result.affectedRows > 0) {
        console.log(`⏰ Timed out ${result.affectedRows} exam requests`);
      }

    } catch (err) {
      console.error("Cron error:", err);
    }
    // No finally/release needed when using pool.execute() directly
  });
};