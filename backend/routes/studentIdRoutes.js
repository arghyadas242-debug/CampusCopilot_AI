const express =
  require("express");

const crypto =
  require("crypto");

const oracledb =
  require("oracledb");

const getConnection =
  require("../db");

const {
  authenticateToken,
  requireStudent,
} = require("../middleware/authMiddleware");


const router =
  express.Router();


// =====================================================
// CONFIGURATION
// =====================================================

const VERIFICATION_VALID_DAYS =
  30;


const FRONTEND_URL =
  String(
    process.env.FRONTEND_URL ||
      "http://localhost:5173"
  ).replace(/\/+$/, "");


// =====================================================
// HELPERS
// =====================================================

function createVerificationToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}


function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(
      String(token)
    )
    .digest("hex");
}


// =====================================================
// FIND AUTHENTICATED STUDENT
// =====================================================

async function getAuthenticatedStudent(
  connection,
  user
) {
  const directRoll =
    user?.studentRoll ||
    user?.rollNumber ||
    user?.student_roll ||
    user?.STUDENT_ROLL ||
    null;


  // ---------------------------------------------------
  // JWT ALREADY CONTAINS STUDENT ROLL
  // ---------------------------------------------------

  if (directRoll) {
    const result =
      await connection.execute(
        `
        SELECT
          STUDENT_ROLL,
          NAME,
          EMAIL,
          DEPARTMENT,
          SEMESTER,
          SECTION
        FROM STUDENTS
        WHERE STUDENT_ROLL = :studentRoll
        `,
        {
          studentRoll:
            String(
              directRoll
            ).trim(),
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
      return result.rows[0];
    }
  }


  // ---------------------------------------------------
  // RESOLVE BY JWT EMAIL
  // ---------------------------------------------------

  const email =
    user?.email ||
    user?.EMAIL ||
    null;


  if (email) {
    const result =
      await connection.execute(
        `
        SELECT
          STUDENT_ROLL,
          NAME,
          EMAIL,
          DEPARTMENT,
          SEMESTER,
          SECTION
        FROM STUDENTS
        WHERE LOWER(EMAIL) =
              LOWER(:email)
        `,
        {
          email:
            String(
              email
            ).trim(),
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
      return result.rows[0];
    }
  }


  // ---------------------------------------------------
  // RESOLVE BY JWT USER ID
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
          S.STUDENT_ROLL,
          S.NAME,
          S.EMAIL,
          S.DEPARTMENT,
          S.SEMESTER,
          S.SECTION
        FROM USERS U
        JOIN STUDENTS S
          ON LOWER(S.EMAIL) =
             LOWER(U.EMAIL)
        WHERE U.ID = :userId
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
      return result.rows[0];
    }
  }


  return null;
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
      "Student ID DB close error:",
      error
    );
  }
}


// =====================================================
// POST /api/student-id/verification
//
// CREATE / ROTATE VERIFICATION QR TOKEN
//
// AUTHENTICATED STUDENTS ONLY
// =====================================================

router.post(
  "/verification",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    let connection;


    try {
      connection =
        await getConnection();


      // -----------------------------------------------
      // FIND THE STUDENT FROM JWT
      // -----------------------------------------------

      const student =
        await getAuthenticatedStudent(
          connection,
          req.user
        );


      if (!student) {
        return res
          .status(404)
          .json({
            error:
              "Student profile could not be found for the authenticated account.",

            code:
              "STUDENT_PROFILE_NOT_FOUND",
          });
      }


      const studentRoll =
        String(
          student.STUDENT_ROLL
        ).trim();


      // -----------------------------------------------
      // REVOKE EXISTING ACTIVE TOKENS
      // -----------------------------------------------

      await connection.execute(
        `
        UPDATE STUDENT_ID_VERIFICATIONS
        SET REVOKED_AT =
              SYSTIMESTAMP
        WHERE STUDENT_ROLL =
              :studentRoll
          AND REVOKED_AT IS NULL
          AND EXPIRES_AT >
              SYSTIMESTAMP
        `,
        {
          studentRoll,
        }
      );


      // -----------------------------------------------
      // GENERATE SECURE RANDOM TOKEN
      // -----------------------------------------------

      const rawToken =
        createVerificationToken();


      const tokenHash =
        hashToken(
          rawToken
        );


      const expiresAt =
        new Date(
          Date.now() +
            VERIFICATION_VALID_DAYS *
              24 *
              60 *
              60 *
              1000
        );


      // -----------------------------------------------
      // SAVE ONLY HASH IN ORACLE
      // -----------------------------------------------

      await connection.execute(
        `
        INSERT INTO STUDENT_ID_VERIFICATIONS
        (
          STUDENT_ROLL,
          TOKEN_HASH,
          CREATED_AT,
          EXPIRES_AT,
          REVOKED_AT
        )
        VALUES
        (
          :studentRoll,
          :tokenHash,
          SYSTIMESTAMP,
          :expiresAt,
          NULL
        )
        `,
        {
          studentRoll,

          tokenHash,

          expiresAt,
        }
      );


      await connection.commit();


      // -----------------------------------------------
      // RAW TOKEN ONLY RETURNS TO STUDENT
      // -----------------------------------------------

      const verificationUrl =
        `${FRONTEND_URL}/verify-student/${encodeURIComponent(
          rawToken
        )}`;


      return res
        .status(201)
        .json({
          success:
            true,

          verification: {
            token:
              rawToken,

            verificationUrl,

            expiresAt:
              expiresAt.toISOString(),

            validDays:
              VERIFICATION_VALID_DAYS,
          },
        });

    } catch (error) {
      console.error(
        "Create Student ID verification error:",
        error
      );


      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Student ID rollback error:",
            rollbackError
          );
        }
      }


      return res
        .status(500)
        .json({
          error:
            "Unable to create Student ID verification.",

          code:
            "STUDENT_ID_VERIFICATION_CREATE_FAILED",
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// GET /api/student-id/verification
//
// GET CURRENT VERIFICATION STATUS
//
// DOES NOT RETURN RAW TOKEN
// =====================================================

router.get(
  "/verification",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    let connection;


    try {
      connection =
        await getConnection();


      const student =
        await getAuthenticatedStudent(
          connection,
          req.user
        );


      if (!student) {
        return res
          .status(404)
          .json({
            error:
              "Student profile could not be found for the authenticated account.",

            code:
              "STUDENT_PROFILE_NOT_FOUND",
          });
      }


      const studentRoll =
        String(
          student.STUDENT_ROLL
        ).trim();


      const result =
        await connection.execute(
          `
          SELECT
            VERIFICATION_ID,
            CREATED_AT,
            EXPIRES_AT
          FROM STUDENT_ID_VERIFICATIONS
          WHERE STUDENT_ROLL =
                :studentRoll
            AND REVOKED_AT IS NULL
            AND EXPIRES_AT >
                SYSTIMESTAMP
          ORDER BY CREATED_AT DESC
          FETCH FIRST 1 ROW ONLY
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
        return res.json({
          active:
            false,

          verification:
            null,
        });
      }


      const verification =
        result.rows[0];


      return res.json({
        active:
          true,

        verification: {
          id:
            verification.VERIFICATION_ID,

          createdAt:
            verification.CREATED_AT,

          expiresAt:
            verification.EXPIRES_AT,
        },
      });

    } catch (error) {
      console.error(
        "Student ID verification status error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to load Student ID verification status.",

          code:
            "STUDENT_ID_VERIFICATION_STATUS_FAILED",
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// DELETE /api/student-id/verification
//
// REVOKE CURRENT QR
// =====================================================

router.delete(
  "/verification",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    let connection;


    try {
      connection =
        await getConnection();


      const student =
        await getAuthenticatedStudent(
          connection,
          req.user
        );


      if (!student) {
        return res
          .status(404)
          .json({
            error:
              "Student profile could not be found for the authenticated account.",

            code:
              "STUDENT_PROFILE_NOT_FOUND",
          });
      }


      const studentRoll =
        String(
          student.STUDENT_ROLL
        ).trim();


      const result =
        await connection.execute(
          `
          UPDATE STUDENT_ID_VERIFICATIONS
          SET REVOKED_AT =
                SYSTIMESTAMP
          WHERE STUDENT_ROLL =
                :studentRoll
            AND REVOKED_AT IS NULL
            AND EXPIRES_AT >
                SYSTIMESTAMP
          `,
          {
            studentRoll,
          }
        );


      await connection.commit();


      return res.json({
        success:
          true,

        revoked:
          result.rowsAffected >
          0,
      });

    } catch (error) {
      console.error(
        "Revoke Student ID verification error:",
        error
      );


      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Student ID rollback error:",
            rollbackError
          );
        }
      }


      return res
        .status(500)
        .json({
          error:
            "Unable to revoke Student ID verification.",

          code:
            "STUDENT_ID_VERIFICATION_REVOKE_FAILED",
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// GET /api/student-id/verify/:token
//
// PUBLIC QR VERIFICATION
//
// NO JWT REQUIRED
// =====================================================

router.get(
  "/verify/:token",
  async (req, res) => {
    let connection;


    try {
      const token =
        String(
          req.params.token ||
            ""
        ).trim();


      // -----------------------------------------------
      // BASIC TOKEN FORMAT CHECK
      // -----------------------------------------------

      if (
        !/^[a-f0-9]{64}$/i.test(
          token
        )
      ) {
        return res.json({
          valid:
            false,

          code:
            "VERIFICATION_INVALID",
        });
      }


      const tokenHash =
        hashToken(
          token
        );


      connection =
        await getConnection();


      // -----------------------------------------------
      // LOOK UP ACTIVE TOKEN
      // -----------------------------------------------

      const result =
        await connection.execute(
          `
          SELECT
            V.VERIFICATION_ID,
            V.CREATED_AT,
            V.EXPIRES_AT,

            S.STUDENT_ROLL,
            S.NAME,
            S.DEPARTMENT,
            S.SEMESTER,
            S.SECTION

          FROM STUDENT_ID_VERIFICATIONS V

          JOIN STUDENTS S
            ON S.STUDENT_ROLL =
               V.STUDENT_ROLL

          WHERE V.TOKEN_HASH =
                :tokenHash

            AND V.REVOKED_AT IS NULL

            AND V.EXPIRES_AT >
                SYSTIMESTAMP

          FETCH FIRST 1 ROW ONLY
          `,
          {
            tokenHash,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );


      // -----------------------------------------------
      // INVALID / EXPIRED / REVOKED
      // -----------------------------------------------

      if (
        result.rows.length ===
        0
      ) {
        return res.json({
          valid:
            false,

          code:
            "VERIFICATION_INVALID",
        });
      }


      const row =
        result.rows[0];


      // -----------------------------------------------
      // ONLY SAFE PUBLIC INFORMATION
      // -----------------------------------------------

      return res.json({
        valid:
          true,

        verification: {
          verifiedAt:
            new Date().toISOString(),

          expiresAt:
            row.EXPIRES_AT,
        },

        student: {
          name:
            row.NAME,

          studentRoll:
            row.STUDENT_ROLL,

          department:
            row.DEPARTMENT,

          semester:
            row.SEMESTER,

          section:
            row.SECTION,
        },
      });

    } catch (error) {
      console.error(
        "Public Student ID verification error:",
        error
      );


      return res
        .status(500)
        .json({
          valid:
            false,

          error:
            "Unable to verify Student ID.",

          code:
            "STUDENT_ID_VERIFICATION_FAILED",
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

module.exports =
  router;