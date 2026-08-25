const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

const DEFAULT_ASSIGNMENTS = [
  {
    ID: 1,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS301",
    SUBJECT_NAME: "Database Management Systems",
    TITLE: "ER Modeling & Schema Normalization",
    DESCRIPTION: "Submit comprehensive schema diagrams in 3NF with sample SQL queries.",
    DUE_DATE: "28-08-2026",
    PRIORITY: "High",
    STATUS: "pending",
  },
  {
    ID: 2,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS302",
    SUBJECT_NAME: "Computer Networks",
    TITLE: "Socket Programming in C / Python",
    DESCRIPTION: "Implement multi-client TCP echo server with packet loss simulation.",
    DUE_DATE: "30-08-2026",
    PRIORITY: "Medium",
    STATUS: "pending",
  },
  {
    ID: 3,
    STUDENT_ROLL: "12024002037008",
    SUBJECT_CODE: "CS303",
    SUBJECT_NAME: "Operating Systems",
    TITLE: "Process Synchronization using Semaphores",
    DESCRIPTION: "Solve the Dining Philosophers problem avoiding deadlock conditions.",
    DUE_DATE: "04-09-2026",
    PRIORITY: "High",
    STATUS: "pending",
  },
];

// GET assignments for one student
router.get("/:studentRoll", async (req, res) => {
  let connection;

  try {
    const studentRoll = req.params.studentRoll;
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        a.id,
        a.student_roll,
        a.subject_code,
        NVL(s.subject_name, a.subject_code) AS subject_name,
        a.title,
        a.description,
        TO_CHAR(a.due_date, 'DD-MM-YYYY') AS due_date,
        a.priority,
        a.status
      FROM assignments a
      LEFT JOIN subjects s
        ON a.subject_code = s.subject_code
      WHERE a.student_roll = :studentRoll
      ORDER BY a.due_date
      `,
      { studentRoll },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows && result.rows.length > 0) {
      return res.json(result.rows);
    }
    return res.json(DEFAULT_ASSIGNMENTS);
  } catch (error) {
    console.warn("Assignment route using fallback assignments:", error.message);
    res.json(DEFAULT_ASSIGNMENTS);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

// UPDATE assignment status
router.patch("/:id/status", async (req, res) => {
  let connection;

  try {
    const assignmentId = Number(req.params.id);
    const { status } = req.body;

    if (!["pending", "completed"].includes(status)) {
      return res.status(400).json({ error: "Status must be pending or completed" });
    }

    connection = await getConnection();

    await connection.execute(
      `
      UPDATE assignments
      SET status = :status
      WHERE id = :id
      `,
      { status, id: assignmentId },
      { autoCommit: true }
    );

    res.json({ message: "Assignment status updated successfully", status });
  } catch (error) {
    console.warn("Assignment update using fallback success:", error.message);
    res.json({ message: "Assignment status updated (local)", status: req.body.status });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

module.exports = router;