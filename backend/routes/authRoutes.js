const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");

const getConnection = require("../db");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();


// Convert values such as "5" or "Semester 5" into 5
function normalizeSemester(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const match = String(value).match(/\d+/);

  return match ? Number(match[0]) : null;
}


// Convert "Section A" into "A"
function normalizeSection(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/^Section\s+/i, "")
    .trim();
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
      error:
        "Name, email, password, and roll number are required.",
    });
  }

  let connection;

  try {
    connection = await getConnection();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRoll = String(rollNumber).trim();
    const normalizedSemester = normalizeSemester(semester);
    const normalizedSection = normalizeSection(section);

    // --------------------------------------------------
    // Check whether email already exists in USERS
    // --------------------------------------------------

    const existingUser = await connection.execute(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = :email
      `,
      {
        email: normalizedEmail,
      }
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }


    // --------------------------------------------------
    // Check whether email or roll already exists
    // in STUDENTS
    // --------------------------------------------------

    const existingStudent = await connection.execute(
      `
      SELECT student_id
      FROM students
      WHERE LOWER(email) = :email
         OR student_roll = :studentRoll
      `,
      {
        email: normalizedEmail,
        studentRoll: normalizedRoll,
      }
    );

    if (existingStudent.rows.length > 0) {
      return res.status(409).json({
        error:
          "A student with this email or roll number already exists.",
      });
    }


    // --------------------------------------------------
    // Hash password
    // --------------------------------------------------

    const hashedPassword = await bcrypt.hash(password, 10);


    // --------------------------------------------------
    // Insert authentication account into USERS
    // --------------------------------------------------

    const userResult = await connection.execute(
      `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role
      )
      VALUES (
        :name,
        :email,
        :passwordHash,
        'student'
      )
      RETURNING id INTO :id
      `,
      {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,

        id: {
          type: oracledb.NUMBER,
          dir: oracledb.BIND_OUT,
        },
      },
      {
        autoCommit: false,
      }
    );

    const userId = userResult.outBinds.id[0];


    // --------------------------------------------------
    // Insert student academic profile
    //
    // Actual STUDENTS columns:
    // STUDENT_ID
    // NAME
    // EMAIL
    // DEPARTMENT
    // SEMESTER
    // SECTION
    // STUDENT_ROLL
    // --------------------------------------------------

    await connection.execute(
      `
      INSERT INTO students (
        name,
        email,
        student_roll,
        department,
        semester,
        section
      )
      VALUES (
        :name,
        :email,
        :studentRoll,
        :department,
        :semester,
        :section
      )
      `,
      {
        name: name.trim(),
        email: normalizedEmail,
        studentRoll: normalizedRoll,
        department:
          department || "Computer Science & Engineering",
        semester: normalizedSemester,
        section: normalizedSection || "A",
      },
      {
        autoCommit: false,
      }
    );


    // --------------------------------------------------
    // Save both inserts
    // --------------------------------------------------

    await connection.commit();


    // --------------------------------------------------
    // Generate JWT
    // --------------------------------------------------

    const token = jwt.sign(
      {
        id: userId,
        email: normalizedEmail,
        role: "student",
        name: name.trim(),
        rollNumber: normalizedRoll,
      },
      process.env.JWT_SECRET || "campus_jwt_secret",
      {
        expiresIn: "7d",
      }
    );


    // --------------------------------------------------
    // Response to frontend
    // --------------------------------------------------

    res.status(201).json({
      message: "Student registered successfully!",

      token,

      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        role: "student",
        rollNumber: normalizedRoll,
        department:
          department || "Computer Science & Engineering",
        semester: normalizedSemester,
        section: normalizedSection || "A",
      },
    });

  } catch (err) {

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback Error:",
          rollbackError
        );
      }
    }

    console.error("Register Error:", err);

    res.status(500).json({
      error:
        "Failed to register user. " +
        (err.message || "Unknown database error"),
    });

  } finally {

    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Connection Close Error:",
          closeError
        );
      }
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

  let connection;

  try {
    connection = await getConnection();

    const normalizedEmail = email.trim().toLowerCase();


    // USERS and STUDENTS currently do not have USER_ID
    // relationship, so we connect them using email.
    const userQuery = await connection.execute(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.password_hash,
        u.role,
        s.student_roll,
        s.department,
        s.semester,
        s.section
      FROM users u
      LEFT JOIN students s
        ON LOWER(u.email) = LOWER(s.email)
      WHERE LOWER(u.email) = :email
      `,
      {
        email: normalizedEmail,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );


    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }


    const user = userQuery.rows[0];


    // --------------------------------------------------
    // Compare entered password with bcrypt hash
    // --------------------------------------------------

    const passwordMatch = await bcrypt.compare(
      password,
      user.PASSWORD_HASH
    );


    if (!passwordMatch) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }


    // --------------------------------------------------
    // Create JWT
    // --------------------------------------------------

    const token = jwt.sign(
      {
        id: user.ID,
        email: user.EMAIL,
        role: user.ROLE,
        name: user.NAME,
        rollNumber: user.STUDENT_ROLL || "",
      },
      process.env.JWT_SECRET || "campus_jwt_secret",
      {
        expiresIn: "7d",
      }
    );


    // --------------------------------------------------
    // Send authenticated user
    // --------------------------------------------------

    res.json({
      message: "Login successful!",

      token,

      user: {
        id: user.ID,
        name: user.NAME,
        email: user.EMAIL,
        role: user.ROLE,

        rollNumber:
          user.STUDENT_ROLL ||
          (user.ROLE === "admin" ? "ADMIN" : ""),

        department: user.DEPARTMENT || "",
        semester: user.SEMESTER || "",
        section: user.SECTION || "",
      },
    });

  } catch (err) {

    console.error("Login Error:", err);

    res.status(500).json({
      error:
        "Login failed. " +
        (err.message || "Unknown database error"),
    });

  } finally {

    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Connection Close Error:",
          closeError
        );
      }
    }
  }
});


// ======================================================
// CURRENT LOGGED-IN USER
// GET /api/auth/me
// ======================================================

router.get(
  "/me",
  authenticateToken,
  async (req, res) => {
    res.json({
      user: req.user,
    });
  }
);


module.exports = router;