const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

// GET timetable for one student
router.get("/:studentRoll", async (req, res) => {
  let connection;

  try {
    const studentRoll = req.params.studentRoll;

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
      JOIN subjects s
        ON t.subject_code = s.subject_code
      WHERE t.student_roll = :studentRoll
      ORDER BY
        CASE t.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END,
        t.start_time
      `,
      {
        studentRoll
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Timetable route error:", error);

    res.status(500).json({
      error: "Unable to load timetable",
      details: error.message
    });

  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;