const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

router.get("/dashboard", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const statsResult = await connection.execute(
      `
      SELECT
        (SELECT COUNT(*) FROM students) AS total_students,
        (SELECT COUNT(*) FROM subjects) AS total_subjects,
        (
          SELECT COUNT(*)
          FROM assignments
          WHERE LOWER(status) = 'pending'
        ) AS active_assignments,
        (SELECT COUNT(*) FROM notices) AS published_notices
      FROM dual
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    const studentsResult = await connection.execute(
      `
      SELECT
        s.student_id,
        s.name,
        s.student_roll,
        s.department,
        s.semester,
        s.section,
        CASE
          WHEN NVL(SUM(a.total_classes), 0) = 0 THEN 0
          ELSE ROUND(
            (SUM(a.attended_classes) / SUM(a.total_classes)) * 100,
            1
          )
        END AS attendance_percentage
      FROM students s
      LEFT JOIN attendance a
        ON s.student_roll = a.student_roll
      GROUP BY
        s.student_id,
        s.name,
        s.student_roll,
        s.department,
        s.semester,
        s.section
      ORDER BY s.student_id DESC
      FETCH FIRST 5 ROWS ONLY
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    res.json({
      stats: statsResult.rows[0],
      recentStudents: studentsResult.rows,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    res.status(500).json({
      error: "Unable to load admin dashboard",
      details: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;