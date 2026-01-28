import { pool } from "../config/db.js";

//by default will send 10 unverified scribes and will send more accordingly to req like verified/unverified and page no
export const loadScribes = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    let { verified = "false", page = 1 } = req.query;

    const limit = 10;
    const pageNum = Number(page);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        message: "Invalid page number"
      });
    }

    // normalize verified flag
    if (verified !== "true" && verified !== "false") {
      return res.status(400).json({
        message: "verified must be true or false"
      });
    }

    const isVerified = verified === "true";
    const offset = (pageNum - 1) * limit;

    // ⚠️ LIMIT & OFFSET injected (MySQL safe pattern)
    const query = `
      SELECT
        s.id AS scribe_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.state,
        u.district,
        s.is_verified,
        s.qualification_doc_url,
        s.created_at
      FROM scribes s
      JOIN users u ON u.id = s.user_id
      WHERE s.is_verified = ?
      ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [scribes] = await conn.execute(query, [isVerified]);

    return res.status(200).json({
      page: pageNum,
      verified: isVerified,
      scribes,
      has_more: scribes.length === limit
    });

  } catch (err) {
    console.error("Admin load scribes error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  } finally {
    conn.release();
  }
};

//to verify an individual scribe
export const verifyScribes = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const { scribe_id, is_verified } = req.body;

    // basic validation
    if (
      !scribe_id ||
      typeof is_verified !== "boolean"
    ) {
      return res.status(400).json({
        message: "scribe_id and is_verified (boolean) are required"
      });
    }

    // check scribe exists
    const [scribes] = await conn.execute(
      "SELECT id, is_verified FROM scribes WHERE id = ?",
      [scribe_id]
    );

    if (!scribes.length) {
      return res.status(404).json({
        message: "Scribe not found"
      });
    }

    // update verification status
    await conn.execute(
      "UPDATE scribes SET is_verified = ? WHERE id = ?",
      [is_verified, scribe_id]
    );

    return res.status(200).json({
      message: `Scribe ${is_verified ? "verified" : "unverified"} successfully`
    });

  } catch (err) {
    console.error("Verify scribe error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  } finally {
    conn.release();
  }
};

//to view(read-only) requests basically the exam requests between student and scribe
export const viewRequests = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const { status, page = 1 } = req.query;

    const limit = 10;
    const pageNum = Number(page);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        message: "Invalid page number"
      });
    }

    const ALLOWED_STATUSES = [
      "OPEN",
      "ACCEPTED",
      "COMPLETED",
      "TIMED_OUT"
    ];

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status filter"
      });
    }

    const offset = (pageNum - 1) * limit;

    // default status = ACCEPTED
    const finalStatus = status || "ACCEPTED";

    let query = `
      SELECT
        er.id,
        er.exam_date,
        er.exam_time,
        er.language,
        er.state,
        er.district,
        er.city,
        er.status,
        er.student_name,
        er.scribe_name,
        er.created_at,
        er.accepted_at,
        er.completed_at
      FROM exam_requests er
      WHERE er.status = ?
      ORDER BY er.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [requests] = await conn.execute(query, [finalStatus]);

    return res.status(200).json({
      page: pageNum,
      status: finalStatus,
      requests,
      has_more: requests.length === limit
    });

  } catch (err) {
    console.error("Admin view requests error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  } finally {
    conn.release();
  }
};
