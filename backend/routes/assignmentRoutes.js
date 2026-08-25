const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();


// GET assignments for one student
// Example:
// GET http://localhost:5000/api/assignments/12024002037008
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
        s.subject_name,
        a.title,
        a.description,
        TO_CHAR(a.due_date, 'DD-MM-YYYY') AS due_date,
        a.priority,
        a.status
      FROM assignments a
      JOIN subjects s
        ON a.subject_code = s.subject_code
      WHERE a.student_roll = :studentRoll
      ORDER BY a.due_date
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
    console.error("Assignment route error:", error);

    res.status(500).json({
      error: "Unable to load assignments",
      details: error.message
    });

  } finally {
    if (connection) {
      await connection.close();
    }
  }
});


// UPDATE assignment status
// PATCH /api/assignments/1/status
router.patch("/:id/status", async (req, res) => {
  let connection;

  try {
    const assignmentId = Number(req.params.id);
    const { status } = req.body;

    if (!["pending", "completed"].includes(status)) {
      return res.status(400).json({
        error: "Status must be pending or completed"
      });
    }

    connection = await getConnection();

    const result = await connection.execute(
      `
      UPDATE assignments
      SET status = :status
      WHERE id = :id
      `,
      {
        status,
        id: assignmentId
      },
      {
        autoCommit: true
      }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        error: "Assignment not found"
      });
    }

    res.json({
      message: "Assignment status updated successfully",
      status
    });

  } catch (error) {
    console.error("Assignment update error:", error);

    res.status(500).json({
      error: "Unable to update assignment",
      details: error.message
    });

  } finally {
    if (connection) {
      await connection.close();
    }
  }
});


module.exports = router;