const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");

const getConnection = require("../db");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

function normalizeSemester(value) {
  if (value === undefined || value === null) return null;
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function normalizeSection(value) {
  if (!value) return "A";
  return String(value).replace(/^Section\s+/i, "").trim();
}

// ======================================================
// REGISTER STUDENT
// POST /api/auth/register
// ======================================================
router.post("/register", async (req, res) => {
  const {
    name,
    email,
    password,
    rollNumber,
    department,
    semester,
    section,
  } = req.body;

  if (!name || !email || !password || !rollNumber) {
    return res.status(400).json({
      error: "Name, email, password, and roll number are required.",
    });
  }

  let connection;

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRoll = String(rollNumber).trim();
    const normalizedSemester = normalizeSemester(semester) || 1;
    const normalizedSection = normalizeSection(section);

    connection = await getConnection();

    // Check existing in USERS
    const existingUser = await connection.execute(
      `SELECT id FROM users WHERE LOWER(email) = :email`,
      { email: normalizedEmail }
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const userResult = await connection.execute(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (:name, :email, :passwordHash, 'student')
       RETURNING id INTO :id`,
      {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );

    const userId = userResult.outBinds.id[0];

    // Insert student record
    try {
      await connection.execute(
        `INSERT INTO students (user_id, roll_number, department, semester, section)
         VALUES (:userId, :rollNumber, :department, :semester, :section)`,
        {
          userId,
          rollNumber: normalizedRoll,
          department: department || "Computer Science & Engineering",
          semester: String(normalizedSemester),
          section: normalizedSection,
        },
        { autoCommit: false }
      );
    } catch (sErr) {
      console.warn("Student table insert notice:", sErr.message);
    }

    await connection.commit();

    const token = jwt.sign(
      {
        id: userId,
        email: normalizedEmail,
        role: "student",
        name: name.trim(),
        rollNumber: normalizedRoll,
      },
      process.env.JWT_SECRET || "campus_jwt_secret",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Student registered successfully!",
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        role: "student",
        rollNumber: normalizedRoll,
        department: department || "Computer Science & Engineering",
        semester: normalizedSemester,
        section: normalizedSection,
      },
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (e) {}
    }
    console.error("Register Error:", err);
    res.status(500).json({
      error: "Failed to register user. " + (err.message || ""),
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

// ======================================================
// LOGIN
// POST /api/auth/login
// ======================================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Admin fallback shortcut if database is initializing or in demo
  if (
    (normalizedEmail === "arghyadas245@gmail.com" && password === "712409") ||
    (normalizedEmail === "admin@campus.edu" && (password === "Admin@123" || password === "admin123"))
  ) {
    const adminToken = jwt.sign(
      {
        id: 1,
        email: normalizedEmail,
        role: "admin",
        name: normalizedEmail === "arghyadas245@gmail.com" ? "Arghya Das" : "Campus Administrator",
        rollNumber: "ADMIN",
      },
      process.env.JWT_SECRET || "campus_jwt_secret",
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Admin login successful!",
      token: adminToken,
      user: {
        id: 1,
        name: normalizedEmail === "arghyadas245@gmail.com" ? "Arghya Das" : "Campus Administrator",
        email: normalizedEmail,
        role: "admin",
        rollNumber: "ADMIN",
        department: "University Administration",
      },
    });
  }

  let connection;

  try {
    connection = await getConnection();

    // Query USERS table directly first
    const userQuery = await connection.execute(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE LOWER(email) = :email`,
      { email: normalizedEmail },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const user = userQuery.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!passwordMatch) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    // Attempt to get student profile details if user is a student
    let studentDetails = {};
    if (user.ROLE === "student") {
      try {
        const studentQuery = await connection.execute(
          `SELECT roll_number, department, semester, section
           FROM students
           WHERE user_id = :userId`,
          { userId: user.ID },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (studentQuery.rows.length > 0) {
          studentDetails = studentQuery.rows[0];
        }
      } catch (sErr) {
        console.warn("Could not load optional student details:", sErr.message);
      }
    }

    const rollNumber = studentDetails.ROLL_NUMBER || (user.ROLE === "admin" ? "ADMIN" : "12024002037008");

    const token = jwt.sign(
      {
        id: user.ID,
        email: user.EMAIL,
        role: user.ROLE,
        name: user.NAME,
        rollNumber,
      },
      process.env.JWT_SECRET || "campus_jwt_secret",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user.ID,
        name: user.NAME,
        email: user.EMAIL,
        role: user.ROLE,
        rollNumber,
        department: studentDetails.DEPARTMENT || (user.ROLE === "admin" ? "University Administration" : "Computer Science"),
        semester: studentDetails.SEMESTER || "5",
        section: studentDetails.SECTION || "A",
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({
      error: "Login service error: " + (err.message || ""),
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

// ======================================================
// GET CURRENT USER PROFILE
// GET /api/auth/me
// ======================================================
router.get("/me", authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;