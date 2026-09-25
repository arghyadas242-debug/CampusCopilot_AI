const express = require("express");
const crypto = require("crypto");
const oracledb = require("oracledb");

const getConnection = require("../db");

const {
  authenticateToken,
  requireStudent,
} = require("../middleware/authMiddleware");

const router = express.Router();

const VERIFICATION_VALID_DAYS = 30;

const FRONTEND_URL = String(
  process.env.FRONTEND_URL || "http://localhost:5173"
).replace(/\/+$/, "");

const OBJECT_ROWS = {
  outFormat: oracledb.OUT_FORMAT_OBJECT,
};

// Verification responses contain identity information or bearer tokens.
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");

  next();
});

function createVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function ownershipError() {
  const error = new Error(
    "Unable to confirm student ownership for this account."
  );

  error.statusCode = 403;
  error.publicCode = "STUDENT_ID_OWNERSHIP_FAILED";

  return error;
}

function profileMissingError() {
  const error = new Error(
    "Student profile could not be found for the authenticated account."
  );

  error.statusCode = 404;
  error.publicCode = "STUDENT_PROFILE_NOT_FOUND";

  return error;
}

function normalizedEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizedRoll(value) {
  return String(value || "").trim().toUpperCase();
}

function signedRoll(user) {
  const values = [
    user?.studentRoll,
    user?.rollNumber,
    user?.student_roll,
    user?.STUDENT_ROLL,
  ].filter(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );

  const rolls = values.map((value) => {
    if (
      typeof value !== "string" &&
      typeof value !== "number"
    ) {
      throw ownershipError();
    }

    const roll = String(value).trim();

    if (
      !roll ||
      roll.length > 100 ||
      /[\x00-\x1f\x7f]/.test(roll)
    ) {
      throw ownershipError();
    }

    return roll;
  });

  if (
    new Set(rolls.map(normalizedRoll)).size > 1
  ) {
    throw ownershipError();
  }

  return rolls[0] || "";
}

async function findOneStudent(
  connection,
  sql,
  binds
) {
  const result = await connection.execute(
    sql,
    binds,
    OBJECT_ROWS
  );

  if (result.rows.length > 1) {
    throw ownershipError();
  }

  return result.rows[0] || null;
}

function verifyIdentity(student, email, roll) {
  if (!student) {
    return null;
  }

  if (!String(student.STUDENT_ROLL || "").trim()) {
    throw ownershipError();
  }

  if (
    email &&
    normalizedEmail(student.EMAIL) !== email
  ) {
    throw ownershipError();
  }

  if (
    roll &&
    normalizedRoll(student.STUDENT_ROLL) !==
      normalizedRoll(roll)
  ) {
    throw ownershipError();
  }

  return student;
}

async function getAuthenticatedStudent(
  connection,
  user
) {
  const rawEmail = user?.email ?? user?.EMAIL ?? "";

  if (typeof rawEmail !== "string") {
    throw ownershipError();
  }

  const email = normalizedEmail(rawEmail);
  const roll = signedRoll(user);

  // Prefer the authenticated account's email.
  if (email) {
    const student = await findOneStudent(
      connection,
      `
        SELECT
          STUDENT_ROLL,
          NAME,
          EMAIL,
          DEPARTMENT,
          SEMESTER,
          SECTION
        FROM STUDENTS
        WHERE LOWER(TRIM(EMAIL)) = :email
        FETCH FIRST 2 ROWS ONLY
      `,
      { email }
    );

    if (student) {
      return verifyIdentity(student, email, roll);
    }
  }

  // Signed roll claims are a fallback, not request-body identity.
  if (roll) {
    const student = await findOneStudent(
      connection,
      `
        SELECT
          STUDENT_ROLL,
          NAME,
          EMAIL,
          DEPARTMENT,
          SEMESTER,
          SECTION
        FROM STUDENTS
        WHERE UPPER(TRIM(STUDENT_ROLL)) = :studentRoll
        FETCH FIRST 2 ROWS ONLY
      `,
      {
        studentRoll: normalizedRoll(roll),
      }
    );

    if (student) {
      return verifyIdentity(student, email, roll);
    }
  }

  const rawId =
    user?.id ??
    user?.userId ??
    user?.user_id ??
    user?.ID;

  if (rawId !== undefined && rawId !== null) {
    if (
      (
        typeof rawId !== "number" &&
        typeof rawId !== "string"
      ) ||
      !Number.isSafeInteger(Number(rawId)) ||
      Number(rawId) <= 0
    ) {
      throw ownershipError();
    }

    const student = await findOneStudent(
      connection,
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
          ON LOWER(TRIM(S.EMAIL)) =
             LOWER(TRIM(U.EMAIL))
        WHERE U.ID = :userId
        FETCH FIRST 2 ROWS ONLY
      `,
      {
        userId: Number(rawId),
      }
    );

    if (student) {
      return verifyIdentity(student, email, roll);
    }
  }

  return null;
}

async function lockStudent(connection, student) {
  // The parent row exists even before the first token is created.
  // Both rotation and revocation acquire this same lock.
  const result = await connection.execute(
    `
      SELECT
        STUDENT_ROLL,
        EMAIL
      FROM STUDENTS
      WHERE STUDENT_ROLL = :studentRoll
      FOR UPDATE WAIT 5
    `,
    {
      studentRoll: String(student.STUDENT_ROLL).trim(),
    },
    {
      ...OBJECT_ROWS,
      autoCommit: false,
    }
  );

  if (result.rows.length !== 1) {
    throw ownershipError();
  }

  const locked = result.rows[0];

  if (
    normalizedEmail(locked.EMAIL) !==
    normalizedEmail(student.EMAIL)
  ) {
    throw ownershipError();
  }

  return String(locked.STUDENT_ROLL).trim();
}

async function rollback(connection) {
  if (!connection) {
    return;
  }

  try {
    await connection.rollback();
  } catch (error) {
    console.error(
      "Student ID rollback error:",
      error
    );
  }
}

async function closeConnection(connection) {
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

function sendStudentError(
  res,
  error,
  message,
  code
) {
  if (
    error.publicCode === "STUDENT_ID_OWNERSHIP_FAILED" ||
    error.publicCode === "STUDENT_PROFILE_NOT_FOUND"
  ) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.publicCode,
    });
  }

  if (
    error.errorNum === 54 ||
    error.errorNum === 30006
  ) {
    return res.status(409).json({
      error:
        "Another Student ID update is in progress. Please try again.",
      code: "STUDENT_ID_UPDATE_BUSY",
    });
  }

  return res.status(500).json({
    error: message,
    code,
  });
}

// =====================================================
// CREATE / ROTATE VERIFICATION TOKEN
// POST /api/student-id/verification
// =====================================================

router.post(
  "/verification",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    let connection;
    let committed = false;

    try {
      connection = await getConnection();

      const student = await getAuthenticatedStudent(
        connection,
        req.user
      );

      if (!student) {
        throw profileMissingError();
      }

      const studentRoll = await lockStudent(
        connection,
        student
      );

      await connection.execute(
        `
          UPDATE STUDENT_ID_VERIFICATIONS
          SET REVOKED_AT = SYSTIMESTAMP
          WHERE STUDENT_ROLL = :studentRoll
            AND REVOKED_AT IS NULL
            AND EXPIRES_AT > SYSTIMESTAMP
        `,
        { studentRoll },
        { autoCommit: false }
      );

      const rawToken = createVerificationToken();
      const tokenHash = hashToken(rawToken);

      const expiresAt = new Date(
        Date.now() +
          VERIFICATION_VALID_DAYS * 24 * 60 * 60 * 1000
      );

      const verificationUrl =
        `${FRONTEND_URL}/verify-student/${encodeURIComponent(
          rawToken
        )}`;

      const payload = {
        success: true,

        verification: {
          token: rawToken,
          verificationUrl,
          expiresAt: expiresAt.toISOString(),
          validDays: VERIFICATION_VALID_DAYS,
        },
      };

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
        },
        {
          autoCommit: false,
        }
      );

      await connection.commit();
      committed = true;

      return res.status(201).json(payload);
    } catch (error) {
      console.error(
        "Create Student ID verification error:",
        error
      );

      return sendStudentError(
        res,
        error,
        "Unable to create Student ID verification.",
        "STUDENT_ID_VERIFICATION_CREATE_FAILED"
      );
    } finally {
      if (!committed) {
        await rollback(connection);
      }

      await closeConnection(connection);
    }
  }
);

// =====================================================
// CURRENT VERIFICATION STATUS
// GET /api/student-id/verification
// Does not return the raw token.
// =====================================================

router.get(
  "/verification",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    let connection;

    try {
      connection = await getConnection();

      const student = await getAuthenticatedStudent(
        connection,
        req.user
      );

      if (!student) {
        throw profileMissingError();
      }

      const studentRoll =
        String(student.STUDENT_ROLL).trim();

      const result = await connection.execute(
        `
          SELECT
            VERIFICATION_ID,
            CREATED_AT,
            EXPIRES_AT
          FROM STUDENT_ID_VERIFICATIONS
          WHERE STUDENT_ROLL = :studentRoll
            AND REVOKED_AT IS NULL
            AND EXPIRES_AT > SYSTIMESTAMP
          ORDER BY
            CREATED_AT DESC,
            VERIFICATION_ID DESC
          FETCH FIRST 1 ROW ONLY
        `,
        { studentRoll },
        OBJECT_ROWS
      );

      if (!result.rows.length) {
        return res.json({
          active: false,
          verification: null,
        });
      }

      const verification = result.rows[0];

      return res.json({
        active: true,

        verification: {
          id: verification.VERIFICATION_ID,
          createdAt: verification.CREATED_AT,
          expiresAt: verification.EXPIRES_AT,
        },
      });
    } catch (error) {
      console.error(
        "Student ID verification status error:",
        error
      );

      return sendStudentError(
        res,
        error,
        "Unable to load Student ID verification status.",
        "STUDENT_ID_VERIFICATION_STATUS_FAILED"
      );
    } finally {
      await closeConnection(connection);
    }
  }
);

// =====================================================
// REVOKE CURRENT VERIFICATION
// DELETE /api/student-id/verification
// =====================================================

router.delete(
  "/verification",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    let connection;
    let committed = false;

    try {
      connection = await getConnection();

      const student = await getAuthenticatedStudent(
        connection,
        req.user
      );

      if (!student) {
        throw profileMissingError();
      }

      const studentRoll = await lockStudent(
        connection,
        student
      );

      const result = await connection.execute(
        `
          UPDATE STUDENT_ID_VERIFICATIONS
          SET REVOKED_AT = SYSTIMESTAMP
          WHERE STUDENT_ROLL = :studentRoll
            AND REVOKED_AT IS NULL
            AND EXPIRES_AT > SYSTIMESTAMP
        `,
        { studentRoll },
        { autoCommit: false }
      );

      await connection.commit();
      committed = true;

      return res.json({
        success: true,
        revoked: result.rowsAffected > 0,
      });
    } catch (error) {
      console.error(
        "Revoke Student ID verification error:",
        error
      );

      return sendStudentError(
        res,
        error,
        "Unable to revoke Student ID verification.",
        "STUDENT_ID_VERIFICATION_REVOKE_FAILED"
      );
    } finally {
      if (!committed) {
        await rollback(connection);
      }

      await closeConnection(connection);
    }
  }
);

// =====================================================
// PUBLIC QR VERIFICATION
// GET /api/student-id/verify/:token
//
// Possession of an active QR token permits verification.
// No JWT is required for this endpoint.
// =====================================================

router.get(
  "/verify/:token",
  async (req, res) => {
    let connection;

    try {
      const token = String(
        req.params.token || ""
      ).trim();

      if (!/^[a-f0-9]{64}$/i.test(token)) {
        return res.json({
          valid: false,
          code: "VERIFICATION_INVALID",
        });
      }

      const tokenHash = hashToken(token);

      connection = await getConnection();

      const result = await connection.execute(
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
            ON S.STUDENT_ROLL = V.STUDENT_ROLL
          WHERE V.TOKEN_HASH = :tokenHash
            AND V.REVOKED_AT IS NULL
            AND V.EXPIRES_AT > SYSTIMESTAMP
          FETCH FIRST 2 ROWS ONLY
        `,
        { tokenHash },
        OBJECT_ROWS
      );

      if (result.rows.length !== 1) {
        return res.json({
          valid: false,
          code: "VERIFICATION_INVALID",
        });
      }

      const row = result.rows[0];

      return res.json({
        valid: true,

        verification: {
          verifiedAt: new Date().toISOString(),
          expiresAt: row.EXPIRES_AT,
        },

        student: {
          name: row.NAME,
          studentRoll: row.STUDENT_ROLL,
          department: row.DEPARTMENT,
          semester: row.SEMESTER,
          section: row.SECTION,
        },
      });
    } catch (error) {
      console.error(
        "Public Student ID verification error:",
        error
      );

      return res.status(500).json({
        valid: false,
        error: "Unable to verify Student ID.",
        code: "STUDENT_ID_VERIFICATION_FAILED",
      });
    } finally {
      await closeConnection(connection);
    }
  }
);

module.exports = router;