// import crypto from "crypto";
// import { pool } from "../config/db.js";
// import {sendMail} from "../../utils/sendMail.js"
// const ALLOWED_STATUSES=["OPEN","ACCEPTED","COMPLETED","TIMED_OUT"]

// export const createExamRequest = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const userId = req.user.user_id;

//     let { date, time, state, district, city,language } = req.body;

//     // basic validation
//     if (!date || !state || !district || !city||!time||!language) {
//       return res.status(400).json({
//         message: "Missing required fields"
//       });
//     }

//     // normalize
//     state = state.trim().toLowerCase();
//     district = district.trim().toLowerCase();
//     city = city.trim();
//     language=language.trim().toLowerCase();

//     // date validation
//     const examDate = new Date(date);
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     if (examDate < today) {
//       return res.status(400).json({
//         message: "Exam date must be today or in the future"
//       });
//     }

//     // get student id
//     const [students] = await conn.execute(
//       "SELECT id FROM students WHERE user_id = ?",
//       [userId]
//     );

//     if (!students.length) {
//       return res.status(403).json({
//         message: "Student not found"
//       });
//     }

//     const studentId = students[0].id;

//     await conn.beginTransaction();

//     // create exam request
//   const [result] = await conn.execute(
//     `INSERT INTO exam_requests
//       (student_id, student_name, exam_date, exam_time, state, district, city, language, status)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INCOMPLETE')`, // 🟢 CHANGED FROM 'OPEN'
//     [studentId, "student", date, time || null, state, district, city, language]
//   );

//     const examRequestId = result.insertId;

//     // fetch first 10 available scribes (same state + district)
//     const [scribes] = await conn.execute(
//       `SELECT
//          s.id AS scribe_id,
//          u.first_name,
//          u.last_name
//        FROM scribes s
//        JOIN users u ON u.id = s.user_id
//        WHERE s.is_verified = TRUE
//        AND u.state = ?
//        AND u.district = ?
//        AND s.id NOT IN (
//          SELECT scribe_id
//          FROM scribe_unavailability
//          WHERE date = ?
//        )
//        LIMIT 10`,
//       [state, district, date]
//     );

//     await conn.commit();

//     return res.status(201).json({
//       message: "Exam request created",
//       exam_request_id: examRequestId,
//       scribes
//     });

//   } catch (err) {
//     await conn.rollback();
//     console.error("Create request error:", err);
//     return res.status(500).json({
//       message: "Internal server error"
//     });
//   } finally {
//     conn.release();
//   }
// };


// // export const createExamRequest = async (req, res) => {
// //   const conn = await pool.getConnection();

// //   try {
// //     const userId = req.user.user_id;
// //     let { date, time, state, district, city, language } = req.body;

// //     // ... (keep your existing validation and normalization code here) ...

// //     // 1. Search for available scribes FIRST using the correct column names
// //     const [scribes] = await conn.execute(
// //       `SELECT 
// //          s.id AS scribe_id, 
// //          u.first_name, 
// //          u.last_name 
// //        FROM scribes s
// //        JOIN users u ON u.id = s.user_id
// //        JOIN scribe_languages sl ON s.id = sl.scribe_id
// //        WHERE s.is_verified = TRUE
// //          AND u.state = ?
// //          AND u.district = ?
// //          AND sl.language = ?
// //          AND s.id NOT IN (
// //            SELECT scribe_id FROM scribe_unavailability WHERE date = ?
// //          )
// //        LIMIT 10`,
// //       [state, district, language, date]
// //     );

// //     // 2. If no scribes found, return error and do not insert into DB
// //     if (scribes.length === 0) {
// //       conn.release();
// //       return res.status(404).json({ 
// //         message: "No verified scribes found for your selected location and language." 
// //       });
// //     }

// //     // ... (keep the rest of the function to insert the request and commit) ...

// //   } catch (err) {
// //     if (conn) await conn.rollback();
// //     console.error("Create request error:", err);
// //     return res.status(500).json({ message: "Internal server error" });
// //   } finally {
// //     conn.release();
// //   }
// // };

// // export const loadScribes = async (req, res) => {
// //   const conn = await pool.getConnection();

// //   try {
// //     const { examRequestId, page = 1 } = req.query;
// //     const limit = 5; // Number of scribes per page
// //     const pageNum = Number(page);

// //     if (!examRequestId) return res.status(400).json({ message: "Request ID required" });

// //     // 1. Get Exam Location details
// //     const [requests] = await conn.execute(
// //       `SELECT state, district, exam_date FROM exam_requests WHERE id = ?`,
// //       [examRequestId]
// //     );

// //     if (!requests.length) return res.status(404).json({ message: "Request not found" });

// //     let { state, district, exam_date } = requests[0];
    
// //     // Normalize strings for comparison
// //     state = state.trim().toLowerCase();
// //     district = district.trim().toLowerCase();
    
// //     // Format date for SQL
// //     const examDate = exam_date instanceof Date 
// //       ? exam_date.toISOString().slice(0, 10) 
// //       : exam_date;

// //     // 2. THE SORTING QUERY
// //     const offset = (pageNum - 1) * limit;

// //     const query = `
// //       SELECT 
// //         s.id AS scribe_id, 
// //         u.first_name, 
// //         u.last_name, 
// //         u.state, 
// //         u.district, 
// //         u.city,
// //         s.avg_rating, 
// //         s.total_ratings,
// //         -- 🟢 PRIORITY LOGIC
// //         CASE 
// //           WHEN LOWER(u.district) = ? AND LOWER(u.state) = ? THEN 1  -- Same District & State
// //           WHEN LOWER(u.state) = ? THEN 2                            -- Same State (Diff District)
// //           ELSE 3                                                    -- Different State (Far)
// //         END AS priority
// //       FROM scribes s
// //       JOIN users u ON u.id = s.user_id
// //       WHERE s.is_verified = TRUE
// //         -- 🟢 FILTER: Only show scribes from same state? 
// //         -- Remove the line below if you want to show scribes from ALL India
// //         AND LOWER(u.state) = ? 
        
// //         -- Check Availability
// //         AND s.id NOT IN (
// //           SELECT scribe_id FROM scribe_unavailability WHERE date = ?
// //         )
// //       ORDER BY priority ASC, s.avg_rating DESC  -- Sort by Location, then by Rating
// //       LIMIT ${limit} OFFSET ${offset}
// //     `;

// //     // Params: [district, state, state, state (for filter), examDate]
// //     const [scribes] = await conn.execute(query, [district, state, state, state, examDate]);

// //     // 3. Return Data
// //     return res.status(200).json({
// //       page: pageNum,
// //       scribes,
// //       has_more: scribes.length === limit // If we got full limit, assume more exist
// //     });

// //   } catch (err) {
// //     console.error("Load scribes error:", err);
// //     return res.status(500).json({ message: "Internal server error" });
// //   } finally {
// //     conn.release();
// //   }
// // };

// // export const getRequests = async (req, res) => {
// //   const conn = await pool.getConnection();

// //   try {
// //     const userId = req.user.user_id;
// //     const { status, page = 1 } = req.query;

// //     const limit = 10;
// //     const pageNum = Number(page);

// //     if (isNaN(pageNum) || pageNum < 1) {
// //       return res.status(400).json({ message: "Invalid page number" });
// //     }

// //     if (status && !ALLOWED_STATUSES.includes(status)) {
// //       return res.status(400).json({
// //         message: "Invalid status filter"
// //       });
// //     }

// //     const offset = (pageNum - 1) * limit;

// //     // get student id
// //     const [students] = await conn.execute(
// //       "SELECT id FROM students WHERE user_id = ?",
// //       [userId]
// //     );

// //     if (!students.length) {
// //       return res.status(403).json({
// //         message: "Student not found"
// //       });
// //     }

// //     const studentId = students[0].id;

// //     // base query
// //     let query = `
// //     SELECT 
// //       id, exam_date, exam_time, state, district, city, status, 
// //       accepted_scribe_id, scribe_name, created_at
// //     FROM exam_requests
// //     WHERE student_id = ? 
// //     AND status != 'INCOMPLETE'  -- 🟢 ADD THIS FILTER
// //   `;

// //     const params = [studentId];

// //     // optional status filter
// //     if (status) {
// //       query += ` AND status = ?`;
// //       params.push(status);
// //     }

// //     // inject LIMIT & OFFSET safely
// //     query += `
// //       ORDER BY created_at DESC
// //       LIMIT ${limit} OFFSET ${offset}
// //     `;

// //     const [requests] = await conn.execute(query, params);

// //     return res.status(200).json({
// //       page: pageNum,
// //       requests,
// //       has_more: requests.length === limit
// //     });

// //   } catch (err) {
// //     console.error("Get requests error:", err);
// //     return res.status(500).json({
// //       message: "Internal server error"
// //     });
// //   } finally {
// //     conn.release();
// //   }
// // };


// // 1. FIX: loadScribes (For Create Request - 5 scribes per page)
// // export const loadScribes = async (req, res) => {
// //   const conn = await pool.getConnection();

// //   try {
// //     const { examRequestId, page = 1 } = req.query;
// //     const limit = 5; // 🟢 FORCE LIMIT TO 5
// //     const pageNum = Number(page);

// //     if (!examRequestId) return res.status(400).json({ message: "Request ID required" });

// //     // Get Exam Location
// //     const [requests] = await conn.execute(
// //       `SELECT state, district, exam_date FROM exam_requests WHERE id = ?`,
// //       [examRequestId]
// //     );

// //     if (!requests.length) return res.status(404).json({ message: "Request not found" });

// //     let { state, district, exam_date } = requests[0];
// //     state = state.trim().toLowerCase();
// //     district = district.trim().toLowerCase();
    
// //     const examDate = exam_date instanceof Date 
// //       ? exam_date.toISOString().slice(0, 10) 
// //       : exam_date;

// //     const offset = (pageNum - 1) * limit;

// //     // Sorting Logic: Priority 1 (District), Priority 2 (State), Priority 3 (Others)
// //     const query = `
// //       SELECT 
// //         s.id AS scribe_id, 
// //         u.first_name, 
// //         u.last_name, 
// //         u.state, 
// //         u.district, 
// //         u.city,
// //         s.avg_rating, 
// //         s.total_ratings,
// //         CASE 
// //           WHEN LOWER(u.district) = ? AND LOWER(u.state) = ? THEN 1 
// //           WHEN LOWER(u.state) = ? THEN 2 
// //           ELSE 3 
// //         END AS priority
// //       FROM scribes s
// //       JOIN users u ON u.id = s.user_id
// //       WHERE s.is_verified = TRUE
// //         AND LOWER(u.state) = ? 
// //         AND s.id NOT IN (
// //           SELECT scribe_id FROM scribe_unavailability WHERE date = ?
// //         )
// //       ORDER BY priority ASC, s.avg_rating DESC
// //       LIMIT ${limit + 1} OFFSET ${offset}  -- 🟢 Fetch 6 items to check if next page exists
// //     `;

// //     const [rows] = await conn.execute(query, [district, state, state, state, examDate]);

// //     // Check if we have a next page
// //     const has_more = rows.length > limit;
// //     const scribes = has_more ? rows.slice(0, limit) : rows;

// //     return res.status(200).json({
// //       page: pageNum,
// //       scribes,
// //       has_more 
// //     });

// //   } catch (err) {
// //     console.error("Load scribes error:", err);
// //     return res.status(500).json({ message: "Internal server error" });
// //   } finally {
// //     conn.release();
// //   }
// // };

// // 2. FIX: getRequests (For Dashboard - 5 requests per page)

// // src/controllers/student.controller.js

// export const loadScribes = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const { examRequestId, page = 1 } = req.query;
//     const limit = 5; // 🟢 FORCE LIMIT TO 5
//     const pageNum = Number(page);

//     if (!examRequestId) return res.status(400).json({ message: "Request ID required" });

//     // 1. Get Exam Request Location
//     const [requests] = await conn.execute(
//       `SELECT state, district, exam_date FROM exam_requests WHERE id = ?`,
//       [examRequestId]
//     );

//     if (!requests.length) return res.status(404).json({ message: "Request not found" });

//     let { state, district, exam_date } = requests[0];
    
//     // Normalize for comparison
//     state = state.trim().toLowerCase();
//     district = district.trim().toLowerCase();

//     const examDate = exam_date instanceof Date 
//       ? exam_date.toISOString().slice(0, 10) 
//       : exam_date;

//     const offset = (pageNum - 1) * limit;

//     // 2. QUERY with Strict Priority Logic
//     // We fetch limit + 1 (6 items) to see if page 2 exists
//     const query = `
//       SELECT 
//         s.id AS scribe_id, 
//         u.first_name, 
//         u.last_name, 
//         u.state, 
//         u.district, 
//         u.city,
//         s.avg_rating, 
//         s.total_ratings,
//         CASE 
//           WHEN LOWER(TRIM(u.district)) = ? AND LOWER(TRIM(u.state)) = ? THEN 1 -- Priority 1: Same District
//           WHEN LOWER(TRIM(u.state)) = ? THEN 2                                 -- Priority 2: Same State
//           ELSE 3 
//         END AS priority
//       FROM scribes s
//       JOIN users u ON u.id = s.user_id
//       WHERE s.is_verified = TRUE
//         AND LOWER(TRIM(u.state)) = ? -- Filter by State
//         AND s.id NOT IN (
//           SELECT scribe_id FROM scribe_unavailability WHERE date = ?
//         )
//       ORDER BY priority ASC, s.avg_rating DESC
//       LIMIT ${limit + 1} OFFSET ${offset}
//     `;

//     // Params: [district, state, state, state, examDate]
//     const [rows] = await conn.execute(query, [district, state, state, state, examDate]);

//     // 3. Pagination Logic
//     const has_more = rows.length > limit;
//     const scribes = has_more ? rows.slice(0, limit) : rows; // Remove the 6th item if it exists

//     return res.status(200).json({
//       page: pageNum,
//       scribes,
//       has_more 
//     });

//   } catch (err) {
//     console.error("Load scribes error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   } finally {
//     conn.release();
//   }
// };
// // src/controllers/student.controller.js

// export const getRequests = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const userId = req.user.user_id;
//     const { status, page = 1 } = req.query;

//     const limit = 5; 
//     const pageNum = Number(page);
//     const offset = (pageNum - 1) * limit;

//     const [students] = await conn.execute("SELECT id FROM students WHERE user_id = ?", [userId]);
//     if (!students.length) return res.status(403).json({ message: "Student not found" });
//     const studentId = students[0].id;

//     // Base Query
//     let query = `
//       SELECT 
//         er.id, er.exam_date, er.exam_time, er.state, er.district, er.city, er.status, 
//         er.accepted_scribe_id, er.scribe_name, er.created_at,
//         CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_rated
//       FROM exam_requests er
//       LEFT JOIN ratings r ON er.id = r.exam_request_id AND r.student_id = er.student_id
//       WHERE er.student_id = ? 
//       AND er.status != 'INCOMPLETE'
//     `;

//     const params = [studentId];

//     // Status Filter (If user selects specific filter in dropdown)
//     if (status) {
//       query += ` AND er.status = ?`;
//       params.push(status);
//     }

//     // 🟢 CUSTOM SORTING LOGIC
//     // 1. ACCEPTED, 2. OPEN, 3. COMPLETED, 4. TIMED_OUT
//     query += `
//       ORDER BY 
//       CASE er.status
//         WHEN 'ACCEPTED' THEN 1
//         WHEN 'OPEN' THEN 2
//         WHEN 'COMPLETED' THEN 3
//         WHEN 'TIMED_OUT' THEN 4
//         ELSE 5
//       END ASC,
//       er.created_at DESC
//       LIMIT ${limit + 1} OFFSET ${offset}
//     `;

//     const [rows] = await conn.execute(query, params);

//     const has_more = rows.length > limit;
//     const requests = has_more ? rows.slice(0, limit) : rows;

//     return res.status(200).json({
//       page: pageNum,
//       requests,
//       has_more
//     });

//   } catch (err) {
//     console.error("Get requests error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   } finally {
//     conn.release();
//   }
// };


// export const sendRequestToScribes = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const userId = req.user.user_id;
//     const { examRequestId, scribeIds } = req.body;

//     if (!examRequestId || !Array.isArray(scribeIds) || scribeIds.length === 0) {
//       return res.status(400).json({
//         message: "examRequestId and scribeIds are required"
//       });
//     }

//     // 1. Get Student ID & Name (Joined with Users table)
//     const [students] = await conn.execute(
//       `SELECT s.id, u.first_name, u.last_name 
//        FROM students s
//        JOIN users u ON s.user_id = u.id
//        WHERE s.user_id = ?`,
//       [userId]  
//     );

//     if (!students.length) {
//       return res.status(403).json({ message: "Student not found" });
//     }

//     const studentId = students[0].id;
//     const studentName = `${students[0].first_name} ${students[0].last_name}`;

//     // 2. Verify exam request & Get Date/Time
//     const [requests] = await conn.execute(
//       `SELECT id, status, exam_date, exam_time
//        FROM exam_requests
//        WHERE id = ? AND student_id = ?`,
//       [examRequestId, studentId]
//     );

//     if (!requests.length) {
//       return res.status(404).json({ message: "Exam request not found" });
//     }

//     const requestDetails = requests[0];
//     const currentStatus = requestDetails.status;

//     // Allow 'INCOMPLETE' or 'OPEN' to proceed
//     if (currentStatus !== "OPEN" && currentStatus !== "INCOMPLETE") {
//       return res.status(400).json({
//         message: "Request is no longer valid for sending invites"
//       });
//     }

//     // 3. Fetch valid scribes + emails + names
//     const [scribes] = await conn.execute(
//       `SELECT s.id AS scribe_id, u.email, u.first_name
//        FROM scribes s
//        JOIN users u ON u.id = s.user_id
//        WHERE s.id IN (${scribeIds.map(() => "?").join(",")})
//        AND s.is_verified = TRUE`,
//       scribeIds
//     );

//     if (scribes.length === 0) {
//       return res.status(400).json({ message: "No valid scribes found" });
//     }

//     await conn.beginTransaction();

//     // Format Date for Email
//     const formattedDate = new Date(requestDetails.exam_date).toLocaleDateString('en-IN', {
//       day: 'numeric', month: 'short', year: 'numeric'
//     });
//     const formattedTime = requestDetails.exam_time || "Time TBD";

//     // 4. Send Invites
//     for (const scribe of scribes) {
//       const token = crypto.randomUUID();

//       await conn.execute(
//         `INSERT INTO request_invites
//          (exam_request_id, scribe_id, token, expires_at)
//          VALUES (?, ?, ?, NOW() + INTERVAL 24 HOUR)`,
//         [examRequestId, scribe.scribe_id, token]
//       );

//       // 📧 SEND EMAIL (Updated Content)
//       await sendMail({
//         to: scribe.email,
//         subject: `Exam Scribe Request from ${studentName}`,
//         html: `
//           <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
//             <h2 style="color: #333;">Hello ${scribe.first_name},</h2>
//             <p style="font-size: 16px; color: #555;">
//               <strong>${studentName}</strong> has invited you to be their scribe for an upcoming exam.
//             </p>
            
//             <div style="background-color: #f4f8fb; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
//               <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
//               <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${formattedTime}</p>
//             </div>

//             <p style="color: #555;">Please log in to your dashboard to view full details and accept or decline this request.</p>

//             <div style="text-align: center; margin: 30px 0;">
//               <a href="${process.env.FRONTEND_URL}/login" 
//                  style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
//                  Login to Dashboard
//               </a>
//             </div>
            
//             <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
//             <p style="font-size: 12px; color: #999; text-align: center;">
//               This is an automated message from Scribe Portal.
//             </p>
//           </div>
//         `
//       });
//     }

//     // 5. Activate Request if needed
//     if (currentStatus === "INCOMPLETE") {
//       await conn.execute(
//         `UPDATE exam_requests SET status = 'OPEN' WHERE id = ?`,
//         [examRequestId]
//       );
//     }

//     await conn.commit();

//     return res.status(200).json({
//       message: "Invitations sent successfully"
//     });

//   } catch (err) {
//     await conn.rollback();
//     console.error("Send request error:", err);
//     return res.status(500).json({
//       message: "Internal server error"
//     });
//   } finally {
//     conn.release();
//   }
// };
// export const getStudentProfile = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const userId = req.user.user_id;

//     // fetch profile + student id
//     const [profileRows] = await conn.execute(
//       `
//       SELECT
//         u.id AS user_id,
//         u.first_name,
//         u.last_name,
//         u.email,
//         u.phone,
//         u.state,
//         u.district,
//         u.city,
//         u.pincode,
//         u.highest_qualification,
//         u.current_class_year,
//         u.profile_image_url,
//         u.aadhaar_card_url,
//         s.id AS student_id,
//         s.disability_type,
//         u.created_at
//       FROM users u
//       JOIN students s ON s.user_id = u.id
//       WHERE u.id = ?
//       `,
//       [userId]
//     );

//     if (!profileRows.length) {
//       return res.status(404).json({
//         message: "Student profile not found"
//       });
//     }

//     const profile = profileRows[0];

//     // fetch exam stats
//     const [statsRows] = await conn.execute(
//       `
//       SELECT
//         COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS total_exams,
//         COUNT(CASE WHEN status IN ('OPEN', 'ACCEPTED') THEN 1 END) AS upcoming_exams
//       FROM exam_requests
//       WHERE student_id = ?
//       `,
//       [profile.student_id]
//     );

//     const stats = statsRows[0];

//     return res.status(200).json({
//       profile: {
//         first_name: profile.first_name,
//         last_name: profile.last_name,
//         email: profile.email,
//         phone: profile.phone,
//         state: profile.state,
//         district: profile.district,
//         city: profile.city,
//         pincode: profile.pincode,
//         highest_qualification: profile.highest_qualification,
//         current_class_year: profile.current_class_year,
//         disability_type: profile.disability_type,
//         profile_image_url: profile.profile_image_url,
//         aadhaar_card_url: profile.aadhaar_card_url,
//         joined_at: profile.created_at
//       },
//       stats: {
//         total_exams: stats.total_exams,
//         upcoming_exams: stats.upcoming_exams
//       }
//     });

//   } catch (err) {
//     console.error("Get student profile error:", err);
//     return res.status(500).json({
//       message: "Internal server error"
//     });
//   } finally {
//     conn.release();
//   }
// };

// export const submitFeedback = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const userId = req.user.user_id;
//     const { examRequestId, stars, review } = req.body;

//     // basic validation
//     if (!examRequestId || !stars || stars < 1 || stars > 5) {
//       return res.status(400).json({
//         message: "Invalid input"
//       });
//     }

//     // get student id
//     const [students] = await conn.execute(
//       "SELECT id FROM students WHERE user_id = ?",
//       [userId]
//     );

//     if (!students.length) {
//       return res.status(403).json({
//         message: "Student not found"
//       });
//     }

//     const studentId = students[0].id;

//     // verify exam request
//     const [requests] = await conn.execute(
//       `
//       SELECT
//         er.id,
//         er.status,
//         er.accepted_scribe_id,
//         er.student_name,
//         er.scribe_name
//       FROM exam_requests er
//       WHERE er.id = ?
//         AND er.student_id = ?
//       `,
//       [examRequestId, studentId]
//     );

//     if (!requests.length) {
//       return res.status(404).json({
//         message: "Exam request not found"
//       });
//     }

//     const request = requests[0];

//     if (request.status !== "COMPLETED") {
//       return res.status(400).json({
//         message: "Feedback allowed only after exam completion"
//       });
//     }

//     if (!request.accepted_scribe_id) {
//       return res.status(400).json({
//         message: "No scribe assigned for this exam"
//       });
//     }

//     // prevent duplicate feedback
//     const [existing] = await conn.execute(
//       "SELECT id FROM ratings WHERE exam_request_id = ?",
//       [examRequestId]
//     );

//     if (existing.length) {
//       return res.status(409).json({
//         message: "Feedback already submitted"
//       });
//     }

//     await conn.beginTransaction();

//     // insert rating
//     await conn.execute(
//       `
//       INSERT INTO ratings
//       (exam_request_id, student_id, scribe_id,
//        student_name, scribe_name,
//        stars, review)
//       VALUES (?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         examRequestId,
//         studentId,
//         request.accepted_scribe_id,
//         request.student_name,
//         request.scribe_name,
//         stars,
//         review || null
//       ]
//     );

//     // update scribe rating safely
//     await conn.execute(
//       `
//       UPDATE scribes
//       SET
//         avg_rating =
//           ((avg_rating * total_ratings) + ?) / (total_ratings + 1),
//         total_ratings = total_ratings + 1
//       WHERE id = ?
//       `,
//       [stars, request.accepted_scribe_id]
//     );

//     await conn.commit();

//     return res.status(201).json({
//       message: "Feedback submitted successfully"
//     });

//   } catch (err) {
//     await conn.rollback();
//     console.error("Submit feedback error:", err);
//     return res.status(500).json({
//       message: "Internal server error"
//     });
//   } finally {
//     conn.release();
//   }
// };




///////////////////////////////////////////////////////////////////////////////////////////
// import crypto from "crypto";
// import { pool } from "../config/db.js";
// import { sendMail } from "../../utils/sendMail.js";

// // Ensure 'INCOMPLETE' is allowed
// const ALLOWED_STATUSES = ["INCOMPLETE", "OPEN", "ACCEPTED", "COMPLETED", "TIMED_OUT"];

// export const createExamRequest = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const userId = req.user.user_id;
//     let { date, time, state, district, city, language } = req.body;

//     // basic validation
//     if (!date || !state || !district || !city || !time || !language) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // normalize
//     state = state.trim().toLowerCase();
//     district = district.trim().toLowerCase();
//     city = city.trim();
//     language = language.trim().toLowerCase();

//     // date validation
//     const examDate = new Date(date);
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     if (examDate < today) {
//       return res.status(400).json({ message: "Exam date must be today or in the future" });
//     }

//     // 🟢 1. Check for Scribes FIRST
//     const [scribes] = await conn.execute(
//       `SELECT
//           s.id AS scribe_id,
//           u.first_name,
//           u.last_name,
//           u.state,
//           u.district,
//           s.avg_rating,
//           s.total_ratings
//        FROM scribes s
//        JOIN users u ON u.id = s.user_id
//        JOIN scribe_languages sl ON s.id = sl.scribe_id
//        WHERE s.is_verified = TRUE
//        AND u.state = ?
//        AND u.district = ?
//        AND sl.language = ?
//        AND s.id NOT IN (
//          SELECT scribe_id FROM scribe_unavailability WHERE date = ?
//        )
//        LIMIT 10`,
//       [state, district, language, date]
//     );

//     // If 0 scribes found, return 404 immediately
//     if (scribes.length === 0) {
//       conn.release();
//       return res.status(404).json({
//         message: "No verified scribes found for this location and language."
//       });
//     }

//     // get student id
//     const [students] = await conn.execute(
//       "SELECT id FROM students WHERE user_id = ?",
//       [userId]
//     );

//     if (!students.length) {
//       return res.status(403).json({ message: "Student not found" });
//     }
//     const studentId = students[0].id;

//     await conn.beginTransaction();

//     // create exam request (Status: INCOMPLETE)
//     const [result] = await conn.execute(
//       `INSERT INTO exam_requests
//         (student_id, student_name, exam_date, exam_time, state, district, city, language, status)
//         VALUES (?, 'Student', ?, ?, ?, ?, ?, ?, 'INCOMPLETE')`,
//       [studentId, date, time || null, state, district, city, language]
//     );

//     const examRequestId = result.insertId;

//     await conn.commit();

//     return res.status(201).json({
//       message: "Exam request created",
//       exam_request_id: examRequestId,
//       scribes 
//     });

//   } catch (err) {
//     if (conn) await conn.rollback();
//     console.error("Create request error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   } finally {
//     if (conn) conn.release();
//   }
// };

// export const loadScribes = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const { examRequestId, page = 1 } = req.query;
//     const limit = 5;
//     const pageNum = Number(page);

//     if (!examRequestId) return res.status(400).json({ message: "Request ID required" });

//     // 1. Get Exam Request Location
//     const [requests] = await conn.execute(
//       `SELECT state, district, exam_date, language FROM exam_requests WHERE id = ?`,
//       [examRequestId]
//     );

//     if (!requests.length) return res.status(404).json({ message: "Request not found" });

//     let { state, district, exam_date, language } = requests[0];
    
//     // Normalize
//     state = state.trim().toLowerCase();
//     district = district.trim().toLowerCase();
//     language = language.trim().toLowerCase();

//     const examDate = exam_date instanceof Date 
//       ? exam_date.toISOString().slice(0, 10) 
//       : exam_date;

//     const offset = (pageNum - 1) * limit;

//     // 2. QUERY with Priority Logic
//     const query = `
//       SELECT 
//         s.id AS scribe_id, 
//         u.first_name, 
//         u.last_name, 
//         u.state, 
//         u.district, 
//         u.city,
//         s.avg_rating, 
//         s.total_ratings,
//         CASE 
//           WHEN LOWER(TRIM(u.district)) = ? THEN 1 -- Same District
//           ELSE 2                                  -- Same State
//         END AS priority
//       FROM scribes s
//       JOIN users u ON u.id = s.user_id
//       JOIN scribe_languages sl ON s.id = sl.scribe_id
//       WHERE s.is_verified = TRUE
//         AND LOWER(TRIM(u.state)) = ?
//         AND sl.language = ?
//         AND s.id NOT IN (
//           SELECT scribe_id FROM scribe_unavailability WHERE date = ?
//         )
//       ORDER BY priority ASC, s.avg_rating DESC
//       LIMIT ${limit + 1} OFFSET ${offset}
//     `;

//     const [rows] = await conn.execute(query, [district, state, language, examDate]);

//     const has_more = rows.length > limit;
//     const scribes = has_more ? rows.slice(0, limit) : rows;

//     return res.status(200).json({
//       page: pageNum,
//       scribes,
//       has_more 
//     });

//   } catch (err) {
//     console.error("Load scribes error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   } finally {
//     conn.release();
//   }
// };

// export const getRequests = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const userId = req.user.user_id;
//     const { status, page = 1 } = req.query;

//     const limit = 5; 
//     const pageNum = Number(page);
//     const offset = (pageNum - 1) * limit;

//     if (status && !ALLOWED_STATUSES.includes(status)) {
//         return res.status(400).json({ message: "Invalid status filter" });
//     }

//     const [students] = await conn.execute("SELECT id FROM students WHERE user_id = ?", [userId]);
//     if (!students.length) return res.status(403).json({ message: "Student not found" });
//     const studentId = students[0].id;

//     let query = `
//       SELECT 
//         er.id, er.exam_date, er.exam_time, er.state, er.district, er.city, er.status, 
//         er.accepted_scribe_id, er.scribe_name, er.created_at,
//         CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_rated
//       FROM exam_requests er
//       LEFT JOIN ratings r ON er.id = r.exam_request_id AND r.student_id = er.student_id
//       WHERE er.student_id = ? 
//       AND er.status != 'INCOMPLETE'
//     `;

//     const params = [studentId];

//     if (status) {
//       query += ` AND er.status = ?`;
//       params.push(status);
//     }

//     query += `
//       ORDER BY 
//       CASE er.status
//         WHEN 'ACCEPTED' THEN 1
//         WHEN 'OPEN' THEN 2
//         WHEN 'COMPLETED' THEN 3
//         WHEN 'TIMED_OUT' THEN 4
//         ELSE 5
//       END ASC,
//       er.created_at DESC
//       LIMIT ${limit + 1} OFFSET ${offset}
//     `;

//     const [rows] = await conn.execute(query, params);

//     const has_more = rows.length > limit;
//     const requests = has_more ? rows.slice(0, limit) : rows;

//     return res.status(200).json({
//       page: pageNum,
//       requests,
//       has_more
//     });

//   } catch (err) {
//     console.error("Get requests error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   } finally {
//     conn.release();
//   }
// };

// export const sendRequestToScribes = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const userId = req.user.user_id;
//     const { examRequestId, scribeIds } = req.body;

//     if (!examRequestId || !Array.isArray(scribeIds) || scribeIds.length === 0) {
//       return res.status(400).json({ message: "examRequestId and scribeIds are required" });
//     }

//     // 1. Get Student ID & Name
//     const [students] = await conn.execute(
//       `SELECT s.id, u.first_name, u.last_name 
//        FROM students s
//        JOIN users u ON s.user_id = u.id
//        WHERE s.user_id = ?`,
//       [userId]  
//     );

//     if (!students.length) {
//       return res.status(403).json({ message: "Student not found" });
//     }

//     const studentId = students[0].id;
//     const studentName = `${students[0].first_name} ${students[0].last_name}`;

//     // 2. Verify exam request
//     const [requests] = await conn.execute(
//       `SELECT id, status, exam_date, exam_time
//        FROM exam_requests
//        WHERE id = ? AND student_id = ?`,
//       [examRequestId, studentId]
//     );

//     if (!requests.length) {
//       return res.status(404).json({ message: "Exam request not found" });
//     }

//     const requestDetails = requests[0];
//     const currentStatus = requestDetails.status;

//     if (currentStatus !== "OPEN" && currentStatus !== "INCOMPLETE") {
//       return res.status(400).json({ message: "Request is no longer valid" });
//     }

//     // 3. Fetch scribes (AND Filter out duplicates)
//     const [scribes] = await conn.execute(
//       `SELECT s.id AS scribe_id, u.email, u.first_name
//        FROM scribes s
//        JOIN users u ON u.id = s.user_id
//        WHERE s.id IN (${scribeIds.map(() => "?").join(",")})
//        AND s.is_verified = TRUE
//        AND s.id NOT IN (
//           SELECT scribe_id FROM request_invites WHERE exam_request_id = ?
//        )`,
//       [...scribeIds, examRequestId] 
//     );

//     if (scribes.length === 0) {
//       return res.status(200).json({ message: "Invites sent (Duplicates skipped)" });
//     }

//     await conn.beginTransaction();

//     // 🟢 Format Date/Time for Email
//     const formattedDate = new Date(requestDetails.exam_date).toLocaleDateString('en-IN', {
//       day: 'numeric', month: 'short', year: 'numeric'
//     });
//     const formattedTime = requestDetails.exam_time || "Time TBD";

//     // 4. Send Invites
//     for (const scribe of scribes) {
//       const token = crypto.randomUUID();

//       await conn.execute(
//         `INSERT INTO request_invites
//          (exam_request_id, scribe_id, token, expires_at)
//          VALUES (?, ?, ?, NOW() + INTERVAL 24 HOUR)`,
//         [examRequestId, scribe.scribe_id, token]
//       );

//       // 📧 SEND EMAIL (Corrected Content)
//       await sendMail({
//         to: scribe.email,
//         subject: `Exam Scribe Request from ${studentName}`,
//         html: `
//           <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
//             <h2 style="color: #333;">Hello ${scribe.first_name},</h2>
//             <p style="font-size: 16px; color: #555;">
//               <strong>${studentName}</strong> has invited you to be their scribe for an upcoming exam.
//             </p>
            
//             <div style="background-color: #f4f8fb; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
//               <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
//               <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${formattedTime}</p>
//             </div>

//             <p style="color: #555;">Please log in to your dashboard to view details and accept the request.</p>

//             <div style="text-align: center; margin: 30px 0;">
//               <a href="${process.env.FRONTEND_URL}/login" 
//                  style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
//                  Login to Dashboard
//               </a>
//             </div>
            
//             <p style="font-size: 12px; color: #999; text-align: center;">
//               This is an automated message from Scribe Portal.
//             </p>
//           </div>
//         `
//       });
//     }

//     // 5. Activate Request
//     if (currentStatus === "INCOMPLETE") {
//       await conn.execute(
//         `UPDATE exam_requests SET status = 'OPEN' WHERE id = ?`,
//         [examRequestId]
//       );
//     }

//     await conn.commit();

//     return res.status(200).json({ message: "Invitations sent successfully" });

//   } catch (err) {
//     if (conn) await conn.rollback();
//     console.error("Send request error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   } finally {
//     conn.release();
//   }
// };

// export const getStudentProfile = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const userId = req.user.user_id;

//     const [profileRows] = await conn.execute(
//       `
//       SELECT
//         u.id AS user_id, u.first_name, u.last_name, u.email, u.phone,
//         u.state, u.district, u.city, u.pincode, u.highest_qualification,
//         u.current_class_year, u.profile_image_url, u.aadhaar_card_url,
//         s.id AS student_id, s.disability_type, u.created_at
//       FROM users u
//       JOIN students s ON s.user_id = u.id
//       WHERE u.id = ?
//       `,
//       [userId]
//     );

//     if (!profileRows.length) {
//       return res.status(404).json({ message: "Student profile not found" });
//     }

//     const profile = profileRows[0];

//     const [statsRows] = await conn.execute(
//       `
//       SELECT
//         COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS total_exams,
//         COUNT(CASE WHEN status IN ('OPEN', 'ACCEPTED') THEN 1 END) AS upcoming_exams
//       FROM exam_requests
//       WHERE student_id = ?
//       `,
//       [profile.student_id]
//     );

//     const stats = statsRows[0];

//     return res.status(200).json({
//       profile: {
//         first_name: profile.first_name,
//         last_name: profile.last_name,
//         email: profile.email,
//         phone: profile.phone,
//         state: profile.state,
//         district: profile.district,
//         city: profile.city,
//         pincode: profile.pincode,
//         highest_qualification: profile.highest_qualification,
//         current_class_year: profile.current_class_year,
//         disability_type: profile.disability_type,
//         profile_image_url: profile.profile_image_url,
//         aadhaar_card_url: profile.aadhaar_card_url,
//         joined_at: profile.created_at
//       },
//       stats: {
//         total_exams: stats.total_exams,
//         upcoming_exams: stats.upcoming_exams
//       }
//     });

//   } catch (err) {
//     console.error("Get student profile error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   } finally {
//     conn.release();
//   }
// };

// export const submitFeedback = async (req, res) => {
//   const conn = await pool.getConnection();

//   try {
//     const userId = req.user.user_id;
//     const { examRequestId, stars, review } = req.body;

//     if (!examRequestId || !stars || stars < 1 || stars > 5) {
//       return res.status(400).json({ message: "Invalid input" });
//     }

//     const [students] = await conn.execute(
//       "SELECT id FROM students WHERE user_id = ?",
//       [userId]
//     );

//     if (!students.length) return res.status(403).json({ message: "Student not found" });
//     const studentId = students[0].id;

//     const [requests] = await conn.execute(
//       `SELECT er.id, er.status, er.accepted_scribe_id, er.student_name, er.scribe_name
//        FROM exam_requests er
//        WHERE er.id = ? AND er.student_id = ?`,
//       [examRequestId, studentId]
//     );

//     if (!requests.length) return res.status(404).json({ message: "Exam request not found" });
//     const request = requests[0];

//     if (request.status !== "COMPLETED") {
//       return res.status(400).json({ message: "Feedback allowed only after exam completion" });
//     }

//     if (!request.accepted_scribe_id) {
//       return res.status(400).json({ message: "No scribe assigned for this exam" });
//     }

//     const [existing] = await conn.execute(
//       "SELECT id FROM ratings WHERE exam_request_id = ?",
//       [examRequestId]
//     );

//     if (existing.length) return res.status(409).json({ message: "Feedback already submitted" });

//     await conn.beginTransaction();

//     await conn.execute(
//       `INSERT INTO ratings (exam_request_id, student_id, scribe_id, student_name, scribe_name, stars, review)
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [examRequestId, studentId, request.accepted_scribe_id, request.student_name, request.scribe_name, stars, review || null]
//     );

//     await conn.execute(
//       `UPDATE scribes
//        SET avg_rating = ((avg_rating * total_ratings) + ?) / (total_ratings + 1),
//            total_ratings = total_ratings + 1
//        WHERE id = ?`,
//       [stars, request.accepted_scribe_id]
//     );

//     await conn.commit();

//     return res.status(201).json({ message: "Feedback submitted successfully" });

//   } catch (err) {
//     if (conn) await conn.rollback();
//     console.error("Submit feedback error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   } finally {
//     conn.release();
//   }
// };


//////////////////////////////////////////////////////////////////////////////////////////
import crypto from "crypto";
import { pool } from "../config/db.js";
// import { sendMail } from "../../utils/sendMail.js"; // 🔴 EMAIL DISABLED TO PREVENT TIMEOUTS

// Ensure 'INCOMPLETE' is allowed
const ALLOWED_STATUSES = ["INCOMPLETE", "OPEN", "ACCEPTED", "COMPLETED", "TIMED_OUT"];

export const createExamRequest = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const userId = req.user.user_id;
    let { date, time, state, district, city, language } = req.body;

    if (!date || !state || !district || !city || !time || !language) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    state = state.trim().toLowerCase();
    district = district.trim().toLowerCase();
    city = city.trim();
    language = language.trim().toLowerCase();

    const examDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (examDate < today) {
      return res.status(400).json({ message: "Exam date must be today or in the future" });
    }

    // 🟢 1. Check for Scribes FIRST (Before creating DB entry)
    const [scribes] = await conn.execute(
      `SELECT s.id AS scribe_id, u.first_name, u.last_name, u.state, u.district, s.avg_rating, s.total_ratings
       FROM scribes s
       JOIN users u ON u.id = s.user_id
       JOIN scribe_languages sl ON s.id = sl.scribe_id
       WHERE s.is_verified = TRUE
       AND u.state = ?
       AND u.district = ?
       AND sl.language = ?
       AND s.id NOT IN (SELECT scribe_id FROM scribe_unavailability WHERE date = ?)
       LIMIT 10`,
      [state, district, language, date]
    );

    if (scribes.length === 0) {
      conn.release();
      return res.status(404).json({ message: "No verified scribes found for this location and language." });
    }

    const [students] = await conn.execute("SELECT id FROM students WHERE user_id = ?", [userId]);
    if (!students.length) {
      return res.status(403).json({ message: "Student not found" });
    }
    const studentId = students[0].id;

    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO exam_requests
        (student_id, student_name, exam_date, exam_time, state, district, city, language, status)
        VALUES (?, 'Student', ?, ?, ?, ?, ?, ?, 'INCOMPLETE')`,
      [studentId, date, time || null, state, district, city, language]
    );

    const examRequestId = result.insertId;

    await conn.commit();

    return res.status(201).json({
      message: "Exam request created",
      exam_request_id: examRequestId,
      scribes 
    });

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Create request error:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) conn.release();
  }
};

export const loadScribes = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const { examRequestId, page = 1 } = req.query;
    const limit = 5;
    const pageNum = Number(page);

    if (!examRequestId) return res.status(400).json({ message: "Request ID required" });

    const [requests] = await conn.execute(
      `SELECT state, district, exam_date, language FROM exam_requests WHERE id = ?`,
      [examRequestId]
    );

    if (!requests.length) return res.status(404).json({ message: "Request not found" });

    let { state, district, exam_date, language } = requests[0];
    state = state.trim().toLowerCase();
    district = district.trim().toLowerCase();
    language = language.trim().toLowerCase();

    const examDate = exam_date instanceof Date ? exam_date.toISOString().slice(0, 10) : exam_date;
    const offset = (pageNum - 1) * limit;

    const query = `
      SELECT s.id AS scribe_id, u.first_name, u.last_name, u.state, u.district, u.city, s.avg_rating, s.total_ratings,
        CASE 
          WHEN LOWER(TRIM(u.district)) = ? THEN 1
          ELSE 2
        END AS priority
      FROM scribes s
      JOIN users u ON u.id = s.user_id
      JOIN scribe_languages sl ON s.id = sl.scribe_id
      WHERE s.is_verified = TRUE
        AND LOWER(TRIM(u.state)) = ?
        AND sl.language = ?
        AND s.id NOT IN (SELECT scribe_id FROM scribe_unavailability WHERE date = ?)
      ORDER BY priority ASC, s.avg_rating DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `;

    const [rows] = await conn.execute(query, [district, state, language, examDate]);
    const has_more = rows.length > limit;
    const scribes = has_more ? rows.slice(0, limit) : rows;

    return res.status(200).json({ page: pageNum, scribes, has_more });

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
    const limit = 5; 
    const pageNum = Number(page);
    const offset = (pageNum - 1) * limit;

    if (status && !ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid status filter" });
    }

    const [students] = await conn.execute("SELECT id FROM students WHERE user_id = ?", [userId]);
    if (!students.length) return res.status(403).json({ message: "Student not found" });
    const studentId = students[0].id;

    let query = `
      SELECT er.id, er.exam_date, er.exam_time, er.state, er.district, er.city, er.status, 
        er.accepted_scribe_id, er.scribe_name, er.created_at,
        CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_rated
      FROM exam_requests er
      LEFT JOIN ratings r ON er.id = r.exam_request_id AND r.student_id = er.student_id
      WHERE er.student_id = ? 
      AND er.status != 'INCOMPLETE'
    `;

    const params = [studentId];

    if (status) {
      query += ` AND er.status = ?`;
      params.push(status);
    }

    query += `
      ORDER BY 
      CASE er.status
        WHEN 'ACCEPTED' THEN 1
        WHEN 'OPEN' THEN 2
        WHEN 'COMPLETED' THEN 3
        WHEN 'TIMED_OUT' THEN 4
        ELSE 5
      END ASC, er.created_at DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `;

    const [rows] = await conn.execute(query, params);
    const has_more = rows.length > limit;
    const requests = has_more ? rows.slice(0, limit) : rows;

    return res.status(200).json({ page: pageNum, requests, has_more });

  } catch (err) {
    console.error("Get requests error:", err);
    return res.status(500).json({ message: "Internal server error" });
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
      return res.status(400).json({ message: "examRequestId and scribeIds are required" });
    }

    const [students] = await conn.execute(
      `SELECT s.id FROM students s JOIN users u ON s.user_id = u.id WHERE s.user_id = ?`,
      [userId]  
    );

    if (!students.length) {
      return res.status(403).json({ message: "Student not found" });
    }
    const studentId = students[0].id;

    const [requests] = await conn.execute(
      `SELECT id, status FROM exam_requests WHERE id = ? AND student_id = ?`,
      [examRequestId, studentId]
    );

    if (!requests.length) {
      return res.status(404).json({ message: "Exam request not found" });
    }

    const currentStatus = requests[0].status;

    if (currentStatus !== "OPEN" && currentStatus !== "INCOMPLETE") {
      return res.status(400).json({ message: "Request is no longer valid" });
    }

    // 🟢 FIX FOR CRASH: Filter out scribes who are ALREADY invited
    // This subquery `NOT IN (...)` ensures we never try to insert a duplicate key.
    const [scribes] = await conn.execute(
      `SELECT s.id AS scribe_id, u.email
       FROM scribes s
       JOIN users u ON u.id = s.user_id
       WHERE s.id IN (${scribeIds.map(() => "?").join(",")})
       AND s.is_verified = TRUE
       AND s.id NOT IN (
          SELECT scribe_id FROM request_invites WHERE exam_request_id = ?
       )`,
      [...scribeIds, examRequestId] 
    );

    // If everyone selected was already invited, we can just return success without crashing
    if (scribes.length === 0) {
      return res.status(200).json({ message: "Invites already sent to selected scribes" });
    }

    await conn.beginTransaction();

    // Insert ONLY the new scribes found above
    for (const scribe of scribes) {
      const token = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO request_invites
         (exam_request_id, scribe_id, token, expires_at)
         VALUES (?, ?, ?, NOW() + INTERVAL 24 HOUR)`,
        [examRequestId, scribe.scribe_id, token]
      );

      /* 🔴 EMAIL DISABLED
      try {
        await sendMail({ to: scribe.email, subject: `New Request`, html: `<p>...</p>` });
      } catch (e) { console.error("Email failed but continuing", e); }
      */
    }

    if (currentStatus === "INCOMPLETE") {
      await conn.execute(
        `UPDATE exam_requests SET status = 'OPEN' WHERE id = ?`,
        [examRequestId]
      );
    }

    await conn.commit();

    return res.status(200).json({ message: "Invitations sent successfully" });

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Send request error:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
};

export const getStudentProfile = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const userId = req.user.user_id;

    const [profileRows] = await conn.execute(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.email, u.phone, u.state, u.district, u.city, u.pincode, 
        u.highest_qualification, u.current_class_year, u.profile_image_url, u.aadhaar_card_url, s.id AS student_id, 
        s.disability_type, u.created_at
      FROM users u JOIN students s ON s.user_id = u.id WHERE u.id = ?`,
      [userId]
    );

    if (!profileRows.length) return res.status(404).json({ message: "Student profile not found" });
    const profile = profileRows[0];

    const [statsRows] = await conn.execute(
      `SELECT COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS total_exams,
        COUNT(CASE WHEN status IN ('OPEN', 'ACCEPTED') THEN 1 END) AS upcoming_exams
      FROM exam_requests WHERE student_id = ?`,
      [profile.student_id]
    );
    const stats = statsRows[0];

    return res.status(200).json({
      profile: {
        first_name: profile.first_name, last_name: profile.last_name, email: profile.email, phone: profile.phone,
        state: profile.state, district: profile.district, city: profile.city, pincode: profile.pincode,
        highest_qualification: profile.highest_qualification, current_class_year: profile.current_class_year,
        disability_type: profile.disability_type, profile_image_url: profile.profile_image_url,
        aadhaar_card_url: profile.aadhaar_card_url, joined_at: profile.created_at
      },
      stats: { total_exams: stats.total_exams, upcoming_exams: stats.upcoming_exams }
    });

  } catch (err) {
    console.error("Get student profile error:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
};

export const submitFeedback = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const userId = req.user.user_id;
    const { examRequestId, stars, review } = req.body;

    if (!examRequestId || !stars || stars < 1 || stars > 5) return res.status(400).json({ message: "Invalid input" });

    const [students] = await conn.execute("SELECT id FROM students WHERE user_id = ?", [userId]);
    if (!students.length) return res.status(403).json({ message: "Student not found" });
    const studentId = students[0].id;

    const [requests] = await conn.execute(
      `SELECT er.id, er.status, er.accepted_scribe_id, er.student_name, er.scribe_name FROM exam_requests er WHERE er.id = ? AND er.student_id = ?`,
      [examRequestId, studentId]
    );

    if (!requests.length) return res.status(404).json({ message: "Exam request not found" });
    const request = requests[0];

    if (request.status !== "COMPLETED") return res.status(400).json({ message: "Feedback allowed only after exam completion" });
    if (!request.accepted_scribe_id) return res.status(400).json({ message: "No scribe assigned for this exam" });

    const [existing] = await conn.execute("SELECT id FROM ratings WHERE exam_request_id = ?", [examRequestId]);
    if (existing.length) return res.status(409).json({ message: "Feedback already submitted" });

    await conn.beginTransaction();

    await conn.execute(
      `INSERT INTO ratings (exam_request_id, student_id, scribe_id, student_name, scribe_name, stars, review) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [examRequestId, studentId, request.accepted_scribe_id, request.student_name, request.scribe_name, stars, review || null]
    );

    await conn.execute(
      `UPDATE scribes SET avg_rating = ((avg_rating * total_ratings) + ?) / (total_ratings + 1), total_ratings = total_ratings + 1 WHERE id = ?`,
      [stars, request.accepted_scribe_id]
    );

    await conn.commit();
    return res.status(201).json({ message: "Feedback submitted successfully" });

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Submit feedback error:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
};