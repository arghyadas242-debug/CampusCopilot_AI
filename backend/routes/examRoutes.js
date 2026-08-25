const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

const DEFAULT_EXAMS = [
  {
    ID: 1,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS301",
    SUBJECT_NAME: "Database Management Systems",
    FACULTY_NAME: "Prof. Alan Turing",
    EXAM_DATE: "12-09-2026",
    START_TIME: "10:00 AM",
    END_TIME: "01:00 PM",
    ROOM: "Hall A (Room 302)",
    EXAM_TYPE: "End-Semester Theory",
  },
  {
    ID: 2,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS302",
    SUBJECT_NAME: "Computer Networks",
    FACULTY_NAME: "Dr. Grace Hopper",
    EXAM_DATE: "15-09-2026",
    START_TIME: "02:00 PM",
    END_TIME: "05:00 PM",
    ROOM: "Hall B (Room 105)",
    EXAM_TYPE: "End-Semester Theory",
  },
  {
    ID: 3,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS303",
    SUBJECT_NAME: "Operating Systems",
    FACULTY_NAME: "Dr. Linus Torvalds",
    EXAM_DATE: "18-09-2026",
    START_TIME: "10:00 AM",
    END_TIME: "01:00 PM",
    ROOM: "Lab 3",
    EXAM_TYPE: "Practical Assessment",
  },
];

// GET exams for one student
router.get("/:studentRoll", async (req, res) => {
  let connection;

  try {
    const studentRoll = req.params.studentRoll;
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        e.id,
        e.student_roll,
        e.subject_code,
        s.subject_name,
        s.faculty_name,
        TO_CHAR(e.exam_date, 'DD-MM-YYYY') AS exam_date,
        e.start_time,
        e.end_time,
        e.room,
        e.exam_type
      FROM exams e
      JOIN subjects s
        ON e.subject_code = s.subject_code
      WHERE e.student_roll = :studentRoll
      ORDER BY e.exam_date
      `,
      { studentRoll },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    if (result.rows && result.rows.length > 0) {
      return res.json(result.rows);
    }
    return res.json(DEFAULT_EXAMS);
  } catch (error) {
    console.warn("Exam route using fallback exams:", error.message);
    res.json(DEFAULT_EXAMS);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

module.exports = router;