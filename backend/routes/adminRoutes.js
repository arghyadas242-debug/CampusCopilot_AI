const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/authMiddleware");


const router = express.Router();


// =====================================================
// ADMIN DASHBOARD
// GET /api/admin/dashboard
// =====================================================

router.get(
  "/dashboard",
  async (req, res) => {
    let connection;

    try {
      connection =
        await getConnection();


      // -----------------------------------------------
      // DASHBOARD STATISTICS
      // -----------------------------------------------

      const statsResult =
        await connection.execute(
          `
          SELECT
            (
              SELECT COUNT(*)
              FROM students
            ) AS total_students,

            (
              SELECT COUNT(*)
              FROM subjects
            ) AS total_subjects,

            (
              SELECT COUNT(*)
              FROM assignments
              WHERE LOWER(status) =
                    'pending'
            ) AS active_assignments,

            (
              SELECT COUNT(*)
              FROM notices
            ) AS published_notices

          FROM dual
          `,
          [],
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      // -----------------------------------------------
      // RECENT STUDENTS
      // -----------------------------------------------

      const studentsResult =
        await connection.execute(
          `
          SELECT
            s.student_id,
            s.name,
            s.student_roll,
            s.department,
            s.semester,
            s.section,

            CASE
              WHEN NVL(
                SUM(
                  a.total_classes
                ),
                0
              ) = 0
              THEN 0

              ELSE ROUND(
                (
                  SUM(
                    a.attended_classes
                  )
                  /
                  SUM(
                    a.total_classes
                  )
                ) * 100,
                1
              )
            END
              AS attendance_percentage

          FROM students s

          LEFT JOIN attendance a
            ON s.student_roll =
               a.student_roll

          GROUP BY
            s.student_id,
            s.name,
            s.student_roll,
            s.department,
            s.semester,
            s.section

          ORDER BY
            s.student_id DESC

          FETCH FIRST 5 ROWS ONLY
          `,
          [],
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      return res.json({
        stats:
          statsResult.rows[0],

        recentStudents:
          studentsResult.rows,
      });

    } catch (error) {
      console.error(
        "Admin dashboard error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to load admin dashboard",

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
            "Admin dashboard connection close error:",
            closeError
          );
        }
      }
    }
  }
);


// =====================================================
// UPDATE STUDENT ACADEMIC SUMMARY
//
// PUT
// /api/admin/students/:studentRoll/academic-summary
//
// ADMIN ONLY
// =====================================================

router.put(
  "/students/:studentRoll/academic-summary",

  authenticateToken,

  requireAdmin,

  async (req, res) => {
    let connection;


    try {
      // -----------------------------------------------
      // STUDENT ROLL
      // -----------------------------------------------

      const studentRoll =
        String(
          req.params.studentRoll ||
            ""
        ).trim();


      if (!studentRoll) {
        return res
          .status(400)
          .json({
            error:
              "Student roll number is required.",

            code:
              "STUDENT_ROLL_REQUIRED",
          });
      }


      // -----------------------------------------------
      // REQUEST BODY
      // -----------------------------------------------

      const {
        cgpa,
        creditsEarned,
        totalProgramCredits,
        completedSemesters,
      } =
        req.body || {};


      // -----------------------------------------------
      // REQUIRE ALL VALUES
      // -----------------------------------------------

      if (
        cgpa === undefined ||
        cgpa === null ||
        cgpa === "" ||
        creditsEarned ===
          undefined ||
        creditsEarned ===
          null ||
        creditsEarned ===
          "" ||
        totalProgramCredits ===
          undefined ||
        totalProgramCredits ===
          null ||
        totalProgramCredits ===
          "" ||
        completedSemesters ===
          undefined ||
        completedSemesters ===
          null ||
        completedSemesters ===
          ""
      ) {
        return res
          .status(400)
          .json({
            error:
              "CGPA, credits earned, total program credits and completed semesters are required.",

            code:
              "ACADEMIC_SUMMARY_FIELDS_REQUIRED",
          });
      }


      // -----------------------------------------------
      // NORMALIZE VALUES
      // -----------------------------------------------

      const cleanCgpa =
        Number(cgpa);


      const cleanCreditsEarned =
        Number(
          creditsEarned
        );


      const cleanTotalProgramCredits =
        Number(
          totalProgramCredits
        );


      const cleanCompletedSemesters =
        Number(
          completedSemesters
        );


      // -----------------------------------------------
      // VALIDATE CGPA
      // -----------------------------------------------

      if (
        !Number.isFinite(
          cleanCgpa
        ) ||
        cleanCgpa < 0 ||
        cleanCgpa > 10
      ) {
        return res
          .status(400)
          .json({
            error:
              "CGPA must be between 0 and 10.",

            code:
              "INVALID_CGPA",
          });
      }


      // -----------------------------------------------
      // VALIDATE CREDITS EARNED
      // -----------------------------------------------

      if (
        !Number.isInteger(
          cleanCreditsEarned
        ) ||
        cleanCreditsEarned < 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "Credits earned must be a non-negative whole number.",

            code:
              "INVALID_CREDITS_EARNED",
          });
      }


      // -----------------------------------------------
      // VALIDATE TOTAL PROGRAM CREDITS
      // -----------------------------------------------

      if (
        !Number.isInteger(
          cleanTotalProgramCredits
        ) ||
        cleanTotalProgramCredits <
          0
      ) {
        return res
          .status(400)
          .json({
            error:
              "Total program credits must be a non-negative whole number.",

            code:
              "INVALID_TOTAL_PROGRAM_CREDITS",
          });
      }


      // -----------------------------------------------
      // CREDITS EARNED CANNOT EXCEED TOTAL
      // -----------------------------------------------

      if (
        cleanCreditsEarned >
        cleanTotalProgramCredits
      ) {
        return res
          .status(400)
          .json({
            error:
              "Credits earned cannot exceed total program credits.",

            code:
              "CREDITS_EXCEED_TOTAL",
          });
      }


      // -----------------------------------------------
      // VALIDATE COMPLETED SEMESTERS
      // -----------------------------------------------

      if (
        !Number.isInteger(
          cleanCompletedSemesters
        ) ||
        cleanCompletedSemesters <
          0 ||
        cleanCompletedSemesters >
          8
      ) {
        return res
          .status(400)
          .json({
            error:
              "Completed semesters must be between 0 and 8.",

            code:
              "INVALID_COMPLETED_SEMESTERS",
          });
      }


      // -----------------------------------------------
      // LIMIT CGPA TO 2 DECIMAL PLACES
      // -----------------------------------------------

      const normalizedCgpa =
        Number(
          cleanCgpa.toFixed(
            2
          )
        );


      connection =
        await getConnection();


      // -----------------------------------------------
      // VERIFY STUDENT EXISTS
      // -----------------------------------------------

      const studentResult =
        await connection.execute(
          `
          SELECT
            student_roll,
            name,
            semester
          FROM students
          WHERE LOWER(student_roll) =
                LOWER(:studentRoll)
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
        studentResult.rows
          .length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Student not found.",

            code:
              "STUDENT_NOT_FOUND",
          });
      }


      const student =
        studentResult.rows[0];


      // -----------------------------------------------
      // OPTIONAL SEMESTER VALIDATION
      //
      // A semester cannot be "completed" if the student
      // has not reached it yet.
      //
      // Example:
      // Current semester = 5
      // Completed semesters can be 0–4.
      //
      // If current semester is unavailable, we rely on
      // the general 0–8 validation above.
      // -----------------------------------------------

      const currentSemester =
        student.SEMESTER ===
          null ||
        student.SEMESTER ===
          undefined
          ? null
          : Number(
              student.SEMESTER
            );


      if (
        currentSemester !==
          null &&
        Number.isInteger(
          currentSemester
        ) &&
        cleanCompletedSemesters >=
          currentSemester
      ) {
        return res
          .status(400)
          .json({
            error:
              `Completed semesters must be less than the student's current semester (${currentSemester}).`,

            code:
              "INVALID_COMPLETED_SEMESTER_COUNT",
          });
      }


      // -----------------------------------------------
      // UPSERT ACADEMIC SUMMARY
      //
      // Oracle MERGE:
      //
      // Existing student summary -> UPDATE
      // No summary yet           -> INSERT
      // -----------------------------------------------

      await connection.execute(
        `
        MERGE INTO student_academic_summary target

        USING (
          SELECT
            :studentRoll
              AS student_roll,

            :cgpa
              AS cgpa,

            :creditsEarned
              AS credits_earned,

            :totalProgramCredits
              AS total_program_credits,

            :completedSemesters
              AS completed_semesters

          FROM dual
        ) source

        ON (
          LOWER(
            target.student_roll
          ) =
          LOWER(
            source.student_roll
          )
        )

        WHEN MATCHED THEN
          UPDATE SET
            target.cgpa =
              source.cgpa,

            target.credits_earned =
              source.credits_earned,

            target.total_program_credits =
              source.total_program_credits,

            target.completed_semesters =
              source.completed_semesters,

            target.updated_at =
              SYSTIMESTAMP

        WHEN NOT MATCHED THEN
          INSERT (
            student_roll,
            cgpa,
            credits_earned,
            total_program_credits,
            completed_semesters,
            updated_at
          )
          VALUES (
            source.student_roll,
            source.cgpa,
            source.credits_earned,
            source.total_program_credits,
            source.completed_semesters,
            SYSTIMESTAMP
          )
        `,
        {
          studentRoll,

          cgpa:
            normalizedCgpa,

          creditsEarned:
            cleanCreditsEarned,

          totalProgramCredits:
            cleanTotalProgramCredits,

          completedSemesters:
            cleanCompletedSemesters,
        }
      );


      await connection.commit();


      // -----------------------------------------------
      // READ SAVED RESULT
      // -----------------------------------------------

      const savedResult =
        await connection.execute(
          `
          SELECT
            student_roll,
            cgpa,
            credits_earned,
            total_program_credits,
            completed_semesters,
            updated_at

          FROM student_academic_summary

          WHERE LOWER(student_roll) =
                LOWER(:studentRoll)
          `,
          {
            studentRoll,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      const saved =
        savedResult.rows[0];


      // -----------------------------------------------
      // RESPONSE
      // -----------------------------------------------

      return res.json({
        success:
          true,

        message:
          "Student academic summary updated successfully.",

        student: {
          name:
            student.NAME,

          studentRoll:
            student.STUDENT_ROLL,
        },

        academicSummary: {
          cgpa:
            Number(
              saved.CGPA
            ),

          creditsEarned:
            Number(
              saved.CREDITS_EARNED
            ),

          totalProgramCredits:
            Number(
              saved.TOTAL_PROGRAM_CREDITS
            ),

          completedSemesters:
            Number(
              saved.COMPLETED_SEMESTERS
            ),

          updatedAt:
            saved.UPDATED_AT,
        },
      });

    } catch (error) {
      // -----------------------------------------------
      // ROLLBACK
      // -----------------------------------------------

      if (connection) {
        try {
          await connection.rollback();

        } catch (
          rollbackError
        ) {
          console.error(
            "Academic summary rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Admin academic summary update error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to update student academic summary.",

          code:
            "ACADEMIC_SUMMARY_UPDATE_FAILED",

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
            "Academic summary connection close error:",
            closeError
          );
        }
      }
    }
  }
);


module.exports =
  router;