const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();


// =====================================================
// GET ALL SUBJECTS
// GET /api/subjects
// =====================================================

router.get("/", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        subject_code,
        subject_name,
        faculty_name
      FROM subjects
      ORDER BY subject_code
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);

  } catch (error) {

    console.error(
      "Get subjects error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load subjects",
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
// GET SINGLE SUBJECT
// GET /api/subjects/:subjectCode
// =====================================================

router.get("/:subjectCode", async (req, res) => {
  let connection;

  try {
    const subjectCode =
      req.params.subjectCode.trim();

    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        subject_code,
        subject_name,
        faculty_name
      FROM subjects
      WHERE UPPER(subject_code) =
            UPPER(:subjectCode)
      `,
      {
        subjectCode,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    return res.json(result.rows[0]);

  } catch (error) {

    console.error(
      "Get subject error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load subject",
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
// ADD SUBJECT
// POST /api/subjects
// =====================================================

router.post("/", async (req, res) => {
  let connection;

  try {
    const {
      subjectCode,
      subjectName,
      facultyName,
    } = req.body;

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (
      !subjectCode?.trim() ||
      !subjectName?.trim()
    ) {
      return res.status(400).json({
        error:
          "Subject code and subject name are required",
      });
    }

    const cleanCode =
      subjectCode.trim().toUpperCase();

    const cleanName =
      subjectName.trim();

    const cleanFaculty =
      facultyName?.trim() || null;

    connection = await getConnection();


    // -------------------------------------------------
    // CHECK DUPLICATE SUBJECT CODE
    // -------------------------------------------------

    const existing =
      await connection.execute(
        `
        SELECT subject_code
        FROM subjects
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode: cleanCode,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error:
          "Subject code already exists",
      });
    }


    // -------------------------------------------------
    // INSERT SUBJECT
    // -------------------------------------------------

    await connection.execute(
      `
      INSERT INTO subjects (
        subject_code,
        subject_name,
        faculty_name
      )
      VALUES (
        :subjectCode,
        :subjectName,
        :facultyName
      )
      `,
      {
        subjectCode: cleanCode,
        subjectName: cleanName,
        facultyName: cleanFaculty,
      }
    );

    await connection.commit();


    return res.status(201).json({
      message:
        "Subject created successfully",

      subject: {
        subjectCode: cleanCode,
        subjectName: cleanName,
        facultyName: cleanFaculty,
      },
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
      "Create subject error:",
      error
    );


    // ORA-00001
    if (error.errorNum === 1) {
      return res.status(409).json({
        error:
          "Subject code already exists",
      });
    }


    return res.status(500).json({
      error:
        "Unable to create subject",

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
// UPDATE SUBJECT
// PUT /api/subjects/:subjectCode
// =====================================================

router.put("/:subjectCode", async (req, res) => {
  let connection;

  try {
    const subjectCode =
      req.params.subjectCode.trim();

    const {
      subjectName,
      facultyName,
    } = req.body;


    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!subjectName?.trim()) {
      return res.status(400).json({
        error:
          "Subject name is required",
      });
    }


    const cleanName =
      subjectName.trim();

    const cleanFaculty =
      facultyName?.trim() || null;


    connection = await getConnection();


    // -------------------------------------------------
    // CHECK SUBJECT EXISTS
    // -------------------------------------------------

    const existing =
      await connection.execute(
        `
        SELECT subject_code
        FROM subjects
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (existing.rows.length === 0) {
      return res.status(404).json({
        error:
          "Subject not found",
      });
    }


    // -------------------------------------------------
    // UPDATE SUBJECT
    // -------------------------------------------------

    await connection.execute(
      `
      UPDATE subjects
      SET
        subject_name = :subjectName,
        faculty_name = :facultyName
      WHERE UPPER(subject_code) =
            UPPER(:subjectCode)
      `,
      {
        subjectName:
          cleanName,

        facultyName:
          cleanFaculty,

        subjectCode,
      }
    );


    await connection.commit();


    return res.json({
      message:
        "Subject updated successfully",

      subject: {
        subjectCode:
          subjectCode.toUpperCase(),

        subjectName:
          cleanName,

        facultyName:
          cleanFaculty,
      },
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
      "Update subject error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to update subject",

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
// DELETE SUBJECT
// DELETE /api/subjects/:subjectCode
// =====================================================

router.delete("/:subjectCode", async (req, res) => {
  let connection;

  try {
    const subjectCode =
      req.params.subjectCode.trim();

    connection = await getConnection();


    // -------------------------------------------------
    // CHECK SUBJECT EXISTS
    // -------------------------------------------------

    const subjectResult =
      await connection.execute(
        `
        SELECT
          subject_code,
          subject_name,
          faculty_name
        FROM subjects
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode,
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


    const subject =
      subjectResult.rows[0];


    // =================================================
    // CHECK ATTENDANCE
    // =================================================

    const attendanceResult =
      await connection.execute(
        `
        SELECT COUNT(*) AS total_count
        FROM attendance
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    const attendance =
      attendanceResult.rows[0]
        .TOTAL_COUNT;


    // =================================================
    // CHECK ASSIGNMENTS
    // =================================================

    const assignmentsResult =
      await connection.execute(
        `
        SELECT COUNT(*) AS total_count
        FROM assignments
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    const assignments =
      assignmentsResult.rows[0]
        .TOTAL_COUNT;


    // =================================================
    // CHECK TIMETABLE
    // =================================================

    const timetableResult =
      await connection.execute(
        `
        SELECT COUNT(*) AS total_count
        FROM timetable
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    const timetable =
      timetableResult.rows[0]
        .TOTAL_COUNT;


    // =================================================
    // CHECK EXAMS
    // =================================================

    const examsResult =
      await connection.execute(
        `
        SELECT COUNT(*) AS total_count
        FROM exams
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    const exams =
      examsResult.rows[0]
        .TOTAL_COUNT;


    // =================================================
    // CHECK ATTENDANCE SESSIONS
    // =================================================

    const sessionsResult =
      await connection.execute(
        `
        SELECT COUNT(*) AS total_count
        FROM attendance_sessions
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    const sessions =
      sessionsResult.rows[0]
        .TOTAL_COUNT;


    // =================================================
    // DON'T DELETE SUBJECT WITH ACADEMIC DATA
    // =================================================

    if (
      attendance > 0 ||
      assignments > 0 ||
      timetable > 0 ||
      exams > 0 ||
      sessions > 0
    ) {

      return res.status(409).json({
        error:
          "Cannot delete this subject because academic records are linked to it.",

        dependencies: {
          attendance,
          assignments,
          timetable,
          exams,
          sessions,
        },
      });

    }


    // -------------------------------------------------
    // DELETE SUBJECT
    // -------------------------------------------------

    await connection.execute(
      `
      DELETE FROM subjects
      WHERE UPPER(subject_code) =
            UPPER(:subjectCode)
      `,
      {
        subjectCode,
      }
    );


    await connection.commit();


    return res.json({
      message:
        "Subject deleted successfully",

      subject: {
        subjectCode:
          subject.SUBJECT_CODE,

        subjectName:
          subject.SUBJECT_NAME,

        facultyName:
          subject.FACULTY_NAME,
      },
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
      "Delete subject error:",
      error
    );


    // Foreign key safety fallback
    if (error.errorNum === 2292) {
      return res.status(409).json({
        error:
          "Cannot delete this subject because other academic records still reference it.",
      });
    }


    return res.status(500).json({
      error:
        "Unable to delete subject",

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