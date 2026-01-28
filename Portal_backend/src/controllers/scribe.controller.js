import { pool } from "../config/db.js";

/**
 * Get Scribe Profile & Stats
 */
export const getScribeProfile = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const userId = req.user.user_id;

        const [profileRows] = await conn.execute(
            `SELECT 
                u.first_name, u.last_name, u.email, u.phone, u.state, u.district, 
                u.city, u.highest_qualification, u.profile_image_url,
                s.id AS scribe_id, s.is_verified, s.avg_rating, s.total_ratings
             FROM users u
             JOIN scribes s ON u.id = s.user_id
             WHERE u.id = ?`,
            [userId]
        );

        if (!profileRows.length) {
            return res.status(404).json({ message: "Scribe profile not found" });
        }

        const profile = profileRows[0];

        // Fetch exam stats for the dashboard
        const [statsRows] = await conn.execute(
            `SELECT 
                COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS total_exams,
                COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END) AS upcoming_exams
             FROM exam_requests 
             WHERE accepted_scribe_id = ?`,
            [profile.scribe_id]
        );

        return res.status(200).json({
            profile,
            stats: statsRows[0]
        });
    } catch (err) {
        console.error("Get scribe profile error:", err);
        return res.status(500).json({ message: "Internal server error" });
    } finally {
        conn.release();
    }
};

/**
 * Accept Exam Request via Token
 * Logic: Validates token -> Checks if Exam is still OPEN -> Updates status & unavailability
 */
export const acceptExamRequest = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Token is required" });
        }

        await conn.beginTransaction();

        // 1. Find and lock the invite
        const [invites] = await conn.execute(
            `SELECT exam_request_id, scribe_id FROM request_invites 
             WHERE token = ? AND used = FALSE AND expires_at > NOW() FOR UPDATE`,
            [token]
        );

        if (!invites.length) {
            await conn.rollback();
            return res.status(400).json({ message: "Invite link is invalid or expired" });
        }

        const { exam_request_id, scribe_id } = invites[0];

        // 2. Check if exam is still OPEN
        const [exams] = await conn.execute(
            `SELECT exam_date, status FROM exam_requests WHERE id = ? FOR UPDATE`,
            [exam_request_id]
        );

        if (!exams.length || exams[0].status !== 'OPEN') {
            await conn.rollback();
            return res.status(400).json({ message: "Exam is no longer available" });
        }

        // 3. Get scribe name for snapshot
        const [user] = await conn.execute(
            `SELECT first_name, last_name FROM users u 
             JOIN scribes s ON s.user_id = u.id WHERE s.id = ?`,
            [scribe_id]
        );
        const scribeName = `${user[0].first_name} ${user[0].last_name}`;

        // 4. Update Exam Request
        await conn.execute(
            `UPDATE exam_requests 
             SET status = 'ACCEPTED', accepted_scribe_id = ?, scribe_name = ?, accepted_at = NOW() 
             WHERE id = ?`,
            [scribe_id, scribeName, exam_request_id]
        );

        // 5. Mark Scribe as Busy
        await conn.execute(
            `INSERT INTO scribe_unavailability (scribe_id, date, reason) 
             VALUES (?, ?, 'EXAM_BOOKED')`,
            [scribe_id, exams[0].exam_date]
        );

        // 6. Mark token as used
        await conn.execute(`UPDATE request_invites SET used = TRUE WHERE token = ?`, [token]);

        await conn.commit();
        return res.status(200).json({ message: "Exam accepted successfully" });

    } catch (err) {
        await conn.rollback();
        console.error("Accept exam error:", err);
        return res.status(500).json({ message: "Internal server error" });
    } finally {
        conn.release();
    }
};

/**
 * Load Students (Assigned Bookings)
 * For the scribe to see who they are helping
 */
export const loadStudents = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const userId = req.user.user_id;
        const { status, page = 1 } = req.query;
        const limit = 10;
        const offset = (Number(page) - 1) * limit;

        const [requests] = await conn.execute(
            `SELECT er.*, u.phone AS student_phone, u.email AS student_email
             FROM exam_requests er
             JOIN students st ON er.student_id = st.id
             JOIN users u ON st.user_id = u.id
             JOIN scribes s ON er.accepted_scribe_id = s.id
             WHERE s.user_id = ? ${status ? 'AND er.status = ?' : ''}
             ORDER BY er.exam_date ASC LIMIT ${limit} OFFSET ${offset}`,
            status ? [userId, status] : [userId]
        );

        return res.status(200).json({ requests, page: Number(page) });
    } catch (err) {
        console.error("Load students error:", err);
        return res.status(500).json({ message: "Internal server error" });
    } finally {
        conn.release();
    }
};

/**
 * Get Scribe Unavailability
 */
export const loadUnavailability = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const userId = req.user.user_id;

        const [rows] = await conn.execute(
            `SELECT su.date, su.reason 
             FROM scribe_unavailability su
             JOIN scribes s ON su.scribe_id = s.id
             WHERE s.user_id = ? AND su.date >= CURDATE()
             ORDER BY su.date ASC`,
            [userId]
        );

        return res.status(200).json({ unavailability: rows });
    } catch (err) {
        console.error("Load unavailability error:", err);
        return res.status(500).json({ message: "Internal server error" });
    } finally {
        conn.release();
    }
};

/**
 * Set Personal Unavailability
 */
export const setUnavailability = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const userId = req.user.user_id;
        const { date, reason = 'PERSONAL' } = req.body;

        if (!date) return res.status(400).json({ message: "Date is required" });

        const [scribes] = await conn.execute("SELECT id FROM scribes WHERE user_id = ?", [userId]);
        
        await conn.execute(
            `INSERT INTO scribe_unavailability (scribe_id, date, reason) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
            [scribes[0].id, date, reason]
        );

        return res.status(200).json({ message: "Availability updated" });
    } catch (err) {
        console.error("Set unavailability error:", err);
        return res.status(500).json({ message: "Internal server error" });
    } finally {
        conn.release();
    }
};