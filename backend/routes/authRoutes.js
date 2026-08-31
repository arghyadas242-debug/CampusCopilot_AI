const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");

const getConnection = require("../db");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// HELPERS
// =====================================================

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET;

  if (
    !secret ||
    !secret.trim()
  ) {
    return null;
  }

  return secret;
}


function normalizeEmail(email) {
  return String(
    email || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeSemester(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const semester =
    Number(value);

  if (
    !Number.isInteger(
      semester
    ) ||
    semester < 1 ||
    semester > 8
  ) {
    return null;
  }

  return semester;
}


function normalizeSection(
  value
) {
  const section =
    String(
      value || ""
    )
      .replace(
        /^section\s+/i,
        ""
      )
      .trim();

  return section || null;
}


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
      "Auth DB connection close error:",
      error
    );
  }
}


// =====================================================
// AUTH STATUS
// GET /api/auth
// =====================================================

router.get(
  "/",
  (req, res) => {
    return res.json({
      service:
        "CampusCopilot Authentication API",

      endpoints: [
        "POST /api/auth/register",
        "POST /api/auth/login",
        "GET /api/auth/me",
      ],
    });
  }
);


// =====================================================
// REGISTER STUDENT
// POST /api/auth/register
// =====================================================

router.post(
  "/register",
  async (req, res) => {
    const {
      name,
      email,
      password,
      rollNumber,
      studentRoll,
      department,
      semester,
      section,
    } = req.body || {};


    // ===============================================
    // CLEAN INPUT
    // ===============================================

    const cleanName =
      String(
        name || ""
      ).trim();


    const cleanEmail =
      normalizeEmail(
        email
      );


    const cleanPassword =
      String(
        password || ""
      );


    const cleanRoll =
      String(
        rollNumber ||
        studentRoll ||
        ""
      ).trim();


    const cleanDepartment =
      String(
        department || ""
      ).trim() ||
      null;


    const cleanSemester =
      normalizeSemester(
        semester
      );


    const cleanSection =
      normalizeSection(
        section
      );


    // ===============================================
    // VALIDATION
    // ===============================================

    if (
      !cleanName ||
      !cleanEmail ||
      !cleanPassword ||
      !cleanRoll
    ) {
      return res
        .status(400)
        .json({
          error:
            "Name, email, password and student roll number are required.",

          code:
            "REGISTRATION_FIELDS_REQUIRED",
        });
    }


    if (
      cleanPassword.length <
      6
    ) {
      return res
        .status(400)
        .json({
          error:
            "Password must contain at least 6 characters.",

          code:
            "PASSWORD_TOO_SHORT",
        });
    }


    if (
      semester !==
        undefined &&
      semester !== null &&
      semester !== "" &&
      cleanSemester ===
        null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Semester must be a number between 1 and 8.",

          code:
            "INVALID_SEMESTER",
        });
    }


    const jwtSecret =
      getJwtSecret();


    if (!jwtSecret) {
      console.error(
        "JWT_SECRET is not configured."
      );

      return res
        .status(500)
        .json({
          error:
            "Authentication service is not configured correctly.",

          code:
            "AUTH_CONFIGURATION_ERROR",
        });
    }


    let connection;


    try {
      connection =
        await getConnection();


      // =============================================
      // CHECK USERS EMAIL
      // =============================================

      const existingUser =
        await connection.execute(
          `
            SELECT
              id
            FROM users
            WHERE LOWER(email) =
                  :email
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
        existingUser.rows.length >
        0
      ) {
        return res
          .status(409)
          .json({
            error:
              "An account with this email already exists.",

            code:
              "EMAIL_ALREADY_REGISTERED",
          });
      }


      // =============================================
      // CHECK STUDENT EMAIL
      // =============================================

      const existingStudentEmail =
        await connection.execute(
          `
            SELECT
              student_id
            FROM students
            WHERE LOWER(email) =
                  :email
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
        existingStudentEmail
          .rows.length >
        0
      ) {
        return res
          .status(409)
          .json({
            error:
              "A student profile with this email already exists.",

            code:
              "STUDENT_EMAIL_EXISTS",
          });
      }


      // =============================================
      // CHECK STUDENT ROLL
      // =============================================

      const existingRoll =
        await connection.execute(
          `
            SELECT
              student_id
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
        existingRoll.rows.length >
        0
      ) {
        return res
          .status(409)
          .json({
            error:
              "This student roll number is already registered.",

            code:
              "STUDENT_ROLL_EXISTS",
          });
      }


      // =============================================
      // PASSWORD HASH
      // =============================================

      const passwordHash =
        await bcrypt.hash(
          cleanPassword,
          10
        );


      // =============================================
      // INSERT USERS
      // =============================================

      const userInsert =
        await connection.execute(
          `
            INSERT INTO users
            (
              name,
              email,
              password_hash,
              role
            )
            VALUES
            (
              :name,
              :email,
              :passwordHash,
              'student'
            )
            RETURNING id INTO :id
          `,
          {
            name:
              cleanName,

            email:
              cleanEmail,

            passwordHash,

            id: {
              type:
                oracledb.NUMBER,

              dir:
                oracledb.BIND_OUT,
            },
          },
          {
            autoCommit:
              false,
          }
        );


      const userId =
        Array.isArray(
          userInsert.outBinds
            .id
        )
          ? userInsert.outBinds
              .id[0]
          : userInsert.outBinds
              .id;


      // =============================================
      // INSERT STUDENT PROFILE
      //
      // STUDENTS uses EMAIL as the
      // USERS ↔ STUDENTS relationship.
      // =============================================

      const studentInsert =
        await connection.execute(
          `
            INSERT INTO students
            (
              name,
              email,
              department,
              semester,
              section,
              student_roll
            )
            VALUES
            (
              :name,
              :email,
              :department,
              :semester,
              :section,
              :studentRoll
            )
            RETURNING student_id
            INTO :studentId
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

            studentId: {
              type:
                oracledb.NUMBER,

              dir:
                oracledb.BIND_OUT,
            },
          },
          {
            autoCommit:
              false,
          }
        );


      const studentId =
        Array.isArray(
          studentInsert.outBinds
            .studentId
        )
          ? studentInsert.outBinds
              .studentId[0]
          : studentInsert.outBinds
              .studentId;


      // =============================================
      // COMMIT TRANSACTION
      // =============================================

      await connection.commit();


      // =============================================
      // CREATE JWT
      // =============================================

      const token =
        jwt.sign(
          {
            id:
              userId,

            name:
              cleanName,

            email:
              cleanEmail,

            role:
              "student",

            rollNumber:
              cleanRoll,
          },

          jwtSecret,

          {
            expiresIn:
              "7d",
          }
        );


      // =============================================
      // RESPONSE
      // =============================================

      return res
        .status(201)
        .json({
          message:
            "Student registered successfully.",

          token,

          user: {
            id:
              userId,

            studentId,

            name:
              cleanName,

            email:
              cleanEmail,

            role:
              "student",

            rollNumber:
              cleanRoll,

            department:
              cleanDepartment,

            semester:
              cleanSemester,

            section:
              cleanSection,

            /*
              Registration is not considered
              a normal login event.

              LAST_LOGIN_AT will be set after
              the first successful /login.
            */
            lastLogin:
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
            "Registration rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Registration Error:",
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
              "A user with this email or student roll already exists.",

            code:
              "DUPLICATE_ACCOUNT",
          });
      }


      return res
        .status(500)
        .json({
          error:
            "Unable to register student.",

          code:
            "REGISTRATION_FAILED",

          details:
            error.message,
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

router.post(
  "/login",
  async (req, res) => {
    const {
      email,
      password,
    } = req.body || {};


    const cleanEmail =
      normalizeEmail(
        email
      );


    const cleanPassword =
      String(
        password || ""
      );


    // ===============================================
    // VALIDATION
    // ===============================================

    if (
      !cleanEmail ||
      !cleanPassword
    ) {
      return res
        .status(400)
        .json({
          error:
            "Email and password are required.",

          code:
            "LOGIN_FIELDS_REQUIRED",
        });
    }


    const jwtSecret =
      getJwtSecret();


    if (!jwtSecret) {
      console.error(
        "JWT_SECRET is not configured."
      );

      return res
        .status(500)
        .json({
          error:
            "Authentication service is not configured correctly.",

          code:
            "AUTH_CONFIGURATION_ERROR",
        });
    }


    let connection;


    try {
      connection =
        await getConnection();


      // =============================================
      // FIND LOGIN ACCOUNT
      // =============================================

      const userResult =
        await connection.execute(
          `
            SELECT
              id,
              name,
              email,
              password_hash,
              role,
              last_login_at
            FROM users
            WHERE LOWER(email) =
                  :email
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
        userResult.rows.length ===
        0
      ) {
        return res
          .status(401)
          .json({
            error:
              "Invalid email or password.",

            code:
              "INVALID_CREDENTIALS",
          });
      }


      const user =
        userResult.rows[0];


      // =============================================
      // PASSWORD
      // =============================================

      if (
        !user.PASSWORD_HASH
      ) {
        console.error(
          `User ${user.ID} does not have a password hash.`
        );

        return res
          .status(401)
          .json({
            error:
              "Invalid email or password.",

            code:
              "INVALID_CREDENTIALS",
          });
      }


      const passwordMatches =
        await bcrypt.compare(
          cleanPassword,
          user.PASSWORD_HASH
        );


      if (
        !passwordMatches
      ) {
        return res
          .status(401)
          .json({
            error:
              "Invalid email or password.",

            code:
              "INVALID_CREDENTIALS",
          });
      }


      // =============================================
      // ROLE
      // =============================================

      const role =
        String(
          user.ROLE ||
          ""
        )
          .trim()
          .toLowerCase();


      if (
        role !==
          "student" &&
        role !==
          "admin"
      ) {
        return res
          .status(403)
          .json({
            error:
              "This account role is not supported.",

            code:
              "INVALID_ACCOUNT_ROLE",
          });
      }


      // =============================================
      // DEFAULT ACCOUNT DETAILS
      // =============================================

      let rollNumber =
        role === "admin"
          ? "ADMIN"
          : null;


      let department =
        role === "admin"
          ? "University Administration"
          : null;


      let semester =
        null;


      let section =
        null;


      let studentId =
        null;


      let displayName =
        user.NAME;


      // =============================================
      // STUDENT ACADEMIC PROFILE
      //
      // USERS.EMAIL ↔ STUDENTS.EMAIL
      // =============================================

      if (
        role === "student"
      ) {
        const studentResult =
          await connection.execute(
            `
              SELECT
                student_id,
                name,
                email,
                department,
                semester,
                section,
                student_roll
              FROM students
              WHERE LOWER(email) =
                    :email
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
          studentResult.rows.length ===
          0
        ) {
          return res
            .status(403)
            .json({
              error:
                "Your account is not linked to a student academic profile.",

              code:
                "STUDENT_PROFILE_NOT_FOUND",
            });
        }


        const student =
          studentResult.rows[0];


        rollNumber =
          String(
            student.STUDENT_ROLL ||
            ""
          ).trim();


        if (
          !rollNumber
        ) {
          return res
            .status(403)
            .json({
              error:
                "Your student profile does not contain a roll number.",

              code:
                "STUDENT_ROLL_NOT_FOUND",
            });
        }


        studentId =
          student.STUDENT_ID;


        displayName =
          student.NAME ||
          user.NAME;


        department =
          student.DEPARTMENT;


        semester =
          student.SEMESTER;


        section =
          student.SECTION;
      }


      // =============================================
      // CREATE JWT
      // =============================================

      const token =
        jwt.sign(
          {
            id:
              user.ID,

            name:
              displayName,

            email:
              user.EMAIL,

            role,

            rollNumber,
          },

          jwtSecret,

          {
            expiresIn:
              "7d",
          }
        );


      // =============================================
      // RECORD SUCCESSFUL LOGIN
      // =============================================

      await connection.execute(
        `
          UPDATE users
          SET last_login_at =
                SYSTIMESTAMP
          WHERE id =
                :userId
        `,
        {
          userId:
            user.ID,
        }
      );


      // =============================================
      // READ SAVED LOGIN TIME
      //
      // We read the actual Oracle value instead of
      // generating a timestamp in JavaScript.
      // =============================================

      const lastLoginResult =
        await connection.execute(
          `
            SELECT
              last_login_at
            FROM users
            WHERE id =
                  :userId
          `,
          {
            userId:
              user.ID,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      const lastLogin =
        lastLoginResult.rows[0]
          ?.LAST_LOGIN_AT ||
        null;


      // =============================================
      // COMMIT LOGIN TIMESTAMP
      // =============================================

      await connection.commit();


      // =============================================
      // LOGIN RESPONSE
      // =============================================

      return res.json({
        message:
          "Login successful.",

        token,

        user: {
          id:
            user.ID,

          studentId,

          name:
            displayName,

          email:
            user.EMAIL,

          role,

          rollNumber,

          department,

          semester,

          section,

          lastLogin,
        },
      });

    } catch (error) {
      /*
        Because login now performs an UPDATE,
        rollback if anything fails before commit.
      */

      if (connection) {
        try {
          await connection.rollback();

        } catch (
          rollbackError
        ) {
          console.error(
            "Login rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Login Error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to sign in right now.",

          code:
            "LOGIN_FAILED",

          details:
            error.message,
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// CURRENT AUTHENTICATED ACCOUNT
// GET /api/auth/me
// =====================================================

router.get(
  "/me",

  authenticateToken,

  async (req, res) => {
    const jwtEmail =
      normalizeEmail(
        req.user?.email
      );


    if (!jwtEmail) {
      return res
        .status(401)
        .json({
          error:
            "Authenticated account does not contain an email address.",

          code:
            "AUTH_EMAIL_REQUIRED",
        });
    }


    let connection;


    try {
      connection =
        await getConnection();


      // =============================================
      // ACCOUNT
      // =============================================

      const userResult =
        await connection.execute(
          `
            SELECT
              id,
              name,
              email,
              role,
              last_login_at
            FROM users
            WHERE LOWER(email) =
                  :email
          `,
          {
            email:
              jwtEmail,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      if (
        userResult.rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Authenticated account was not found.",

            code:
              "ACCOUNT_NOT_FOUND",
          });
      }


      const user =
        userResult.rows[0];


      const role =
        String(
          user.ROLE ||
          ""
        )
          .trim()
          .toLowerCase();


      // =============================================
      // DEFAULT ACCOUNT PROFILE
      // =============================================

      let profile = {
        id:
          user.ID,

        name:
          user.NAME,

        email:
          user.EMAIL,

        role,

        rollNumber:
          role === "admin"
            ? "ADMIN"
            : null,

        department:
          role === "admin"
            ? "University Administration"
            : null,

        semester:
          null,

        section:
          null,

        studentId:
          null,

        lastLogin:
          user.LAST_LOGIN_AT ||
          null,
      };


      // =============================================
      // STUDENT PROFILE
      // =============================================

      if (
        role === "student"
      ) {
        const studentResult =
          await connection.execute(
            `
              SELECT
                student_id,
                name,
                email,
                department,
                semester,
                section,
                student_roll
              FROM students
              WHERE LOWER(email) =
                    :email
            `,
            {
              email:
                jwtEmail,
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
            .status(403)
            .json({
              error:
                "Your account is not linked to a student academic profile.",

              code:
                "STUDENT_PROFILE_NOT_FOUND",
            });
        }


        const student =
          studentResult.rows[0];


        const studentRoll =
          String(
            student.STUDENT_ROLL ||
            ""
          ).trim();


        if (!studentRoll) {
          return res
            .status(403)
            .json({
              error:
                "Your student profile does not contain a roll number.",

              code:
                "STUDENT_ROLL_NOT_FOUND",
            });
        }


        profile = {
          id:
            user.ID,

          studentId:
            student.STUDENT_ID,

          name:
            student.NAME ||
            user.NAME,

          email:
            student.EMAIL ||
            user.EMAIL,

          role:
            "student",

          rollNumber:
            studentRoll,

          department:
            student.DEPARTMENT,

          semester:
            student.SEMESTER,

          section:
            student.SECTION,

          lastLogin:
            user.LAST_LOGIN_AT ||
            null,
        };
      }


      return res.json({
        user:
          profile,
      });

    } catch (error) {
      console.error(
        "Auth /me Error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to load authenticated account.",

          code:
            "AUTH_PROFILE_LOAD_FAILED",

          details:
            error.message,
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;