const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

// =====================================================
// UPDATE STUDENT ASSIGNMENT STATUS
//
// PATCH /api/assignments/:id/status
// =====================================================

router.patch("/:id/status", async (req, res) => {
  let connection;

  try {
    const assignmentId =
      Number(req.params.id);

    if (
      !Number.isInteger(assignmentId) ||
      assignmentId <= 0
    ) {
      return res.status(400).json({
        error:
          "Invalid assignment ID",
      });
    }

    const status =
      String(
        req.body?.status || ""
      )
        .trim()
        .toLowerCase();

    if (
      ![
        "pending",
        "completed",
        "submitted",
      ].includes(status)
    ) {
      return res.status(400).json({
        error:
          "Invalid assignment status",
      });
    }

    connection =
      await getConnection();

    const result =
      await connection.execute(
        `
        UPDATE assignments
        SET status = :status
        WHERE id = :assignmentId
        `,
        {
          status,

          assignmentId,
        }
      );

    if (
      result.rowsAffected === 0
    ) {
      await connection.rollback();

      return res.status(404).json({
        error:
          "Assignment not found",
      });
    }

    await connection.commit();

    return res.json({
      message:
        "Assignment status updated successfully",

      assignmentId,

      status,
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Assignment rollback error:",
          rollbackError
        );
      }
    }

    console.error(
      "Update assignment status error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to update assignment status",

      details:
        error.message,
    });

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Connection close error:",
          closeError
        );
      }
    }
  }
});

// =====================================================
// GET REAL ASSIGNMENTS FOR ONE STUDENT
//
// GET /api/assignments/:studentRoll
//
// KEEP THIS DYNAMIC ROUTE LAST.
// =====================================================

router.get("/:studentRoll", async (req, res) => {
  let connection;

  try {
    const studentRoll =
      String(
        req.params.studentRoll ||
          ""
      ).trim();

    if (!studentRoll) {
      return res.status(400).json({
        error:
          "Student roll number is required",
      });
    }

    connection =
      await getConnection();

    const result =
      await connection.execute(
        `
        SELECT
          a.id,
          a.student_roll,
          a.subject_code,
          s.subject_name,
          a.title,
          a.description,
          a.due_date,
          a.priority,
          a.status

        FROM assignments a

        LEFT JOIN subjects s
          ON UPPER(a.subject_code) =
             UPPER(s.subject_code)

        WHERE UPPER(a.student_roll) =
              UPPER(:studentRoll)

        ORDER BY
          CASE
            WHEN LOWER(a.status) =
                 'pending'
            THEN 0
            ELSE 1
          END,

          a.due_date,

          a.id
        `,
        {
          studentRoll,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );

    return res.json(
      result.rows
    );

  } catch (error) {
    console.error(
      "Student assignments error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to load assignments",

      details:
        error.message,
    });

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Connection close error:",
          closeError
        );
      }
    }
  }
});

module.exports = router;
