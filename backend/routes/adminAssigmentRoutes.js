const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();


// =====================================================
// GET ALL ASSIGNMENTS
// GET /api/admin/assignments
// =====================================================

router.get("/", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        a.id,
        a.student_roll,
        s.name AS student_name,
        a.subject_code,
        sub.subject_name,
        a.title,
        a.description,
        a.due_date,
        a.priority,
        a.status
      FROM assignments a

      LEFT JOIN students s
        ON a.student_roll = s.student_roll

      LEFT JOIN subjects sub
        ON a.subject_code = sub.subject_code

      ORDER BY
        a.due_date ASC,
        a.id DESC
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);

  } catch (error) {

    console.error(
      "Admin assignments load error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load assignments",
      details: error.message,
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
// ADD ASSIGNMENT
// POST /api/admin/assignments
// =====================================================

router.post("/", async (req, res) => {
  let connection;

  try {
    const {
      studentRoll,
      subjectCode,
      title,
      description,
      dueDate,
      priority,
      status,
    } = req.body;

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (
      !studentRoll?.trim() ||
      !subjectCode?.trim() ||
      !title?.trim() ||
      !dueDate
    ) {
      return res.status(400).json({
        error:
          "Student, subject, title and due date are required",
      });
    }

    const cleanStudentRoll =
      studentRoll.trim();

    const cleanSubjectCode =
      subjectCode.trim().toUpperCase();

    const cleanTitle =
      title.trim();

    const cleanDescription =
      description?.trim() || null;

    const cleanPriority =
      priority?.trim().toLowerCase() || "medium";

    const cleanStatus =
      status?.trim().toLowerCase() || "pending";


    if (
      !["low", "medium", "high"].includes(
        cleanPriority
      )
    ) {
      return res.status(400).json({
        error:
          "Priority must be low, medium or high",
      });
    }


    if (
      ![
        "pending",
        "completed",
        "submitted",
      ].includes(cleanStatus)
    ) {
      return res.status(400).json({
        error:
          "Invalid assignment status",
      });
    }


    connection = await getConnection();


    // -------------------------------------------------
    // CHECK STUDENT EXISTS
    // -------------------------------------------------

    const studentResult =
      await connection.execute(
        `
        SELECT student_roll
        FROM students
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          studentRoll:
            cleanStudentRoll,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      studentResult.rows.length === 0
    ) {
      return res.status(404).json({
        error: "Student not found",
      });
    }


    // -------------------------------------------------
    // CHECK SUBJECT EXISTS
    // -------------------------------------------------

    const subjectResult =
      await connection.execute(
        `
        SELECT subject_code
        FROM subjects
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode:
            cleanSubjectCode,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      subjectResult.rows.length === 0
    ) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }


    // -------------------------------------------------
    // INSERT ASSIGNMENT
    //
    // ID is omitted so Oracle generates it.
    // -------------------------------------------------

    await connection.execute(
      `
      INSERT INTO assignments (
        student_roll,
        subject_code,
        title,
        description,
        due_date,
        priority,
        status
      )
      VALUES (
        :studentRoll,
        :subjectCode,
        :title,
        :description,
        TO_DATE(:dueDate, 'YYYY-MM-DD'),
        :priority,
        :status
      )
      `,
      {
        studentRoll:
          cleanStudentRoll,

        subjectCode:
          cleanSubjectCode,

        title:
          cleanTitle,

        description:
          cleanDescription,

        dueDate,

        priority:
          cleanPriority,

        status:
          cleanStatus,
      }
    );


    await connection.commit();


    return res.status(201).json({
      message:
        "Assignment created successfully",
    });

  } catch (error) {

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }
    }


    console.error(
      "Create assignment error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to create assignment",

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
// UPDATE ASSIGNMENT
// PUT /api/admin/assignments/:id
// =====================================================

router.put("/:id", async (req, res) => {
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


    const {
      studentRoll,
      subjectCode,
      title,
      description,
      dueDate,
      priority,
      status,
    } = req.body;


    if (
      !studentRoll?.trim() ||
      !subjectCode?.trim() ||
      !title?.trim() ||
      !dueDate
    ) {
      return res.status(400).json({
        error:
          "Student, subject, title and due date are required",
      });
    }


    const cleanPriority =
      priority?.trim().toLowerCase() || "medium";

    const cleanStatus =
      status?.trim().toLowerCase() || "pending";


    if (
      !["low", "medium", "high"].includes(
        cleanPriority
      )
    ) {
      return res.status(400).json({
        error:
          "Priority must be low, medium or high",
      });
    }


    if (
      ![
        "pending",
        "completed",
        "submitted",
      ].includes(cleanStatus)
    ) {
      return res.status(400).json({
        error:
          "Invalid assignment status",
      });
    }


    connection = await getConnection();


    // -------------------------------------------------
    // CHECK ASSIGNMENT EXISTS
    // -------------------------------------------------

    const existing =
      await connection.execute(
        `
        SELECT id
        FROM assignments
        WHERE id = :id
        `,
        {
          id: assignmentId,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      existing.rows.length === 0
    ) {
      return res.status(404).json({
        error:
          "Assignment not found",
      });
    }


    // -------------------------------------------------
    // CHECK STUDENT
    // -------------------------------------------------

    const studentResult =
      await connection.execute(
        `
        SELECT student_roll
        FROM students
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          studentRoll:
            studentRoll.trim(),
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      studentResult.rows.length === 0
    ) {
      return res.status(404).json({
        error:
          "Student not found",
      });
    }


    // -------------------------------------------------
    // CHECK SUBJECT
    // -------------------------------------------------

    const subjectResult =
      await connection.execute(
        `
        SELECT subject_code
        FROM subjects
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode:
            subjectCode.trim(),
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      subjectResult.rows.length === 0
    ) {
      return res.status(404).json({
        error:
          "Subject not found",
      });
    }


    // -------------------------------------------------
    // UPDATE
    // -------------------------------------------------

    await connection.execute(
      `
      UPDATE assignments
      SET
        student_roll = :studentRoll,
        subject_code = :subjectCode,
        title = :title,
        description = :description,
        due_date =
          TO_DATE(:dueDate, 'YYYY-MM-DD'),
        priority = :priority,
        status = :status
      WHERE id = :id
      `,
      {
        studentRoll:
          studentRoll.trim(),

        subjectCode:
          subjectCode
            .trim()
            .toUpperCase(),

        title:
          title.trim(),

        description:
          description?.trim() || null,

        dueDate,

        priority:
          cleanPriority,

        status:
          cleanStatus,

        id:
          assignmentId,
      }
    );


    await connection.commit();


    return res.json({
      message:
        "Assignment updated successfully",
    });

  } catch (error) {

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }
    }


    console.error(
      "Update assignment error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to update assignment",

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
// DELETE ASSIGNMENT
// DELETE /api/admin/assignments/:id
// =====================================================

router.delete("/:id", async (req, res) => {
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


    connection = await getConnection();


    const result =
      await connection.execute(
        `
        DELETE FROM assignments
        WHERE id = :id
        `,
        {
          id: assignmentId,
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
        "Assignment deleted successfully",
    });

  } catch (error) {

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }
    }


    console.error(
      "Delete assignment error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to delete assignment",

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