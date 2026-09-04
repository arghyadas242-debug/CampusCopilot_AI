const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");
const crypto = require("crypto");

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
// PASSWORD RESET HELPERS
// =====================================================

const RESET_OTP_EXPIRY_MINUTES = 10;

const RESET_REQUEST_WINDOW_MS =
  15 * 60 * 1000;

const RESET_REQUEST_MAX_ATTEMPTS =
  5;

const RESET_VERIFY_WINDOW_MS =
  10 * 60 * 1000;

const RESET_VERIFY_MAX_ATTEMPTS =
  10;

const resetRequestLimiter =
  new Map();

const resetVerifyLimiter =
  new Map();


function isValidEmail(
  email
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || "")
  );
}


function normalizeOtp(
  value
) {
  return String(
    value || ""
  )
    .replace(/\s+/g, "")
    .trim();
}


function isValidOtp(
  value
) {
  return /^\d{6}$/.test(
    normalizeOtp(value)
  );
}


function getClientIp(
  req
) {
  const forwarded =
    String(
      req.headers[
        "x-forwarded-for"
      ] || ""
    )
      .split(",")[0]
      .trim();

  return (
    forwarded ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}


function consumeRateLimit({
  store,
  key,
  windowMs,
  maxAttempts,
}) {
  const now =
    Date.now();

  const existing =
    store.get(key);

  if (
    !existing ||
    now - existing.startedAt >=
      windowMs
  ) {
    store.set(
      key,
      {
        startedAt:
          now,

        count:
          1,
      }
    );

    return {
      allowed:
        true,

      retryAfterSeconds:
        0,
    };
  }

  if (
    existing.count >=
    maxAttempts
  ) {
    const remainingMs =
      windowMs -
      (
        now -
        existing.startedAt
      );

    return {
      allowed:
        false,

      retryAfterSeconds:
        Math.max(
          1,
          Math.ceil(
            remainingMs /
            1000
          )
        ),
    };
  }

  existing.count +=
    1;

  store.set(
    key,
    existing
  );

  return {
    allowed:
      true,

    retryAfterSeconds:
      0,
  };
}


function clearVerifyRateLimit(
  email
) {
  const suffix =
    `:${email}`;

  for (
    const key
    of resetVerifyLimiter.keys()
  ) {
    if (
      key.endsWith(
        suffix
      )
    ) {
      resetVerifyLimiter.delete(
        key
      );
    }
  }
}


function getSmtpConfig() {
  const host =
    String(
      process.env.SMTP_HOST ||
      ""
    ).trim();

  const user =
    String(
      process.env.SMTP_USER ||
      ""
    ).trim();

  const pass =
    String(
      process.env.SMTP_PASS ||
      ""
    ).trim();

  const from =
    String(
      process.env.SMTP_FROM ||
      user ||
      ""
    ).trim();

  const port =
    Number(
      process.env.SMTP_PORT ||
      587
    );

  const secure =
    String(
      process.env.SMTP_SECURE ||
      ""
    )
      .trim()
      .toLowerCase() ===
      "true" ||
    port === 465;

  if (
    !host ||
    !user ||
    !pass ||
    !from ||
    !Number.isInteger(
      port
    ) ||
    port <= 0
  ) {
    return null;
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}


async function sendPasswordResetOtp({
  email,
  otp,
}) {
  const smtp =
    getSmtpConfig();

  if (!smtp) {
    const error =
      new Error(
        "Password reset email service is not configured."
      );

    error.code =
      "RESET_EMAIL_NOT_CONFIGURED";

    throw error;
  }

  let nodemailer;

  try {
    nodemailer =
      require("nodemailer");
  } catch {
    const error =
      new Error(
        "Nodemailer is not installed."
      );

    error.code =
      "NODEMAILER_NOT_INSTALLED";

    throw error;
  }

  const transporter =
    nodemailer.createTransport({
      host:
        smtp.host,

      port:
        smtp.port,

      secure:
        smtp.secure,

      auth: {
        user:
          smtp.user,

        pass:
          smtp.pass,
      },
    });

  await transporter.sendMail({
    from:
      smtp.from,

    to:
      email,

    subject:
      "CampusCopilot Password Reset Code",

    text:
      [
        "CampusCopilot password reset",
        "",
        `Your verification code is: ${otp}`,
        "",
        `This code expires in ${RESET_OTP_EXPIRY_MINUTES} minutes.`,
        "",
        "If you did not request a password reset, you can ignore this email.",
      ].join("\n"),

    html:
      `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 560px;
            margin: 0 auto;
            padding: 24px;
            color: #191c1e;
          "
        >
          <h2
            style="
              margin: 0 0 16px;
              color: #00236f;
            "
          >
            CampusCopilot
          </h2>

          <p>
            Use the following verification code to reset your password:
          </p>

          <div
            style="
              margin: 24px 0;
              padding: 16px;
              border-radius: 12px;
              background: #f2f4f6;
              text-align: center;
              font-size: 30px;
              font-weight: 700;
              letter-spacing: 8px;
              color: #00236f;
            "
          >
            ${otp}
          </div>

          <p>
            This code expires in
            <strong>
              ${RESET_OTP_EXPIRY_MINUTES} minutes
            </strong>.
          </p>

          <p
            style="
              color: #757682;
              font-size: 13px;
            "
          >
            If you did not request this reset,
            ignore this email.
          </p>
        </div>
      `,
  });
}


async function getLatestActiveResetOtp(
  connection,
  email
) {
  const result =
    await connection.execute(
      `
        SELECT
          id,
          email,
          otp_hash,
          expires_at,
          verified,
          used,
          created_at

        FROM password_reset_otps

        WHERE LOWER(email) =
              :email

          AND used = 0

        ORDER BY
          created_at DESC,
          id DESC

        FETCH FIRST 1 ROWS ONLY
      `,
      {
        email,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );

  return (
    result.rows[0] ||
    null
  );
}


function isOtpExpired(
  row
) {
  if (
    !row?.EXPIRES_AT
  ) {
    return true;
  }

  const expiresAt =
    new Date(
      row.EXPIRES_AT
    );

  if (
    Number.isNaN(
      expiresAt.getTime()
    )
  ) {
    return true;
  }

  return (
    expiresAt.getTime() <=
    Date.now()
  );
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
        "POST /api/auth/forgot-password",
        "POST /api/auth/verify-reset-otp",
        "POST /api/auth/reset-password",
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


      const passwordHash =
        await bcrypt.hash(
          cleanPassword,
          10
        );


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

            RETURNING id
            INTO :id
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


      await connection.commit();


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
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// =====================================================

router.post(
  "/forgot-password",
  async (req, res) => {
    const cleanEmail =
      normalizeEmail(
        req.body?.email
      );


    if (
      !cleanEmail ||
      !isValidEmail(
        cleanEmail
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Please enter a valid email address.",

          code:
            "INVALID_RESET_EMAIL",
        });
    }


    const rateKey =
      `${getClientIp(
        req
      )}:${cleanEmail}`;


    const limit =
      consumeRateLimit({
        store:
          resetRequestLimiter,

        key:
          rateKey,

        windowMs:
          RESET_REQUEST_WINDOW_MS,

        maxAttempts:
          RESET_REQUEST_MAX_ATTEMPTS,
      });


    if (!limit.allowed) {
      res.set(
        "Retry-After",
        String(
          limit.retryAfterSeconds
        )
      );

      return res
        .status(429)
        .json({
          error:
            "Too many password reset requests. Please try again later.",

          code:
            "RESET_RATE_LIMITED",

          retryAfterSeconds:
            limit.retryAfterSeconds,
        });
    }


    const smtp =
      getSmtpConfig();


    if (!smtp) {
      console.error(
        "Password reset SMTP configuration is missing."
      );

      return res
        .status(503)
        .json({
          error:
            "Password reset email service is temporarily unavailable.",

          code:
            "RESET_EMAIL_SERVICE_UNAVAILABLE",
        });
    }


    let connection;


    try {
      connection =
        await getConnection();


      const userResult =
        await connection.execute(
          `
            SELECT
              id,
              email

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
        return res.json({
          message:
            "If an account exists for this email, a password reset code has been sent.",

          code:
            "RESET_REQUEST_ACCEPTED",
        });
      }


      const accountEmail =
        normalizeEmail(
          userResult.rows[0]
            .EMAIL
        );


      await connection.execute(
        `
          UPDATE password_reset_otps

          SET used = 1

          WHERE LOWER(email) =
                :email

            AND used = 0
        `,
        {
          email:
            accountEmail,
        }
      );


      const otp =
        String(
          crypto.randomInt(
            100000,
            1000000
          )
        );


      const otpHash =
        await bcrypt.hash(
          otp,
          10
        );


      await connection.execute(
        `
          INSERT INTO password_reset_otps
          (
            email,
            otp_hash,
            expires_at,
            verified,
            used
          )

          VALUES
          (
            :email,
            :otpHash,

            SYSTIMESTAMP
              +
            NUMTODSINTERVAL(
              :expiryMinutes,
              'MINUTE'
            ),

            0,
            0
          )
        `,
        {
          email:
            accountEmail,

          otpHash,

          expiryMinutes:
            RESET_OTP_EXPIRY_MINUTES,
        }
      );


      await sendPasswordResetOtp({
        email:
          accountEmail,

        otp,
      });


      await connection.commit();


      return res.json({
        message:
          "If an account exists for this email, a password reset code has been sent.",

        code:
          "RESET_REQUEST_ACCEPTED",
      });

    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();

        } catch (
          rollbackError
        ) {
          console.error(
            "Forgot password rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Forgot Password Error:",
        error
      );


      if (
        error.code ===
          "NODEMAILER_NOT_INSTALLED" ||
        error.code ===
          "RESET_EMAIL_NOT_CONFIGURED"
      ) {
        return res
          .status(503)
          .json({
            error:
              "Password reset email service is temporarily unavailable.",

            code:
              "RESET_EMAIL_SERVICE_UNAVAILABLE",
          });
      }


      return res
        .status(500)
        .json({
          error:
            "Unable to process the password reset request right now.",

          code:
            "RESET_REQUEST_FAILED",
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// VERIFY RESET OTP
// POST /api/auth/verify-reset-otp
// =====================================================

router.post(
  "/verify-reset-otp",
  async (req, res) => {
    const cleanEmail =
      normalizeEmail(
        req.body?.email
      );


    const cleanOtp =
      normalizeOtp(
        req.body?.otp
      );


    if (
      !cleanEmail ||
      !isValidEmail(
        cleanEmail
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Please enter a valid email address.",

          code:
            "INVALID_RESET_EMAIL",
        });
    }


    if (
      !isValidOtp(
        cleanOtp
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Enter the 6-digit verification code.",

          code:
            "INVALID_RESET_OTP_FORMAT",
        });
    }


    const rateKey =
      `${getClientIp(
        req
      )}:${cleanEmail}`;


    const limit =
      consumeRateLimit({
        store:
          resetVerifyLimiter,

        key:
          rateKey,

        windowMs:
          RESET_VERIFY_WINDOW_MS,

        maxAttempts:
          RESET_VERIFY_MAX_ATTEMPTS,
      });


    if (!limit.allowed) {
      res.set(
        "Retry-After",
        String(
          limit.retryAfterSeconds
        )
      );

      return res
        .status(429)
        .json({
          error:
            "Too many verification attempts. Request a new code or try again later.",

          code:
            "RESET_VERIFY_RATE_LIMITED",

          retryAfterSeconds:
            limit.retryAfterSeconds,
        });
    }


    let connection;


    try {
      connection =
        await getConnection();


      const resetRow =
        await getLatestActiveResetOtp(
          connection,
          cleanEmail
        );


      if (
        !resetRow ||
        isOtpExpired(
          resetRow
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "The verification code is invalid or has expired.",

            code:
              "RESET_OTP_INVALID_OR_EXPIRED",
          });
      }


      const otpMatches =
        await bcrypt.compare(
          cleanOtp,
          resetRow.OTP_HASH
        );


      if (!otpMatches) {
        return res
          .status(400)
          .json({
            error:
              "The verification code is invalid or has expired.",

            code:
              "RESET_OTP_INVALID_OR_EXPIRED",
          });
      }


      await connection.execute(
        `
          UPDATE password_reset_otps

          SET verified = 1

          WHERE id =
                :resetId

            AND used = 0
        `,
        {
          resetId:
            resetRow.ID,
        }
      );


      await connection.commit();


      clearVerifyRateLimit(
        cleanEmail
      );


      return res.json({
        message:
          "Verification code confirmed.",

        code:
          "RESET_OTP_VERIFIED",
      });

    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();

        } catch (
          rollbackError
        ) {
          console.error(
            "Verify reset OTP rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Verify Reset OTP Error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to verify the reset code right now.",

          code:
            "RESET_OTP_VERIFICATION_FAILED",
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// =====================================================

router.post(
  "/reset-password",
  async (req, res) => {
    const cleanEmail =
      normalizeEmail(
        req.body?.email
      );


    const cleanOtp =
      normalizeOtp(
        req.body?.otp
      );


    const newPassword =
      String(
        req.body?.newPassword ||
        req.body?.password ||
        ""
      );


    if (
      !cleanEmail ||
      !isValidEmail(
        cleanEmail
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Please enter a valid email address.",

          code:
            "INVALID_RESET_EMAIL",
        });
    }


    if (
      !isValidOtp(
        cleanOtp
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Enter the 6-digit verification code.",

          code:
            "INVALID_RESET_OTP_FORMAT",
        });
    }


    if (
      newPassword.length <
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
      newPassword.length >
      128
    ) {
      return res
        .status(400)
        .json({
          error:
            "Password must not exceed 128 characters.",

          code:
            "PASSWORD_TOO_LONG",
        });
    }


    const rateKey =
      `${getClientIp(
        req
      )}:${cleanEmail}`;


    const limit =
      consumeRateLimit({
        store:
          resetVerifyLimiter,

        key:
          rateKey,

        windowMs:
          RESET_VERIFY_WINDOW_MS,

        maxAttempts:
          RESET_VERIFY_MAX_ATTEMPTS,
      });


    if (!limit.allowed) {
      res.set(
        "Retry-After",
        String(
          limit.retryAfterSeconds
        )
      );

      return res
        .status(429)
        .json({
          error:
            "Too many reset attempts. Request a new code or try again later.",

          code:
            "RESET_RATE_LIMITED",

          retryAfterSeconds:
            limit.retryAfterSeconds,
        });
    }


    let connection;


    try {
      connection =
        await getConnection();


      const resetRow =
        await getLatestActiveResetOtp(
          connection,
          cleanEmail
        );


      if (
        !resetRow ||
        Number(
          resetRow.VERIFIED ||
          0
        ) !== 1 ||
        isOtpExpired(
          resetRow
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Your password reset session is invalid or has expired. Request a new code.",

            code:
              "RESET_SESSION_INVALID",
          });
      }


      const otpMatches =
        await bcrypt.compare(
          cleanOtp,
          resetRow.OTP_HASH
        );


      if (!otpMatches) {
        return res
          .status(400)
          .json({
            error:
              "Your password reset session is invalid or has expired. Request a new code.",

            code:
              "RESET_SESSION_INVALID",
          });
      }


      const userResult =
        await connection.execute(
          `
            SELECT
              id,
              password_hash

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
          .status(400)
          .json({
            error:
              "Your password reset session is invalid or has expired. Request a new code.",

            code:
              "RESET_SESSION_INVALID",
          });
      }


      const oldPasswordHash =
        userResult.rows[0]
          .PASSWORD_HASH;


      if (oldPasswordHash) {
        const samePassword =
          await bcrypt.compare(
            newPassword,
            oldPasswordHash
          );


        if (
          samePassword
        ) {
          return res
            .status(400)
            .json({
              error:
                "Your new password must be different from your current password.",

              code:
                "PASSWORD_REUSE_NOT_ALLOWED",
            });
        }
      }


      const passwordHash =
        await bcrypt.hash(
          newPassword,
          10
        );


      await connection.execute(
        `
          UPDATE users

          SET password_hash =
                :passwordHash

          WHERE LOWER(email) =
                :email
        `,
        {
          passwordHash,

          email:
            cleanEmail,
        }
      );


      await connection.execute(
        `
          UPDATE password_reset_otps

          SET
            used = 1,
            verified = 1

          WHERE id =
                :resetId
        `,
        {
          resetId:
            resetRow.ID,
        }
      );


      await connection.execute(
        `
          UPDATE password_reset_otps

          SET used = 1

          WHERE LOWER(email) =
                :email

            AND used = 0
        `,
        {
          email:
            cleanEmail,
        }
      );


      await connection.commit();


      clearVerifyRateLimit(
        cleanEmail
      );


      return res.json({
        message:
          "Password reset successfully. You can now sign in with your new password.",

        code:
          "PASSWORD_RESET_SUCCESS",
      });

    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();

        } catch (
          rollbackError
        ) {
          console.error(
            "Reset password rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Reset Password Error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to reset the password right now.",

          code:
            "PASSWORD_RESET_FAILED",
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


      const role =
        String(
          user.ROLE ||
          ""
        )
          .trim()
          .toLowerCase();


      if (
        role !== "student" &&
        role !== "admin"
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


      await connection.commit();


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