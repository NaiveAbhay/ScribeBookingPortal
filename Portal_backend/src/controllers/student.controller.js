import crypto from "crypto";
import { pool } from "../config/db.js";
import {sendMail} from "../../utils/sendMail.js"
const ALLOWED_STATUSES=["OPEN","ACCEPTED","COMPLETED","TIMED_OUT"]

export const createExamRequest = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const userId = req.user.user_id;

    let { date, time, state, district, city,language } = req.body;

    // basic validation
    if (!date || !state || !district || !city||!time||!language) {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

    // normalize
    state = state.trim().toLowerCase();
    district = district.trim().toLowerCase();
    city = city.trim();
    language=language.trim().toLowerCase();

    // date validation
    const examDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (examDate < today) {
      return res.status(400).json({
        message: "Exam date must be today or in the future"
      });
    }

    // get student id
    const [students] = await conn.execute(
      "SELECT id FROM students WHERE user_id = ?",
      [userId]
    );

    if (!students.length) {
      return res.status(403).json({
        message: "Student not found"
      });
    }

    const studentId = students[0].id;

    await conn.beginTransaction();

    // create exam request
    const [result] = await conn.execute(
      `INSERT INTO exam_requests
       (student_id, student_name, exam_date, exam_time, state, district, city,language)
       VALUES (?, ?, ?, ?, ?, ?, ?,?)`,
      [
        studentId,
        "student", // snapshot name (can enhance later)
        date,
        time || null,
        state,
        district,
        city,
        language
      ]
    );

    const examRequestId = result.insertId;

    // fetch first 10 available scribes (same state + district)
    const [scribes] = await conn.execute(
      `SELECT
         s.id AS scribe_id,
         u.first_name,
         u.last_name
       FROM scribes s
       JOIN users u ON u.id = s.user_id
       WHERE s.is_verified = TRUE
       AND u.state = ?
       AND u.district = ?
       AND s.id NOT IN (
         SELECT scribe_id
         FROM scribe_unavailability
         WHERE date = ?
       )
       LIMIT 10`,
      [state, district, date]
    );

    await conn.commit();

    return res.status(201).json({
      message: "Exam request created",
      exam_request_id: examRequestId,
      scribes
    });

  } catch (err) {
    await conn.rollback();
    console.error("Create request error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  } finally {
    conn.release();
  }
};

export const loadScribes = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const { examRequestId, page = 1 } = req.query;
    const limit = 10;

    if (!examRequestId) {
      return res.status(400).json({ message: "examRequestId is required" });
    }

    const pageNum = Number(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }

    const offset = (pageNum - 1) * limit;

    // get exam request
    const [requests] = await conn.execute(
      `SELECT state, district, exam_date
       FROM exam_requests
       WHERE id = ?`,
      [examRequestId]
    );

    if (!requests.length) {
      return res.status(404).json({ message: "Exam request not found" });
    }

    let { state, district, exam_date } = requests[0];

    const examDate =
      exam_date instanceof Date
        ? exam_date.toISOString().slice(0, 10)
        : exam_date;

    state = state.toLowerCase();
    district = district.toLowerCase();

    // ⚠️ LIMIT & OFFSET injected (safe)
    const query = `
      SELECT
        s.id AS scribe_id,
        u.first_name,
        u.last_name,
        u.state,
        u.district,
        CASE
          WHEN u.state = ? AND u.district = ? THEN 1
          WHEN u.state = ? THEN 2
          ELSE 3
        END AS priority
      FROM scribes s
      JOIN users u ON u.id = s.user_id
      WHERE s.is_verified = TRUE
        AND s.id NOT IN (
          SELECT scribe_id
          FROM scribe_unavailability
          WHERE date = ?
        )
      ORDER BY priority ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [scribes] = await conn.execute(query, [
      state,
      district,
      state,
      examDate
    ]);

    return res.status(200).json({
      page: pageNum,
      scribes,
      has_more: scribes.length === limit
    });

  } catch (err) {
    console.error("Load scribes error:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
};

export const getRequests = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const userId = req.user.user_id;
    const { status, page = 1 } = req.query;

    const limit = 10;
    const pageNum = Number(page);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status filter"
      });
    }

    const offset = (pageNum - 1) * limit;

    // get student id
    const [students] = await conn.execute(
      "SELECT id FROM students WHERE user_id = ?",
      [userId]
    );

    if (!students.length) {
      return res.status(403).json({
        message: "Student not found"
      });
    }

    const studentId = students[0].id;

    // base query
    let query = `
      SELECT
        id,
        exam_date,
        exam_time,
        state,
        district,
        city,
        status,
        accepted_scribe_id,
        scribe_name,
        created_at
      FROM exam_requests
      WHERE student_id = ?
    `;

    const params = [studentId];

    // optional status filter
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    // inject LIMIT & OFFSET safely
    query += `
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [requests] = await conn.execute(query, params);

    return res.status(200).json({
      page: pageNum,
      requests,
      has_more: requests.length === limit
    });

  } catch (err) {
    console.error("Get requests error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  } finally {
    conn.release();
  }
};


export const sendRequestToScribes = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const userId = req.user.user_id;
    const { examRequestId, scribeIds } = req.body;

    if (!examRequestId || !Array.isArray(scribeIds) || scribeIds.length === 0) {
      return res.status(400).json({
        message: "examRequestId and scribeIds are required"
      });
    }

    // get student id
    const [students] = await conn.execute(
      "SELECT id FROM students WHERE user_id = ?",
      [userId]  
    );

    if (!students.length) {
      return res.status(403).json({ message: "Student not found" });
    }

    const studentId = students[0].id;

    // verify exam request ownership & status
    const [requests] = await conn.execute(
      `SELECT id, status
       FROM exam_requests
       WHERE id = ? AND student_id = ?`,
      [examRequestId, studentId]
    );

    if (!requests.length) {
      return res.status(404).json({ message: "Exam request not found" });
    }

    if (requests[0].status !== "OPEN") {
      return res.status(400).json({
        message: "Request is no longer open"
      });
    }

    // fetch valid scribes + emails
    const [scribes] = await conn.execute(
      `SELECT s.id AS scribe_id, u.email
       FROM scribes s
       JOIN users u ON u.id = s.user_id
       WHERE s.id IN (${scribeIds.map(() => "?").join(",")})
       AND s.is_verified = TRUE`,
      scribeIds
    );

    if (scribes.length === 0) {
      return res.status(400).json({
        message: "No valid scribes found"
      });
    }

    await conn.beginTransaction();

    for (const scribe of scribes) {
      const token = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO request_invites
         (exam_request_id, scribe_id, token, expires_at)
         VALUES (?, ?, ?, NOW() + INTERVAL 24 HOUR)`,
        [examRequestId, scribe.scribe_id, token]
      );

      // 📧 SEND EMAIL (placeholder)
      await sendMail({
        to: scribe.email,
        subject: "New Scribe Request",
        html: `
          <p>You have received a new exam request.</p>
          <a href="${process.env.FRONTEND_URL}/accept-request?token=${token}">
            Accept Request
          </a>
        `
      });
    }

    await conn.commit();

    return res.status(200).json({
      message: "Request sent to selected scribes"
    });

  } catch (err) {
    await conn.rollback();
    console.error("Send request error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  } finally {
    conn.release();
  }
};

export const getStudentProfile = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const userId = req.user.user_id;

    // fetch profile + student id
    const [profileRows] = await conn.execute(
      `
      SELECT
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.state,
        u.district,
        u.city,
        u.pincode,
        u.highest_qualification,
        u.current_class_year,
        u.profile_image_url,
        u.aadhaar_card_url,
        s.id AS student_id,
        s.disability_type,
        u.created_at
      FROM users u
      JOIN students s ON s.user_id = u.id
      WHERE u.id = ?
      `,
      [userId]
    );

    if (!profileRows.length) {
      return res.status(404).json({
        message: "Student profile not found"
      });
    }

    const profile = profileRows[0];

    // fetch exam stats
    const [statsRows] = await conn.execute(
      `
      SELECT
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS total_exams,
        COUNT(CASE WHEN status IN ('OPEN', 'ACCEPTED') THEN 1 END) AS upcoming_exams
      FROM exam_requests
      WHERE student_id = ?
      `,
      [profile.student_id]
    );

    const stats = statsRows[0];

    return res.status(200).json({
      profile: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        state: profile.state,
        district: profile.district,
        city: profile.city,
        pincode: profile.pincode,
        highest_qualification: profile.highest_qualification,
        current_class_year: profile.current_class_year,
        disability_type: profile.disability_type,
        profile_image_url: profile.profile_image_url,
        aadhaar_card_url: profile.aadhaar_card_url,
        joined_at: profile.created_at
      },
      stats: {
        total_exams: stats.total_exams,
        upcoming_exams: stats.upcoming_exams
      }
    });

  } catch (err) {
    console.error("Get student profile error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  } finally {
    conn.release();
  }
};

export const submitFeedback = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const userId = req.user.user_id;
    const { examRequestId, stars, review } = req.body;

    // basic validation
    if (!examRequestId || !stars || stars < 1 || stars > 5) {
      return res.status(400).json({
        message: "Invalid input"
      });
    }

    // get student id
    const [students] = await conn.execute(
      "SELECT id FROM students WHERE user_id = ?",
      [userId]
    );

    if (!students.length) {
      return res.status(403).json({
        message: "Student not found"
      });
    }

    const studentId = students[0].id;

    // verify exam request
    const [requests] = await conn.execute(
      `
      SELECT
        er.id,
        er.status,
        er.accepted_scribe_id,
        er.student_name,
        er.scribe_name
      FROM exam_requests er
      WHERE er.id = ?
        AND er.student_id = ?
      `,
      [examRequestId, studentId]
    );

    if (!requests.length) {
      return res.status(404).json({
        message: "Exam request not found"
      });
    }

    const request = requests[0];

    if (request.status !== "COMPLETED") {
      return res.status(400).json({
        message: "Feedback allowed only after exam completion"
      });
    }

    if (!request.accepted_scribe_id) {
      return res.status(400).json({
        message: "No scribe assigned for this exam"
      });
    }

    // prevent duplicate feedback
    const [existing] = await conn.execute(
      "SELECT id FROM ratings WHERE exam_request_id = ?",
      [examRequestId]
    );

    if (existing.length) {
      return res.status(409).json({
        message: "Feedback already submitted"
      });
    }

    await conn.beginTransaction();

    // insert rating
    await conn.execute(
      `
      INSERT INTO ratings
      (exam_request_id, student_id, scribe_id,
       student_name, scribe_name,
       stars, review)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        examRequestId,
        studentId,
        request.accepted_scribe_id,
        request.student_name,
        request.scribe_name,
        stars,
        review || null
      ]
    );

    // update scribe rating safely
    await conn.execute(
      `
      UPDATE scribes
      SET
        avg_rating =
          ((avg_rating * total_ratings) + ?) / (total_ratings + 1),
        total_ratings = total_ratings + 1
      WHERE id = ?
      `,
      [stars, request.accepted_scribe_id]
    );

    await conn.commit();

    return res.status(201).json({
      message: "Feedback submitted successfully"
    });

  } catch (err) {
    await conn.rollback();
    console.error("Submit feedback error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  } finally {
    conn.release();
  }
};
