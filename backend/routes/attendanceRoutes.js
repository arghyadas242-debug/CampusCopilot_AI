const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();


// =====================================================
// GET ALL ATTENDANCE RECORDS
// GET /api/attendance
// =====================================================

router.get("/", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        s.name,
        s.student_roll,
        sub.subject_code,
        sub.subject_name,
        a.attended_classes,
        a.total_classes
      FROM attendance a

      JOIN students s
        ON a.student_roll = s.student_roll

      JOIN subjects sub
        ON a.subject_code = sub.subject_code

      ORDER BY
        s.student_roll,
        sub.subject_code
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);

  } catch (error) {

    console.error(
      "Attendance route error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load attendance",
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
// GET SUBJECTS
// GET /api/attendance/subjects
// =====================================================

router.get("/subjects", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        subject_code,
        subject_name
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
      "Load subjects error:",
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
// GET AVAILABLE SECTIONS
// GET /api/attendance/sections
// =====================================================

router.get("/sections", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT DISTINCT section
      FROM students
      WHERE section IS NOT NULL
      ORDER BY section
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);

  } catch (error) {

    console.error(
      "Load sections error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load sections",
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
// GET STUDENTS OF A SECTION
// GET /api/attendance/roster?section=A
// =====================================================

router.get("/roster", async (req, res) => {
  let connection;

  try {
    const section =
      req.query.section?.trim();

    if (!section) {
      return res.status(400).json({
        error: "Section is required",
      });
    }

    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        student_id,
        name,
        student_roll,
        department,
        semester,
        section
      FROM students
      WHERE UPPER(section) =
            UPPER(:section)
      ORDER BY student_roll
      `,
      {
        section,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);

  } catch (error) {

    console.error(
      "Load roster error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load student roster",
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
// MARK ATTENDANCE
// POST /api/attendance/mark
// =====================================================

router.post("/mark", async (req, res) => {
  let connection;

  try {
    const {
      subjectCode,
      section,
      sessionType,
      records,
    } = req.body;

    // ---------------------------------------------
    // VALIDATION
    // ---------------------------------------------

    if (!subjectCode?.trim()) {
      return res.status(400).json({
        error: "Subject code is required",
      });
    }

    if (!section?.trim()) {
      return res.status(400).json({
        error: "Section is required",
      });
    }

    if (!sessionType?.trim()) {
      return res.status(400).json({
        error: "Session type is required",
      });
    }

    if (
      !Array.isArray(records) ||
      records.length === 0
    ) {
      return res.status(400).json({
        error: "Attendance records are required",
      });
    }

    const cleanSubjectCode =
      subjectCode.trim();

    const cleanSection =
      section.trim();

    const cleanSessionType =
      sessionType.trim();

    for (const record of records) {
      if (
        !record.studentRoll?.trim() ||
        !["present", "absent"].includes(record.status)
      ) {
        return res.status(400).json({
          error:
            "Every record must contain a valid studentRoll and status",
        });
      }
    }

    connection = await getConnection();

    // ---------------------------------------------
    // CHECK SUBJECT
    // ---------------------------------------------

    const subjectResult =
      await connection.execute(
        `
        SELECT subject_code
        FROM subjects
        WHERE UPPER(subject_code) =
              UPPER(:subjectCode)
        `,
        {
          subjectCode: cleanSubjectCode,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );

    if (subjectResult.rows.length === 0) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    // ---------------------------------------------
    // CREATE SESSION
    //
    // UNIQUE constraint prevents duplicate
    // subject + section + session type + date
    // ---------------------------------------------

    try {
      await connection.execute(
        `
        INSERT INTO attendance_sessions (
          subject_code,
          section,
          session_type,
          session_date
        )
        VALUES (
          :subjectCode,
          :section,
          :sessionType,
          TRUNC(SYSDATE)
        )
        `,
        {
          subjectCode: cleanSubjectCode,
          section: cleanSection,
          sessionType: cleanSessionType,
        }
      );
    } catch (sessionError) {
      // ORA-00001 = unique constraint violation
      if (sessionError.errorNum === 1) {
        await connection.rollback();

        return res.status(409).json({
          error:
            "Attendance for this subject, section and session has already been submitted today.",
        });
      }

      throw sessionError;
    }

    // ---------------------------------------------
    // UPDATE ATTENDANCE
    // ---------------------------------------------

    for (const record of records) {
      const studentRoll =
        record.studentRoll.trim();

      const presentIncrement =
        record.status === "present"
          ? 1
          : 0;

      await connection.execute(
        `
        MERGE INTO attendance a

        USING (
          SELECT
            :studentRoll AS student_roll,
            :subjectCode AS subject_code
          FROM dual
        ) src

        ON (
          UPPER(a.student_roll) =
            UPPER(src.student_roll)

          AND

          UPPER(a.subject_code) =
            UPPER(src.subject_code)
        )

        WHEN MATCHED THEN
          UPDATE SET

            a.attended_classes =
              NVL(a.attended_classes, 0)
              + :presentIncrement,

            a.total_classes =
              NVL(a.total_classes, 0)
              + 1

        WHEN NOT MATCHED THEN

          INSERT (
            student_roll,
            subject_code,
            attended_classes,
            total_classes
          )

          VALUES (
            :studentRoll,
            :subjectCode,
            :presentIncrement,
            1
          )
        `,
        {
          studentRoll,
          subjectCode: cleanSubjectCode,
          presentIncrement,
        }
      );
    }

    // ---------------------------------------------
    // SAVE SESSION + ATTENDANCE TOGETHER
    // ---------------------------------------------

    await connection.commit();

    return res.json({
      message:
        "Attendance saved successfully",

      subjectCode:
        cleanSubjectCode,

      section:
        cleanSection,

      sessionType:
        cleanSessionType,

      studentsUpdated:
        records.length,
    });

  } catch (error) {

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Attendance rollback error:",
          rollbackError
        );
      }
    }

    console.error(
      "Mark attendance error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to save attendance",

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
// GET ATTENDANCE OF ONE STUDENT
// GET /api/attendance/:studentRoll
//
// IMPORTANT:
// Keep this AFTER /subjects, /sections and /roster.
// =====================================================

router.get("/:studentRoll", async (req, res) => {
  let connection;

  try {
    const studentRoll =
      req.params.studentRoll;

    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        s.name,
        s.student_roll,
        sub.subject_code,
        sub.subject_name,
        a.attended_classes,
        a.total_classes
      FROM attendance a

      JOIN students s
        ON a.student_roll =
           s.student_roll

      JOIN subjects sub
        ON a.subject_code =
           sub.subject_code

      WHERE s.student_roll =
            :studentRoll

      ORDER BY
        sub.subject_code
      `,
      {
        studentRoll,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);

  } catch (error) {

    console.error(
      "Student attendance error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to load student attendance",

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