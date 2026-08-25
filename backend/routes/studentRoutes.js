const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

// =====================================================
// SEARCH STUDENT BY ROLL OR NAME
// GET /api/students/search?q=...
// =====================================================
router.get("/search", async (req, res) => {
  let connection;

  try {
    const query = req.query.q?.trim();

    if (!query) {
      return res.status(400).json({
        error: "Search value is required",
      });
    }

    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        s.id AS student_id,
        u.name,
        u.email,
        s.roll_number AS student_roll,
        s.department,
        s.semester,
        s.section
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE LOWER(s.roll_number) = LOWER(:exactValue)
         OR LOWER(u.name) LIKE LOWER(:searchValue)
         OR LOWER(s.roll_number) LIKE LOWER(:searchValue)
      ORDER BY
        CASE
          WHEN LOWER(s.roll_number) = LOWER(:exactValue)
          THEN 0
          ELSE 1
        END,
        u.name
      FETCH FIRST 10 ROWS ONLY
      `,
      {
        exactValue: query,
        searchValue: `%${query}%`,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Student search error:", error);

    res.status(500).json({
      error: "Unable to search students",
      details: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

// =====================================================
// UPDATE STUDENT
// PUT /api/students/:studentRoll
// =====================================================
router.put("/:studentRoll", async (req, res) => {
  let connection;

  try {
    const studentRoll = req.params.studentRoll;

    const {
      name,
      fullName,
      email,
      department,
      semester,
      section,
    } = req.body;

    const studentName = name || fullName;

    if (!studentName || !email) {
      return res.status(400).json({
        error: "Name and email are required",
      });
    }

    connection = await getConnection();

    // Find current student first
    const existingResult = await connection.execute(
      `
      SELECT
        s.id AS student_id,
        s.user_id,
        u.name,
        u.email,
        s.roll_number AS student_roll
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.roll_number = :studentRoll
      `,
      {
        studentRoll,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    const oldStudent = existingResult.rows[0];

    // Update STUDENTS
    await connection.execute(
      `
      UPDATE students
      SET
        department = :department,
        semester = :semester,
        section = :section
      WHERE roll_number = :studentRoll
      `,
      {
        department: department || null,
        semester: semester ? String(semester) : null,
        section: section || null,
        studentRoll,
      },
      { autoCommit: false }
    );

    // Keep USERS in sync
    await connection.execute(
      `
      UPDATE users
      SET
        name = :name,
        email = :newEmail
      WHERE id = :userId
      `,
      {
        name: studentName,
        newEmail: email,
        userId: oldStudent.USER_ID,
      },
      { autoCommit: false }
    );

    await connection.commit();

    res.json({
      message: "Student updated successfully",
      student: {
        studentRoll,
        name: studentName,
        email,
        department,
        semester,
        section,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (e) {}
    }

    console.error("Student update error:", error);

    res.status(500).json({
      error: "Unable to update student",
      details: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

// List all students
router.get("/", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT u.id, u.name, u.email, s.roll_number, s.department, s.semester, s.section, s.phone, s.status
       FROM STUDENTS s
       JOIN USERS u ON s.user_id = u.id
       ORDER BY s.roll_number ASC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const students = result.rows.map((row) => ({
      id: row.ID,
      name: row.NAME,
      email: row.EMAIL,
      rollNumber: row.ROLL_NUMBER,
      department: row.DEPARTMENT,
      semester: row.SEMESTER,
      section: row.SECTION,
      phone: row.PHONE,
      status: row.STATUS,
    }));

    res.json({ students });
  } catch (err) {
    console.error("Fetch Students Error:", err);
    res.status(500).json({ error: "Failed to fetch student directory. " + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

module.exports = router;
