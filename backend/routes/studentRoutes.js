const express = require("express");
const oracledb = require("oracledb");
const bcrypt = require("bcryptjs");
const getConnection = require("../db");

const router = express.Router();


// =====================================================
// GET ALL STUDENTS
// GET /api/students
// =====================================================

router.get("/", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        student_id,
        name,
        email,
        student_roll,
        department,
        semester,
        section
      FROM students
      ORDER BY student_id DESC
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);

  } catch (error) {
    console.error(
      "Get students error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to load students",

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
// SEARCH STUDENT
// GET /api/students/search?q=...
// =====================================================

router.get(
  "/search",
  async (req, res) => {
    let connection;

    try {
      const query =
        req.query.q?.trim();

      if (!query) {
        return res
          .status(400)
          .json({
            error:
              "Search value is required",
          });
      }

      connection =
        await getConnection();

      const result =
        await connection.execute(
          `
          SELECT
            student_id,
            name,
            email,
            student_roll,
            department,
            semester,
            section
          FROM students
          WHERE
            LOWER(student_roll) =
              LOWER(:exactValue)

            OR LOWER(name) LIKE
              LOWER(:searchValue)

            OR LOWER(email) LIKE
              LOWER(:searchValue)

          ORDER BY
            CASE
              WHEN LOWER(student_roll) =
                   LOWER(:exactValue)
              THEN 0
              ELSE 1
            END,
            name

          FETCH FIRST 10 ROWS ONLY
          `,
          {
            exactValue:
              query,

            searchValue:
              `%${query}%`,
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
        "Student search error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to search students",

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
  }
);


// =====================================================
// GET STUDENT ACADEMIC SUMMARY
// GET /api/students/:studentRoll/academic-summary
// =====================================================

router.get(
  "/:studentRoll/academic-summary",
  async (req, res) => {
    let connection;

    try {
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
              "Student roll number is required",
          });
      }


      connection =
        await getConnection();


      /*
        LEFT JOIN is intentional.

        Student exists + summary exists
        -> return real values

        Student exists + no summary yet
        -> return null values

        Student does not exist
        -> 404

        We never generate fake CGPA/credit values.
      */

      const result =
        await connection.execute(
          `
          SELECT
            s.student_roll,

            a.cgpa,

            a.credits_earned,

            a.total_program_credits,

            a.completed_semesters,

            a.updated_at

          FROM students s

          LEFT JOIN student_academic_summary a
            ON LOWER(a.student_roll) =
               LOWER(s.student_roll)

          WHERE LOWER(s.student_roll) =
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
        result.rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Student not found",
          });
      }


      const row =
        result.rows[0];


      return res.json({
        studentRoll:
          row.STUDENT_ROLL,


        cgpa:
          row.CGPA === null ||
          row.CGPA === undefined
            ? null
            : Number(
                row.CGPA
              ),


        creditsEarned:
          row.CREDITS_EARNED ===
            null ||
          row.CREDITS_EARNED ===
            undefined
            ? null
            : Number(
                row.CREDITS_EARNED
              ),


        totalProgramCredits:
          row.TOTAL_PROGRAM_CREDITS ===
            null ||
          row.TOTAL_PROGRAM_CREDITS ===
            undefined
            ? null
            : Number(
                row.TOTAL_PROGRAM_CREDITS
              ),


        completedSemesters:
          row.COMPLETED_SEMESTERS ===
            null ||
          row.COMPLETED_SEMESTERS ===
            undefined
            ? null
            : Number(
                row.COMPLETED_SEMESTERS
              ),


        updatedAt:
          row.UPDATED_AT ||
          null,


        hasAcademicSummary:
          row.CGPA !== null ||
          row.CREDITS_EARNED !==
            null ||
          row.TOTAL_PROGRAM_CREDITS !==
            null ||
          row.COMPLETED_SEMESTERS !==
            null,
      });

    } catch (error) {
      console.error(
        "Get academic summary error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to load academic summary",

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
  }
);


// =====================================================
// GET SINGLE STUDENT
// GET /api/students/:studentRoll
// =====================================================

router.get(
  "/:studentRoll",
  async (req, res) => {
    let connection;

    try {
      const studentRoll =
        req.params.studentRoll.trim();


      connection =
        await getConnection();


      const result =
        await connection.execute(
          `
          SELECT
            student_id,
            name,
            email,
            student_roll,
            department,
            semester,
            section
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
        result.rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Student not found",
          });
      }


      return res.json(
        result.rows[0]
      );

    } catch (error) {
      console.error(
        "Get student error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to load student",

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
  }
);


// =====================================================
// ADD NEW STUDENT
// POST /api/students
// =====================================================

router.post(
  "/",
  async (req, res) => {
    let connection;

    try {
      const {
        name,
        email,
        password,
        studentRoll,
        department,
        semester,
        section,
      } =
        req.body;


      // ---------------------------------------------
      // VALIDATION
      // ---------------------------------------------

      if (
        !name?.trim() ||
        !email?.trim() ||
        !password ||
        !studentRoll?.trim()
      ) {
        return res
          .status(400)
          .json({
            error:
              "Name, email, password and student roll are required",
          });
      }


      const cleanName =
        name.trim();


      const cleanEmail =
        email
          .trim()
          .toLowerCase();


      const cleanRoll =
        studentRoll.trim();


      const cleanDepartment =
        department?.trim() ||
        null;


      const cleanSection =
        section?.trim() ||
        null;


      let cleanSemester =
        null;


      if (
        semester !==
          undefined &&
        semester !==
          null &&
        semester !==
          ""
      ) {
        cleanSemester =
          Number(
            semester
          );


        if (
          !Number.isInteger(
            cleanSemester
          ) ||
          cleanSemester < 1 ||
          cleanSemester > 8
        ) {
          return res
            .status(400)
            .json({
              error:
                "Semester must be between 1 and 8",
            });
        }
      }


      if (
        password.length <
        6
      ) {
        return res
          .status(400)
          .json({
            error:
              "Password must contain at least 6 characters",
          });
      }


      connection =
        await getConnection();


      // ---------------------------------------------
      // CHECK EMAIL IN USERS
      // ---------------------------------------------

      const emailCheck =
        await connection.execute(
          `
          SELECT id
          FROM users
          WHERE LOWER(email) =
                LOWER(:email)
          `,
          {
            email:
              cleanEmail,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      if (
        emailCheck.rows.length >
        0
      ) {
        return res
          .status(409)
          .json({
            error:
              "Email is already registered",
          });
      }


      // ---------------------------------------------
      // CHECK EMAIL IN STUDENTS
      // ---------------------------------------------

      const studentEmailCheck =
        await connection.execute(
          `
          SELECT student_id
          FROM students
          WHERE LOWER(email) =
                LOWER(:email)
          `,
          {
            email:
              cleanEmail,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      if (
        studentEmailCheck
          .rows.length >
        0
      ) {
        return res
          .status(409)
          .json({
            error:
              "Student email already exists",
          });
      }


      // ---------------------------------------------
      // CHECK DUPLICATE ROLL
      // ---------------------------------------------

      const rollCheck =
        await connection.execute(
          `
          SELECT student_id
          FROM students
          WHERE LOWER(student_roll) =
                LOWER(:studentRoll)
          `,
          {
            studentRoll:
              cleanRoll,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      if (
        rollCheck.rows.length >
        0
      ) {
        return res
          .status(409)
          .json({
            error:
              "Student roll already exists",
          });
      }


      // ---------------------------------------------
      // HASH PASSWORD
      // ---------------------------------------------

      const passwordHash =
        await bcrypt.hash(
          password,
          10
        );


      // ---------------------------------------------
      // INSERT INTO USERS
      // ---------------------------------------------

      await connection.execute(
        `
        INSERT INTO users (
          name,
          email,
          password_hash,
          role,
          created_at
        )
        VALUES (
          :name,
          :email,
          :passwordHash,
          'student',
          SYSTIMESTAMP
        )
        `,
        {
          name:
            cleanName,

          email:
            cleanEmail,

          passwordHash,
        }
      );


      // ---------------------------------------------
      // INSERT INTO STUDENTS
      // ---------------------------------------------

      await connection.execute(
        `
        INSERT INTO students (
          name,
          email,
          department,
          semester,
          section,
          student_roll
        )
        VALUES (
          :name,
          :email,
          :department,
          :semester,
          :section,
          :studentRoll
        )
        `,
        {
          name:
            cleanName,

          email:
            cleanEmail,

          department:
            cleanDepartment,

          semester:
            cleanSemester,

          section:
            cleanSection,

          studentRoll:
            cleanRoll,
        }
      );


      // ---------------------------------------------
      // COMMIT BOTH TOGETHER
      // ---------------------------------------------

      await connection.commit();


      return res
        .status(201)
        .json({
          message:
            "Student created successfully",

          student: {
            name:
              cleanName,

            email:
              cleanEmail,

            studentRoll:
              cleanRoll,

            department:
              cleanDepartment,

            semester:
              cleanSemester,

            section:
              cleanSection,

            role:
              "student",
          },
        });

    } catch (error) {

      // ---------------------------------------------
      // ROLLBACK
      // ---------------------------------------------

      if (connection) {
        try {
          await connection.rollback();

        } catch (
          rollbackError
        ) {
          console.error(
            "Rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Create student error:",
        error
      );


      if (
        error.errorNum ===
        1
      ) {
        return res
          .status(409)
          .json({
            error:
              "Student email or roll number already exists",
          });
      }


      return res
        .status(500)
        .json({
          error:
            "Unable to create student",

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
  }
);


// =====================================================
// UPDATE STUDENT
// PUT /api/students/:studentRoll
// =====================================================

router.put(
  "/:studentRoll",
  async (req, res) => {
    let connection;

    try {
      const studentRoll =
        req.params.studentRoll.trim();


      const {
        name,
        email,
        department,
        semester,
        section,
      } =
        req.body;


      // ---------------------------------------------
      // VALIDATION
      // ---------------------------------------------

      if (
        !name?.trim() ||
        !email?.trim()
      ) {
        return res
          .status(400)
          .json({
            error:
              "Name and email are required",
          });
      }


      const cleanName =
        name.trim();


      const cleanEmail =
        email
          .trim()
          .toLowerCase();


      let cleanSemester =
        null;


      if (
        semester !==
          undefined &&
        semester !==
          null &&
        semester !==
          ""
      ) {
        cleanSemester =
          Number(
            semester
          );


        if (
          !Number.isInteger(
            cleanSemester
          ) ||
          cleanSemester <
            1 ||
          cleanSemester >
            8
        ) {
          return res
            .status(400)
            .json({
              error:
                "Semester must be between 1 and 8",
            });
        }
      }


      connection =
        await getConnection();


      // ---------------------------------------------
      // FIND EXISTING STUDENT
      // ---------------------------------------------

      const existingResult =
        await connection.execute(
          `
          SELECT
            student_id,
            name,
            email,
            student_roll
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
        existingResult
          .rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Student not found",
          });
      }


      const oldStudent =
        existingResult.rows[0];


      // ---------------------------------------------
      // CHECK EMAIL NOT USED BY ANOTHER ACCOUNT
      // ---------------------------------------------

      const duplicateEmail =
        await connection.execute(
          `
          SELECT id
          FROM users
          WHERE LOWER(email) =
                LOWER(:newEmail)

            AND LOWER(email) <>
                LOWER(:oldEmail)
          `,
          {
            newEmail:
              cleanEmail,

            oldEmail:
              oldStudent.EMAIL,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      if (
        duplicateEmail
          .rows.length >
        0
      ) {
        return res
          .status(409)
          .json({
            error:
              "Email is already being used by another account",
          });
      }


      // ---------------------------------------------
      // UPDATE STUDENT PROFILE
      // ---------------------------------------------

      await connection.execute(
        `
        UPDATE students
        SET
          name = :name,
          email = :email,
          department = :department,
          semester = :semester,
          section = :section
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          name:
            cleanName,

          email:
            cleanEmail,

          department:
            department?.trim() ||
            null,

          semester:
            cleanSemester,

          section:
            section?.trim() ||
            null,

          studentRoll,
        }
      );


      // ---------------------------------------------
      // KEEP LOGIN ACCOUNT SYNCHRONIZED
      // ---------------------------------------------

      await connection.execute(
        `
        UPDATE users
        SET
          name = :name,
          email = :newEmail
        WHERE LOWER(email) =
              LOWER(:oldEmail)
        `,
        {
          name:
            cleanName,

          newEmail:
            cleanEmail,

          oldEmail:
            oldStudent.EMAIL,
        }
      );


      await connection.commit();


      return res.json({
        message:
          "Student updated successfully",

        student: {
          studentId:
            oldStudent.STUDENT_ID,

          name:
            cleanName,

          email:
            cleanEmail,

          studentRoll:
            oldStudent.STUDENT_ROLL,

          department:
            department?.trim() ||
            null,

          semester:
            cleanSemester,

          section:
            section?.trim() ||
            null,
        },
      });

    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();

        } catch (
          rollbackError
        ) {
          console.error(
            "Rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Student update error:",
        error
      );


      if (
        error.errorNum ===
        1
      ) {
        return res
          .status(409)
          .json({
            error:
              "The updated email already exists",
          });
      }


      return res
        .status(500)
        .json({
          error:
            "Unable to update student",

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
  }
);


// =====================================================
// DELETE STUDENT
// DELETE /api/students/:studentRoll
// =====================================================

router.delete(
  "/:studentRoll",
  async (req, res) => {
    let connection;

    try {
      const studentRoll =
        req.params.studentRoll.trim();


      connection =
        await getConnection();


      // ---------------------------------------------
      // FIND STUDENT
      // ---------------------------------------------

      const studentResult =
        await connection.execute(
          `
          SELECT
            student_id,
            name,
            email,
            student_roll
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
        studentResult
          .rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Student not found",
          });
      }


      const student =
        studentResult.rows[0];


      // ---------------------------------------------
      // DELETE ACADEMIC SUMMARY
      //
      // Must happen BEFORE student deletion because
      // STUDENT_ACADEMIC_SUMMARY references STUDENTS.
      // ---------------------------------------------

      await connection.execute(
        `
        DELETE FROM student_academic_summary
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          studentRoll,
        }
      );


      // ---------------------------------------------
      // DELETE ATTENDANCE
      // ---------------------------------------------

      await connection.execute(
        `
        DELETE FROM attendance
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          studentRoll,
        }
      );


      // ---------------------------------------------
      // DELETE ASSIGNMENTS
      // ---------------------------------------------

      await connection.execute(
        `
        DELETE FROM assignments
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          studentRoll,
        }
      );


      // ---------------------------------------------
      // DELETE TIMETABLE
      // ---------------------------------------------

      await connection.execute(
        `
        DELETE FROM timetable
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          studentRoll,
        }
      );


      // ---------------------------------------------
      // DELETE EXAMS
      // ---------------------------------------------

      await connection.execute(
        `
        DELETE FROM exams
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          studentRoll,
        }
      );


      // ---------------------------------------------
      // DELETE STUDENT
      // ---------------------------------------------

      await connection.execute(
        `
        DELETE FROM students
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          studentRoll,
        }
      );


      // ---------------------------------------------
      // DELETE LOGIN ACCOUNT
      // ---------------------------------------------

      await connection.execute(
        `
        DELETE FROM users
        WHERE LOWER(email) =
              LOWER(:email)

          AND LOWER(role) =
              'student'
        `,
        {
          email:
            student.EMAIL,
        }
      );


      await connection.commit();


      return res.json({
        message:
          "Student deleted successfully",

        student: {
          studentId:
            student.STUDENT_ID,

          name:
            student.NAME,

          email:
            student.EMAIL,

          studentRoll:
            student.STUDENT_ROLL,
        },
      });

    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();

        } catch (
          rollbackError
        ) {
          console.error(
            "Rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Delete student error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to delete student",

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
  }
);


module.exports =
  router;