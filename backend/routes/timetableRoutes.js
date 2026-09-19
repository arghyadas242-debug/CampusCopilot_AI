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
// RESOLVE AUTHENTICATED STUDENT ROLL
// =====================================================

async function getAuthenticatedStudentRoll(
  connection,
  user
) {
  // ---------------------------------------------------
  // PRIMARY LOOKUP: EMAIL FROM JWT
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
  // FALLBACK: STUDENT ROLL STORED IN JWT
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
// TIMETABLE OWNERSHIP CHECK
// =====================================================

async function canReadStudentTimetable(
  connection,
  req,
  requestedStudentRoll
) {
  const role =
    normalizeRole(
      req.user
    );


  // ---------------------------------------------------
  // ADMIN CAN VIEW ANY STUDENT
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
// GET REAL TIMETABLE FOR ONE STUDENT
//
// GET /api/timetable/:studentRoll
//
// ADMIN:
// May view any student's timetable.
//
// STUDENT:
// May view only their own timetable.
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
          });
      }


      connection =
        await getConnection();


      // =================================================
      // OWNERSHIP / IDOR CHECK
      // =================================================

      const canAccess =
        await canReadStudentTimetable(
          connection,
          req,
          studentRoll
        );


      if (!canAccess) {
        return res
          .status(403)
          .json({
            error:
              "You are not authorized to access this student's timetable.",

            code:
              "TIMETABLE_RECORD_FORBIDDEN",
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
          });
      }


      // =================================================
      // LOAD TIMETABLE
      // =================================================

      const result =
        await connection.execute(
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

          LEFT JOIN subjects s
            ON UPPER(
              t.subject_code
            ) =
            UPPER(
              s.subject_code
            )

          WHERE UPPER(
            t.student_roll
          ) =
          UPPER(
            :studentRoll
          )

          ORDER BY
            CASE UPPER(
              t.day_of_week
            )

              WHEN 'MONDAY'
                THEN 1

              WHEN 'TUESDAY'
                THEN 2

              WHEN 'WEDNESDAY'
                THEN 3

              WHEN 'THURSDAY'
                THEN 4

              WHEN 'FRIDAY'
                THEN 5

              WHEN 'SATURDAY'
                THEN 6

              WHEN 'SUNDAY'
                THEN 7

              ELSE 8
            END,

            t.start_time,

            t.id
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
        "Student timetable error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to load timetable",

          details:
            error.message,
        });

    } finally {
      if (connection) {
        try {
          await connection.close();

        } catch (
          closeError
        ) {
          console.error(
            "Timetable connection close error:",
            closeError
          );
        }
      }
    }
  }
);


module.exports =
  router;