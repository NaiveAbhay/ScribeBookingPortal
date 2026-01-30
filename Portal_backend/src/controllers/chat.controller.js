import { generateStreamToken, streamClient } from "../config/stream.js";
import { pool } from "../config/db.js";

export const getStreamToken = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(400).json({ message: "User ID missing" });

    const token = generateStreamToken(userId.toString());
    res.status(200).json({ token });
  } catch (err) {
    console.error("Error generating Stream token:", err);
    res.status(500).json({ message: "Failed to generate token" });
  }
};

export const getChatParticipants = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { requestId } = req.params;

    // 1. Get the Student and Scribe User IDs from DB
    const [rows] = await conn.execute(
      `SELECT 
         st.user_id AS student_user_id,
         sc.user_id AS scribe_user_id
       FROM exam_requests er
       LEFT JOIN students st ON er.student_id = st.id
       LEFT JOIN scribes sc ON er.accepted_scribe_id = sc.id
       WHERE er.id = ?`,
      [requestId]
    );

    if (!rows.length) return res.status(404).json({ message: "Request not found" });

    const { student_user_id, scribe_user_id } = rows[0];
    
    // Convert to strings for Stream
    const members = [student_user_id?.toString(), scribe_user_id?.toString()].filter(Boolean);

    // 2. CRITICAL FIX: Force-Update the Channel on Stream Server
    // This runs as "Admin" so it ignores permissions and forces the Scribe in.
    if (members.length > 0) {
      try {
        const channel = streamClient.channel('messaging', `exam-${requestId}`, {
          members: members,
          created_by_id: student_user_id?.toString() // Maintain Student as owner
        });
        await channel.create(); 
        await channel.addMembers(members); // Ensure they are added even if channel exists
        console.log(`Synced members for exam-${requestId}:`, members);
      } catch (streamErr) {
        console.error("Stream Admin Update Failed:", streamErr);
        // Continue anyway, frontend might still work if cache is fresh
      }
    }

    return res.status(200).json({ members });

  } catch (err) {
    console.error("Get participants error:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
};