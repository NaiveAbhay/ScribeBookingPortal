import cron from "node-cron";
import { pool } from "../config/db.js";

export const startExamTimeoutCron = () => {
  cron.schedule("*/5 * * * *", async () => {
    const conn = await pool.getConnection();

    try {
      console.log("⏱️ Running exam timeout cron...");

      const [result] = await conn.execute(
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
    } finally {
      conn.release();
    }
  });
};
