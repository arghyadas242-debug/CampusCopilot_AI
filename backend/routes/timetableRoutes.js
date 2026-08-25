const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

const DEFAULT_TIMETABLE = [
  {
    ID: 1,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS301",
    SUBJECT_NAME: "Database Management Systems",
    FACULTY_NAME: "Prof. Alan Turing",
    DAY_OF_WEEK: "Monday",
    START_TIME: "09:30 AM",
    END_TIME: "10:30 AM",
    ROOM: "LH-302",
  },
  {
    ID: 2,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS302",
    SUBJECT_NAME: "Computer Networks",
    FACULTY_NAME: "Dr. Grace Hopper",
    DAY_OF_WEEK: "Monday",
    START_TIME: "10:30 AM",
    END_TIME: "11:30 AM",
    ROOM: "LH-302",
  },
  {
    ID: 3,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS303",
    SUBJECT_NAME: "Operating Systems Lab",
    FACULTY_NAME: "Dr. Linus Torvalds",
    DAY_OF_WEEK: "Monday",
    START_TIME: "01:30 PM",
    END_TIME: "03:30 PM",
    ROOM: "Lab 2",
  },
  {
    ID: 4,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS304",
    SUBJECT_NAME: "Design & Analysis of Algorithms",
    FACULTY_NAME: "Prof. Donald Knuth",
    DAY_OF_WEEK: "Tuesday",
    START_TIME: "09:30 AM",
    END_TIME: "10:30 AM",
    ROOM: "LH-301",
  },
  {
    ID: 5,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS301",
    SUBJECT_NAME: "Database Management Systems",
    FACULTY_NAME: "Prof. Alan Turing",
    DAY_OF_WEEK: "Wednesday",
    START_TIME: "10:30 AM",
    END_TIME: "11:30 AM",
    ROOM: "LH-302",
  },
  {
    ID: 6,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS302",
    SUBJECT_NAME: "Computer Networks",
    FACULTY_NAME: "Dr. Grace Hopper",
    DAY_OF_WEEK: "Thursday",
    START_TIME: "11:30 AM",
    END_TIME: "12:30 PM",
    ROOM: "LH-302",
  },
  {
    ID: 7,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS303",
    SUBJECT_NAME: "Operating Systems",
    FACULTY_NAME: "Dr. Linus Torvalds",
    DAY_OF_WEEK: "Friday",
    START_TIME: "09:30 AM",
    END_TIME: "10:30 AM",
    ROOM: "LH-302",
  },
];

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
        NVL(s.subject_name, t.subject_code) AS subject_name,
        NVL(s.faculty_name, 'Faculty') AS faculty_name,
        t.day_of_week,
        t.start_time,
        t.end_time,
        t.room
      FROM timetable t
      LEFT JOIN subjects s
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
      { studentRoll },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows && result.rows.length > 0) {
      return res.json(result.rows);
    }
    return res.json(DEFAULT_TIMETABLE);
  } catch (error) {
    console.warn("Timetable route using fallback timetable:", error.message);
    res.json(DEFAULT_TIMETABLE);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

module.exports = router;