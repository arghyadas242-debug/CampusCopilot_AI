const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

// =====================================================
// GET REAL TIMETABLE FOR ONE STUDENT
// GET /api/timetable/:studentRoll
// =====================================================

router.get("/:studentRoll", async (req, res) => {
  let connection;

  try {
    const studentRoll = String(
      req.params.studentRoll || ""
    ).trim();

    if (!studentRoll) {
      return res.status(400).json({
        error: "Student roll number is required",
      });
    }

    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        t.id,
        t.student_roll,
        t.subject_code,
        s.subject_name,
        s.faculty_name,
        t.day_of_week,
        t.start_time,
        t.end_time,
        t.room
      FROM timetable t
      LEFT JOIN subjects s
        ON UPPER(t.subject_code) =
           UPPER(s.subject_code)
      WHERE UPPER(t.student_roll) =
            UPPER(:studentRoll)
      ORDER BY
        CASE UPPER(t.day_of_week)
          WHEN 'MONDAY' THEN 1
          WHEN 'TUESDAY' THEN 2
          WHEN 'WEDNESDAY' THEN 3
          WHEN 'THURSDAY' THEN 4
          WHEN 'FRIDAY' THEN 5
          WHEN 'SATURDAY' THEN 6
          WHEN 'SUNDAY' THEN 7
          ELSE 8
        END,
        t.start_time,
        t.id
      `,
      { studentRoll },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(
      "Student timetable error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load timetable",
      details: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Timetable connection close error:",
          closeError
        );
      }
    }
  }
});

module.exports = router;
