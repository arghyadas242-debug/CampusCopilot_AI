const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// HELPERS
// =====================================================

function cleanText(value) {
  return String(
    value || ""
  ).trim();
}


function normalizeRole(user) {
  return String(
    user?.role ||
      user?.ROLE ||
      ""
  )
    .trim()
    .toLowerCase();
}


function normalizeRoll(value) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
}


// =====================================================
// SAFE CONNECTION CLOSE
// =====================================================

async function closeConnection(
  connection
) {
  if (!connection) {
    return;
  }


  try {
    await connection.close();

  } catch (error) {
    console.error(
      "Exam connection close error:",
      error
    );
  }
}


// =====================================================
// RESOLVE AUTHENTICATED STUDENT ROLL
// =====================================================

async function getAuthenticatedStudentRoll(
  connection,
  user
) {
  // ---------------------------------------------------
  // PRIMARY LOOKUP: JWT EMAIL
  // ---------------------------------------------------

  const email =
    String(
      user?.email ||
        user?.EMAIL ||
        ""
    )
      .trim()
      .toLowerCase();


  if (email) {
    const result =
      await connection.execute(
        `
        SELECT
          student_roll

        FROM students

        WHERE LOWER(email) =
              :email
        `,
        {
          email,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      result.rows.length >
      0
    ) {
      return cleanText(
        result.rows[0]
          .STUDENT_ROLL
      );
    }
  }


  // ---------------------------------------------------
  // FALLBACK: ROLL STORED IN SIGNED JWT
  // ---------------------------------------------------

  const directRoll =
    user?.rollNumber ||
    user?.studentRoll ||
    user?.student_roll ||
    user?.STUDENT_ROLL ||
    null;


  if (directRoll) {
    const result =
      await connection.execute(
        `
        SELECT
          student_roll

        FROM students

        WHERE UPPER(student_roll) =
              UPPER(:studentRoll)
        `,
        {
          studentRoll:
            cleanText(
              directRoll
            ),
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      result.rows.length >
      0
    ) {
      return cleanText(
        result.rows[0]
          .STUDENT_ROLL
      );
    }
  }


  // ---------------------------------------------------
  // FINAL FALLBACK: USER ID -> STUDENT EMAIL
  // ---------------------------------------------------

  const userId =
    user?.id ??
    user?.userId ??
    user?.user_id ??
    user?.ID ??
    null;


  if (userId !== null) {
    const result =
      await connection.execute(
        `
        SELECT
          s.student_roll

        FROM users u

        JOIN students s
          ON LOWER(s.email) =
             LOWER(u.email)

        WHERE u.id =
              :userId
        `,
        {
          userId,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      result.rows.length >
      0
    ) {
      return cleanText(
        result.rows[0]
          .STUDENT_ROLL
      );
    }
  }


  return "";
}


// =====================================================
// EXAM OWNERSHIP / IDOR CHECK
// =====================================================

async function canReadStudentExams(
  connection,
  req,
  requestedStudentRoll
) {
  const role =
    normalizeRole(
      req.user
    );


  // ---------------------------------------------------
  // ADMIN MAY VIEW ANY STUDENT
  // ---------------------------------------------------

  if (role === "admin") {
    return true;
  }


  // ---------------------------------------------------
  // ONLY STUDENT ACCOUNTS CONTINUE
  // ---------------------------------------------------

  if (role !== "student") {
    return false;
  }


  const authenticatedStudentRoll =
    await getAuthenticatedStudentRoll(
      connection,
      req.user
    );


  if (!authenticatedStudentRoll) {
    return false;
  }


  return (
    normalizeRoll(
      authenticatedStudentRoll
    ) ===
    normalizeRoll(
      requestedStudentRoll
    )
  );
}


// =====================================================
// GET REAL EXAMS FOR ONE STUDENT
//
// GET /api/exams/:studentRoll
//
// ADMIN:
// May read any student's exams.
//
// STUDENT:
// May read only their own exams.
//
// IMPORTANT:
// No mock / fallback exam data is ever returned.
// =====================================================

router.get(
  "/:studentRoll",

  authenticateToken,

  async (req, res) => {
    let connection;


    try {
      const studentRoll =
        cleanText(
          req.params.studentRoll
        );


      if (!studentRoll) {
        return res
          .status(400)
          .json({
            error:
              "Student roll number is required",

            code:
              "STUDENT_ROLL_REQUIRED",
          });
      }


      connection =
        await getConnection();


      // =================================================
      // OWNERSHIP / IDOR CHECK
      // =================================================

      const canAccess =
        await canReadStudentExams(
          connection,
          req,
          studentRoll
        );


      if (!canAccess) {
        return res
          .status(403)
          .json({
            error:
              "You are not authorized to access this student's exams.",

            code:
              "EXAM_RECORD_FORBIDDEN",
          });
      }


      // =================================================
      // VERIFY STUDENT EXISTS
      // =================================================

      const studentResult =
        await connection.execute(
          `
          SELECT
            student_roll

          FROM students

          WHERE UPPER(student_roll) =
                UPPER(:studentRoll)
          `,
          {
            studentRoll,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      if (
        studentResult.rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Student not found",

            code:
              "STUDENT_NOT_FOUND",
          });
      }


      // =================================================
      // LOAD REAL EXAM DATA
      // =================================================

      const result =
        await connection.execute(
          `
          SELECT
            e.id,
            e.student_roll,
            e.subject_code,

            s.subject_name,
            s.faculty_name,

            TO_CHAR(
              e.exam_date,
              'DD-MM-YYYY'
            ) AS exam_date,

            e.start_time,
            e.end_time,
            e.room,
            e.exam_type

          FROM exams e

          LEFT JOIN subjects s
            ON UPPER(
              e.subject_code
            ) =
            UPPER(
              s.subject_code
            )

          WHERE UPPER(
            e.student_roll
          ) =
          UPPER(
            :studentRoll
          )

          ORDER BY
            e.exam_date,
            e.start_time,
            e.id
          `,
          {
            studentRoll,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      // -------------------------------------------------
      // IMPORTANT:
      //
      // No database rows means the student currently
      // has no exam records.
      //
      // Return a REAL empty array.
      // Never invent fallback exams.
      // -------------------------------------------------

      return res.json(
        result.rows || []
      );

    } catch (error) {
      console.error(
        "Student exam route error:",
        error
      );


      // -------------------------------------------------
      // IMPORTANT:
      //
      // Do not hide database/server failures by returning
      // fake exam schedules.
      // -------------------------------------------------

      return res
        .status(500)
        .json({
          error:
            "Unable to load exams",

          code:
            "EXAMS_LOAD_FAILED",
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


module.exports =
  router;