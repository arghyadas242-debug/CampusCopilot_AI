const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const getConnection = require("../db");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Register new user (Student)
router.post("/register", async (req, res) => {
  const { name, email, password, rollNumber, department, semester, section, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  let connection;
  try {
    connection = await getConnection();

    // Check if user already exists
    const existing = await connection.execute(
      `SELECT id FROM USERS WHERE email = :email`,
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const userResult = await connection.execute(
      `INSERT INTO USERS (name, email, password_hash, role) 
       VALUES (:name, :email, :password_hash, 'student') 
       RETURNING id INTO :id`,
      {
        name,
        email,
        password_hash: hashedPassword,
        id: { type: require("oracledb").NUMBER, dir: require("oracledb").BIND_OUT },
      },
      { autoCommit: false }
    );

    const userId = userResult.outBinds.id[0];

    // If student details provided, create student profile
    const studentRoll = rollNumber || `2026-${Math.floor(1000 + Math.random() * 9000)}`;
    await connection.execute(
      `INSERT INTO STUDENTS (user_id, roll_number, department, semester, section, phone) 
       VALUES (:user_id, :roll_number, :department, :semester, :section, :phone)`,
      {
        user_id: userId,
        roll_number: studentRoll,
        department: department || "Computer Science & Engineering",
        semester: semester || "5",
        section: section || "A",
        phone: phone || "",
      },
      { autoCommit: false }
    );

    // Seed default sample attendance for the student
    const defaultSubjects = [
      { code: "CS301", name: "Database Management Systems", attended: 28, total: 32, faculty: "Prof. Alan Turing" },
      { code: "CS302", name: "Computer Networks", attended: 22, total: 28, faculty: "Dr. Grace Hopper" },
      { code: "CS303", name: "Operating Systems", attended: 20, total: 24, faculty: "Dr. Linus Torvalds" },
      { code: "CS304", name: "Design & Analysis of Algorithms", attended: 18, total: 22, faculty: "Prof. Donald Knuth" },
    ];

    for (const sub of defaultSubjects) {
      await connection.execute(
        `INSERT INTO ATTENDANCE (student_roll, subject_code, subject_name, attended_classes, total_classes, faculty_name)
         VALUES (:roll, :code, :name, :att, :tot, :fac)`,
        {
          roll: studentRoll,
          code: sub.code,
          name: sub.name,
          att: sub.attended,
          tot: sub.total,
          fac: sub.faculty,
        },
        { autoCommit: false }
      );
    }

    await connection.commit();

    const token = jwt.sign(
      { id: userId, email, role: "student", name, rollNumber: studentRoll },
      process.env.JWT_SECRET || "campus_jwt_secret",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Student registered successfully!",
      token,
      user: { id: userId, name, email, role: "student", rollNumber: studentRoll, department, semester, section },
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Register Error:", err);
    res.status(500).json({ error: "Failed to register user. " + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  let connection;
  try {
    connection = await getConnection();

    const userQuery = await connection.execute(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, s.roll_number, s.department, s.semester, s.section
       FROM USERS u
       LEFT JOIN STUDENTS s ON u.id = s.user_id
       WHERE u.email = :email`,
      [email],
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = userQuery.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.PASSWORD_HASH);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      {
        id: user.ID,
        email: user.EMAIL,
        role: user.ROLE,
        name: user.NAME,
        rollNumber: user.ROLL_NUMBER || "",
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
        rollNumber: user.ROLL_NUMBER || "ADMIN",
        department: user.DEPARTMENT || "",
        semester: user.SEMESTER || "",
        section: user.SECTION || "",
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Login failed. " + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

// Current User profile
router.get("/me", authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
