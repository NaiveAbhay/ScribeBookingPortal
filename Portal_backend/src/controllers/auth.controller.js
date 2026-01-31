import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

import {HIGHEST_QUALIFICATIONS,CLASS_YEAR_VALUES,ALLOWED_LANGUAGES,STATES,DISTRICTS} from "../../utils/data.js"
import { upsertStreamUser } from "../config/stream.js";

////////student register///////
export const studentRegister = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    let {
      first_name,
      last_name,
      email,
      phone,
      password,
      state,
      district,
      city,
      pincode,
      profile_image_url,
      aadhaar_card_url,
      disability_type,
      highest_qualification,
      current_class_year
    } = req.body;

    /* required validation */
    if (
      !first_name ||
      !email ||
      !phone ||
      !password ||
      !state ||
      !district ||
      !city ||
      !pincode ||
      !aadhaar_card_url ||
      !disability_type ||
      !highest_qualification||
      !profile_image_url
    )
   {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

    //normalizing inputs
    state = state.trim().toLowerCase();
    district = district.trim().toLowerCase();
    city = city.trim();
    email = email.trim().toLowerCase();
    phone = phone.trim();

    /* Allowed value validation */
    if (!HIGHEST_QUALIFICATIONS.includes(highest_qualification)) {
      return res.status(400).json({
        message: "Invalid highest qualification value"
      });
    }
    
    //State Check
    if(!STATES.includes(state)){
       return res.status(400).json({
          message: "Invalid State"
        });
    }
    //State Check
   if (!Object.hasOwn(DISTRICTS, state)) {
      return res.status(400).json({ message: "Invalid State" });
    }

    //District Check
    if(!DISTRICTS[state].includes(district)){
       return res.status(400).json({
          message: "Invalid District"
        });
    }
  
    await conn.beginTransaction();

    /* 4️⃣ Uniqueness check */
    const [existing] = await conn.execute(
      "SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1",
      [email, phone]
    );
   
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: "Email or phone already registered"
      });
    }

    /* 5️⃣ Hash password */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* 6️⃣ Insert into users */
    const [userResult] = await conn.execute(
      `INSERT INTO users
       (first_name, last_name, email, phone, password_hash, role,
        state, district, city, pincode, profile_image_url,highest_qualification,current_class_year,aadhaar_card_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`,
      [
        first_name,
        last_name ,
        email,
        phone,
        hashedPassword,
        "STUDENT",
        state,
        district,
        city,
        pincode,
        profile_image_url,
        highest_qualification,
        current_class_year,
        aadhaar_card_url
      ]
    );

    const userId = userResult.insertId;
    // REMOVED: const user = userResult[0]; // This was undefined

    /* 7️⃣ Insert into students */
    await conn.execute(
      `INSERT INTO students
       (user_id, disability_type)
       VALUES (?, ?)`,
      [
        userId,
        disability_type
      ]
    );

    await conn.commit();

    try {
          // FIX: Use the variables directly instead of user object
          await upsertStreamUser({
                id: userId.toString(),
                first_name: first_name,
                last_name : last_name,
                email : email,
            });
            console.log('Stream user created successfully for:', userId);
        } catch (err) {
            console.error('Error creating Stream user:', err);
        }

    return res.status(201).json({
      message: "Student registered successfully",
      user_id: userId
    });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({
      message: "Internal server error"
    });
  } finally {
    conn.release();
  }
};


///////scribeRegister////////
export const scribeRegister = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    let {
      first_name,
      last_name,
      email,
      phone,
      password,
      state,
      district,
      city,
      pincode,
      profile_image_url,
      aadhaar_card_url,
      highest_qualification,
      qualification_doc_url,
      languages_known
    } = req.body;

    // ... (Validations are fine) ...
    /* 1️⃣ Required validation */
    if (
      !first_name || !email || !phone || !password || !state || !district ||
      !city || !pincode || !highest_qualification || !qualification_doc_url ||
      !languages_known || !Array.isArray(languages_known) || languages_known.length === 0
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ... (Normalizations are fine) ...
    email = email.trim().toLowerCase();
    phone = phone.trim();
    state = state.trim().toLowerCase();
    district = district.trim().toLowerCase();
    city = city.trim();
    languages_known = languages_known.map(l => l.trim().toLowerCase());

    if (!HIGHEST_QUALIFICATIONS.includes(highest_qualification)) {
      return res.status(400).json({ message: "Invalid highest qualification" });
    }
    if (!DISTRICTS[state]) {
      return res.status(400).json({ message: "Invalid State" });
    }
    if (!DISTRICTS[state].includes(district)) {
      return res.status(400).json({ message: "Invalid District" });
    }
    for (const lang of languages_known) {
      if (!ALLOWED_LANGUAGES.includes(lang)) {
        return res.status(400).json({ message: `Invalid language: ${lang}` });
      }
    }

    const [existing] = await conn.execute(
      "SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1",
      [email, phone]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email or phone already registered" });
    }

    await conn.beginTransaction();

    const hashedPassword = await bcrypt.hash(password, 10);

    /* 8️⃣ Insert into users */
    const [userResult] = await conn.execute(
      `INSERT INTO users
       (first_name, last_name, email, phone, password_hash, role,
        state, district, city, pincode,
        profile_image_url, aadhaar_card_url, highest_qualification)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name || null,
        email,
        phone,
        hashedPassword,
        "SCRIBE",
        state,
        district,
        city,
        pincode,
        profile_image_url || null,
        aadhaar_card_url || null,
        highest_qualification
      ]
    );

    const userId = userResult.insertId;
    // REMOVED: const user= userResult[0]; // This was undefined

    /* 9️⃣ Insert into scribes */
    const [scribeResult] = await conn.execute(
      `INSERT INTO scribes (user_id, qualification_doc_url, is_verified)
       VALUES (?, ?, ?)`,
      [userId, qualification_doc_url, false]
    );

    const scribeId = scribeResult.insertId;

    /* 🔟 Insert scribe languages */
    for (const lang of languages_known) {
      await conn.execute(
        `INSERT INTO scribe_languages (scribe_id, language)
         VALUES (?, ?)`,
        [scribeId, lang]
      );
    }

    await conn.commit();

     try {
          // FIX: Use variables directly
          await upsertStreamUser({
                id: userId.toString(),
                first_name: first_name,
                last_name : last_name,
                email : email,
            });
            console.log('Stream user created successfully for:', userId);
        } catch (err) {
            console.error('Error creating Stream user:', err);
        }

    return res.status(201).json({
      message: "Scribe registered successfully. Awaiting admin verification.",
      user_id: userId,
      scribe_id: scribeId
    });

  } catch (err) {
    await conn.rollback();
    console.error("Scribe register error:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
};

// ... Login and Logout functions are fine as they are ...
// ... imports and register functions remain the same ...

///////login//////////
export const login = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    let { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    identifier = identifier.trim().toLowerCase();
    const isEmail = identifier.includes("@");
    const field = isEmail ? "email" : "phone";

    // --- FIX 1: Select first_name, last_name, and profile_image_url ---
    const [users] = await conn.execute(
      `SELECT id, first_name, last_name, profile_image_url, password_hash, role, is_active
       FROM users
       WHERE ${field} = ? AND is_active = TRUE
       LIMIT 1`,
      [identifier]
    );

    if (!users.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Scribe verification
    if (user.role === "SCRIBE") {
      const [scribe] = await conn.execute(
        "SELECT is_verified FROM scribes WHERE user_id = ?",
        [user.id]
      );

      if (!scribe.length || scribe[0].is_verified === 0) {
        return res.status(403).json({ message: "Scribe not verified yet" });
      }
    }

    const token = jwt.sign(
      { user_id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // --- FIX 2: Return the full user object so Frontend works ---
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        profile_image_url: user.profile_image_url
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
};

// ... logout function remains the same ...

export const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });

  return res.status(200).json({
    message: "Logout successful"
  });
};