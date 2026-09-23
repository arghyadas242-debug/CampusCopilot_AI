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

const DB_OPTIONS = {
  outFormat: oracledb.OUT_FORMAT_OBJECT,
};

const RESET_OTP_EXPIRY_MINUTES = 10;

// =====================================================
// HELPERS
// =====================================================

function fail(res, status, error, code, extra = {}) {
  return res.status(status).json({
    error,
    code,
    ...extra,
  });
}

function normalizeEmail(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function isValidEmail(value) {
  return (
    value.length <= 150 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function normalizeOtp(value) {
  return ["string", "number"].includes(typeof value)
    ? String(value).replace(/\s+/g, "").trim()
    : "";
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  return secret && secret.trim() ? secret : null;
}

function normalizeSemester(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (!["string", "number"].includes(typeof value)) {
    return null;
  }

  const semester = Number(value);

  return (
    Number.isInteger(semester) &&
    semester >= 1 &&
    semester <= 8
  )
    ? semester
    : null;
}

function normalizeSection(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return (
    String(value)
      .replace(/^section\s+/i, "")
      .trim() || null
  );
}

function passwordProblem(password) {
  if (
    typeof password !== "string" ||
    password.length < 6
  ) {
    return [
      "Password must contain at least 6 characters.",
      "PASSWORD_TOO_SHORT",
    ];
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    return [
      "Password must not exceed 72 UTF-8 bytes.",
      "PASSWORD_TOO_LONG",
    ];
  }

  return null;
}

function firstOutBind(value) {
  return Array.isArray(value) ? value[0] : value;
}

async function closeConnection(connection) {
  if (!connection) {
    return;
  }

  // Release locks and uncommitted changes on early returns.
  try {
    await connection.rollback();
  } catch (error) {
    console.error("Auth rollback error:", error);
  }

  try {
    await connection.close();
  } catch (error) {
    console.error("Auth DB connection close error:", error);
  }
}

function signToken(user, secret) {
  return jwt.sign(user, secret, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

// =====================================================
// PASSWORD RESET RATE LIMITS
// =====================================================

// Account limits remain the same when the caller changes IP.
// IP limits use Express's req.ip, never a raw forwarding header.

const resetLimits = new Map();
const MAX_LIMIT_KEYS = 20000;

function pruneLimits() {
  const now = Date.now();

  for (const [key, entry] of resetLimits) {
    if (entry.expiresAt <= now) {
      resetLimits.delete(key);
    }
  }
}

const cleanupTimer = setInterval(pruneLimits, 60000);
cleanupTimer.unref();

function consumeLimit(key, windowMs, maximum) {
  const now = Date.now();
  let entry = resetLimits.get(key);

  if (!entry || entry.expiresAt <= now) {
    if (resetLimits.size >= MAX_LIMIT_KEYS) {
      pruneLimits();
    }

    if (
      !resetLimits.has(key) &&
      resetLimits.size >= MAX_LIMIT_KEYS
    ) {
      return 60;
    }

    entry = {
      count: 0,
      expiresAt: now + windowMs,
    };

    resetLimits.set(key, entry);
  }

  if (entry.count >= maximum) {
    return Math.max(
      1,
      Math.ceil((entry.expiresAt - now) / 1000)
    );
  }

  entry.count += 1;

  return 0;
}

function allowResetAttempt(req, res, email, purpose) {
  const request = purpose === "request";

  const windowMs =
    (request ? 15 : 10) * 60 * 1000;

  const ip =
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown";

  const ipRetry = consumeLimit(
    JSON.stringify([purpose, "ip", ip]),
    windowMs,
    request ? 10 : 20
  );

  if (ipRetry) {
    res.set("Retry-After", String(ipRetry));

    fail(
      res,
      429,
      "Too many password reset attempts. Please try again later.",
      "RESET_RATE_LIMITED",
      {
        retryAfterSeconds: ipRetry,
      }
    );

    return false;
  }

  const accountRetry = consumeLimit(
    JSON.stringify([purpose, "email", email]),
    windowMs,
    request ? 5 : 10
  );

  if (accountRetry) {
    res.set("Retry-After", String(accountRetry));

    fail(
      res,
      429,
      "Too many password reset attempts. Please try again later.",
      "RESET_RATE_LIMITED",
      {
        retryAfterSeconds: accountRetry,
      }
    );

    return false;
  }

  return true;
}

// =====================================================
// PASSWORD RESET EMAIL
// =====================================================

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  const from = String(
    process.env.SMTP_FROM || user || ""
  ).trim();

  const port = Number(process.env.SMTP_PORT || 587);

  const secure =
    String(process.env.SMTP_SECURE || "")
      .trim()
      .toLowerCase() === "true" ||
    port === 465;

  if (
    !host ||
    !user ||
    !pass ||
    !from ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535
  ) {
    return null;
  }

  return {
    host,
    user,
    pass,
    from,
    port,
    secure,
  };
}

async function sendPasswordResetOtp({ email, otp }) {
  const smtp = getSmtpConfig();

  if (!smtp) {
    const error = new Error(
      "Password reset email service is not configured."
    );

    error.code = "RESET_EMAIL_NOT_CONFIGURED";
    throw error;
  }

  let nodemailer;

  try {
    nodemailer = require("nodemailer");
  } catch {
    const error = new Error("Nodemailer is not installed.");

    error.code = "NODEMAILER_NOT_INSTALLED";
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,

    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  await transporter.sendMail({
    from: smtp.from,
    to: email,
    subject: "CampusCopilot Password Reset Code",

    text: [
      "CampusCopilot password reset",
      "",
      `Your verification code is: ${otp}`,
      "",
      `This code expires in ${RESET_OTP_EXPIRY_MINUTES} minutes.`,
      "",
      "If you did not request a password reset, you can ignore this email.",
    ].join("\n"),

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 560px;
        margin: 0 auto;
        padding: 24px;
        color: #191c1e;
      ">
        <h2 style="margin: 0 0 16px; color: #00236f;">
          CampusCopilot
        </h2>

        <p>
          Use the following verification code to reset your password:
        </p>

        <div style="
          margin: 24px 0;
          padding: 16px;
          border-radius: 12px;
          background: #f2f4f6;
          text-align: center;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: 8px;
          color: #00236f;
        ">
          ${otp}
        </div>

        <p>
          This code expires in
          <strong>${RESET_OTP_EXPIRY_MINUTES} minutes</strong>.
        </p>

        <p style="color: #757682; font-size: 13px;">
          If you did not request this reset, ignore this email.
        </p>
      </div>
    `,
  });
}

// =====================================================
// PASSWORD RESET TRANSACTION HELPERS
// =====================================================

// Every OTP operation locks the same account row first.
// Concurrent reset requests for that account must wait.

async function lockResetAccount(connection, email) {
  const result = await connection.execute(
    `
      SELECT
        id,
        email,
        password_hash,
        token_version
      FROM users
      WHERE LOWER(email) = :email
      FOR UPDATE WAIT 5
    `,
    { email },
    DB_OPTIONS
  );

  if (result.rows.length > 1) {
    throw new Error("Ambiguous reset account.");
  }

  return result.rows[0] || null;
}

async function getLatestActiveResetOtp(connection, email) {
  const result = await connection.execute(
    `
      SELECT
        id,
        email,
        otp_hash,
        expires_at,
        verified,
        used,
        created_at,

        CASE
          WHEN expires_at > SYSTIMESTAMP THEN 1
          ELSE 0
        END AS is_active

      FROM password_reset_otps

      WHERE LOWER(email) = :email
        AND used = 0

      ORDER BY created_at DESC, id DESC
      FETCH FIRST 1 ROWS ONLY
    `,
    { email },
    DB_OPTIONS
  );

  return result.rows[0] || null;
}

function acceptedReset(res) {
  return res.json({
    message:
      "If an account exists for this email, a password reset code has been sent.",
    code: "RESET_REQUEST_ACCEPTED",
  });
}

function invalidReset(res) {
  return fail(
    res,
    400,
    "Your password reset session is invalid or has expired. Request a new code.",
    "RESET_SESSION_INVALID"
  );
}

// =====================================================
// AUTH STATUS
// =====================================================

router.get("/", (req, res) => {
  return res.json({
    service: "CampusCopilot Authentication API",

    endpoints: [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "POST /api/auth/forgot-password",
      "POST /api/auth/verify-reset-otp",
      "POST /api/auth/reset-password",
      "GET /api/auth/me",
    ],
  });
});

// =====================================================
// AUTH REQUEST VALIDATION
// =====================================================

router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");

  if (
    req.method === "POST" &&
    (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    )
  ) {
    return fail(
      res,
      400,
      "A JSON request object is required.",
      "INVALID_REQUEST_BODY"
    );
  }

  return next();
});

// =====================================================
// REGISTER STUDENT
// =====================================================

router.post("/register", async (req, res) => {
  const {
    name,
    email,
    password,
    rollNumber,
    studentRoll,
    department,
    semester,
    section,
  } = req.body;

  const cleanName =
    typeof name === "string" ? name.trim() : "";

  const cleanEmail = normalizeEmail(email);
  const rawRoll = rollNumber || studentRoll;

  const cleanRoll =
    typeof rawRoll === "string" ||
    (
      typeof rawRoll === "number" &&
      Number.isSafeInteger(rawRoll)
    )
      ? String(rawRoll).trim()
      : "";

  if (
    !cleanName ||
    !cleanEmail ||
    typeof password !== "string" ||
    !password ||
    !cleanRoll
  ) {
    return fail(
      res,
      400,
      "Name, email, password and student roll number are required.",
      "REGISTRATION_FIELDS_REQUIRED"
    );
  }

  if (
    !isValidEmail(cleanEmail) ||
    cleanName.length > 100 ||
    cleanRoll.length > 100 ||
    /[\u0000-\u001f\u007f]/.test(cleanRoll)
  ) {
    return fail(
      res,
      400,
      "Invalid name, email or student roll number.",
      "INVALID_REGISTRATION_INPUT"
    );
  }

  if (
    rollNumber !== undefined &&
    studentRoll !== undefined &&
    String(rollNumber).trim() !== String(studentRoll).trim()
  ) {
    return fail(
      res,
      400,
      "Conflicting student roll numbers were supplied.",
      "INVALID_REGISTRATION_INPUT"
    );
  }

  if (
    (
      department != null &&
      typeof department !== "string"
    ) ||
    (
      section != null &&
      !["string", "number"].includes(typeof section)
    )
  ) {
    return fail(
      res,
      400,
      "Invalid department or section.",
      "INVALID_REGISTRATION_INPUT"
    );
  }

  const problem = passwordProblem(password);

  if (problem) {
    return fail(res, 400, ...problem);
  }

  const cleanDepartment = department?.trim() || null;
  const cleanSemester = normalizeSemester(semester);
  const cleanSection = normalizeSection(section);

  if (
    semester !== undefined &&
    semester !== null &&
    semester !== "" &&
    cleanSemester === null
  ) {
    return fail(
      res,
      400,
      "Semester must be a number between 1 and 8.",
      "INVALID_SEMESTER"
    );
  }

  const secret = getJwtSecret();

  if (!secret) {
    return fail(
      res,
      500,
      "Authentication service is not configured correctly.",
      "AUTH_CONFIGURATION_ERROR"
    );
  }

  let connection;

  try {
    connection = await getConnection();

    const existingUser = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = :email
      `,
      { email: cleanEmail },
      DB_OPTIONS
    );

    if (existingUser.rows.length) {
      return fail(
        res,
        409,
        "An account with this email already exists.",
        "EMAIL_ALREADY_REGISTERED"
      );
    }

    const existingEmail = await connection.execute(
      `
        SELECT student_id
        FROM students
        WHERE LOWER(email) = :email
      `,
      { email: cleanEmail },
      DB_OPTIONS
    );

    if (existingEmail.rows.length) {
      return fail(
        res,
        409,
        "A student profile with this email already exists.",
        "STUDENT_EMAIL_EXISTS"
      );
    }

    const existingRoll = await connection.execute(
      `
        SELECT student_id
        FROM students
        WHERE LOWER(student_roll) = LOWER(:studentRoll)
      `,
      { studentRoll: cleanRoll },
      DB_OPTIONS
    );

    if (existingRoll.rows.length) {
      return fail(
        res,
        409,
        "This student roll number is already registered.",
        "STUDENT_ROLL_EXISTS"
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insertedUser = await connection.execute(
      `
        INSERT INTO users
          (name, email, password_hash, role, token_version)
        VALUES
          (:name, :email, :passwordHash, 'student', 0)
        RETURNING id INTO :id
      `,
      {
        name: cleanName,
        email: cleanEmail,
        passwordHash,

        id: {
          type: oracledb.NUMBER,
          dir: oracledb.BIND_OUT,
        },
      },
      {
        autoCommit: false,
      }
    );

    const userId = firstOutBind(insertedUser.outBinds.id);

    const insertedStudent = await connection.execute(
      `
        INSERT INTO students
          (name, email, department, semester, section, student_roll)
        VALUES
          (:name, :email, :department, :semester, :section, :studentRoll)
        RETURNING student_id INTO :studentId
      `,
      {
        name: cleanName,
        email: cleanEmail,
        department: cleanDepartment,
        semester: cleanSemester,
        section: cleanSection,
        studentRoll: cleanRoll,

        studentId: {
          type: oracledb.NUMBER,
          dir: oracledb.BIND_OUT,
        },
      },
      {
        autoCommit: false,
      }
    );

    const studentId = firstOutBind(
      insertedStudent.outBinds.studentId
    );

    const token = signToken(
      {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        role: "student",
        rollNumber: cleanRoll,
        tokenVersion: 0,
      },
      secret
    );

    await connection.commit();

    return res.status(201).json({
      message: "Student registered successfully.",
      token,

      user: {
        id: userId,
        studentId,
        name: cleanName,
        email: cleanEmail,
        role: "student",
        rollNumber: cleanRoll,
        department: cleanDepartment,
        semester: cleanSemester,
        section: cleanSection,
        lastLogin: null,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);

    if (error.errorNum === 1) {
      return fail(
        res,
        409,
        "A user with this email or student roll already exists.",
        "DUPLICATE_ACCOUNT"
      );
    }

    return fail(
      res,
      500,
      "Unable to register student.",
      "REGISTRATION_FAILED"
    );
  } finally {
    await closeConnection(connection);
  }
});

// =====================================================
// FORGOT PASSWORD
// =====================================================

router.post("/forgot-password", async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!isValidEmail(email)) {
    return fail(
      res,
      400,
      "Please enter a valid email address.",
      "INVALID_RESET_EMAIL"
    );
  }

  if (!allowResetAttempt(req, res, email, "request")) {
    return;
  }

  if (!getSmtpConfig()) {
    return fail(
      res,
      503,
      "Password reset email service is temporarily unavailable.",
      "RESET_EMAIL_SERVICE_UNAVAILABLE"
    );
  }

  let connection;

  try {
    connection = await getConnection();

    const user = await lockResetAccount(connection, email);

    if (!user) {
      return acceptedReset(res);
    }

    await connection.execute(
      `
        UPDATE password_reset_otps
        SET used = 1
        WHERE LOWER(email) = :email
          AND used = 0
      `,
      { email }
    );

    const otp = String(
      crypto.randomInt(100000, 1000000)
    );

    const otpHash = await bcrypt.hash(otp, 10);

    await connection.execute(
      `
        INSERT INTO password_reset_otps
          (email, otp_hash, expires_at, verified, used)
        VALUES
          (
            :email,
            :otpHash,
            SYSTIMESTAMP
              + NUMTODSINTERVAL(:expiryMinutes, 'MINUTE'),
            0,
            0
          )
      `,
      {
        email,
        otpHash,
        expiryMinutes: RESET_OTP_EXPIRY_MINUTES,
      }
    );

    await sendPasswordResetOtp({
      email: normalizeEmail(user.EMAIL),
      otp,
    });

    await connection.commit();

    return acceptedReset(res);
  } catch (error) {
    console.error("Forgot Password Error:", error);

    if (
      [
        "NODEMAILER_NOT_INSTALLED",
        "RESET_EMAIL_NOT_CONFIGURED",
      ].includes(error.code)
    ) {
      return fail(
        res,
        503,
        "Password reset email service is temporarily unavailable.",
        "RESET_EMAIL_SERVICE_UNAVAILABLE"
      );
    }

    return fail(
      res,
      500,
      "Unable to process the password reset request right now.",
      "RESET_REQUEST_FAILED"
    );
  } finally {
    await closeConnection(connection);
  }
});

// =====================================================
// VERIFY RESET OTP
// =====================================================

router.post("/verify-reset-otp", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = normalizeOtp(req.body.otp);

  if (!isValidEmail(email)) {
    return fail(
      res,
      400,
      "Please enter a valid email address.",
      "INVALID_RESET_EMAIL"
    );
  }

  if (!/^\d{6}$/.test(otp)) {
    return fail(
      res,
      400,
      "Enter the 6-digit verification code.",
      "INVALID_RESET_OTP_FORMAT"
    );
  }

  if (!allowResetAttempt(req, res, email, "verify")) {
    return;
  }

  let connection;

  try {
    connection = await getConnection();

    const user = await lockResetAccount(connection, email);

    const row = user
      ? await getLatestActiveResetOtp(connection, email)
      : null;

    if (
      !row ||
      Number(row.IS_ACTIVE) !== 1 ||
      !(await bcrypt.compare(otp, row.OTP_HASH))
    ) {
      return fail(
        res,
        400,
        "The verification code is invalid or has expired.",
        "RESET_OTP_INVALID_OR_EXPIRED"
      );
    }

    const result = await connection.execute(
      `
        UPDATE password_reset_otps
        SET verified = 1
        WHERE id = :resetId
          AND used = 0
          AND expires_at > SYSTIMESTAMP
      `,
      {
        resetId: row.ID,
      }
    );

    if (result.rowsAffected !== 1) {
      return fail(
        res,
        400,
        "The verification code is invalid or has expired.",
        "RESET_OTP_INVALID_OR_EXPIRED"
      );
    }

    await connection.commit();

    return res.json({
      message: "Verification code confirmed.",
      code: "RESET_OTP_VERIFIED",
    });
  } catch (error) {
    console.error("Verify Reset OTP Error:", error);

    return fail(
      res,
      500,
      "Unable to verify the reset code right now.",
      "RESET_OTP_VERIFICATION_FAILED"
    );
  } finally {
    await closeConnection(connection);
  }
});

// =====================================================
// RESET PASSWORD
// =====================================================

router.post("/reset-password", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = normalizeOtp(req.body.otp);

  const password =
    req.body.newPassword || req.body.password;

  if (!isValidEmail(email)) {
    return fail(
      res,
      400,
      "Please enter a valid email address.",
      "INVALID_RESET_EMAIL"
    );
  }

  if (!/^\d{6}$/.test(otp)) {
    return fail(
      res,
      400,
      "Enter the 6-digit verification code.",
      "INVALID_RESET_OTP_FORMAT"
    );
  }

  const problem = passwordProblem(password);

  if (problem) {
    return fail(res, 400, ...problem);
  }

  if (!allowResetAttempt(req, res, email, "verify")) {
    return;
  }

  let connection;

  try {
    connection = await getConnection();

    const user = await lockResetAccount(connection, email);

    const row = user
      ? await getLatestActiveResetOtp(connection, email)
      : null;

    if (
      !row ||
      Number(row.IS_ACTIVE) !== 1 ||
      Number(row.VERIFIED) !== 1 ||
      !(await bcrypt.compare(otp, row.OTP_HASH))
    ) {
      return invalidReset(res);
    }

    if (
      await bcrypt.compare(password, user.PASSWORD_HASH)
    ) {
      return fail(
        res,
        400,
        "Your new password must be different from your current password.",
        "PASSWORD_REUSE_NOT_ALLOWED"
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Recheck expiry after hashing and consume the OTP
    // in the same transaction as the password change.
    const consumed = await connection.execute(
      `
        UPDATE password_reset_otps
        SET
          used = 1,
          verified = 1
        WHERE id = :resetId
          AND used = 0
          AND verified = 1
          AND expires_at > SYSTIMESTAMP
      `,
      {
        resetId: row.ID,
      }
    );

    if (consumed.rowsAffected !== 1) {
      return invalidReset(res);
    }

    const updated = await connection.execute(
      `
        UPDATE users
        SET
          password_hash = :passwordHash,
          token_version = token_version + 1
        WHERE id = :userId
      `,
      {
        passwordHash,
        userId: user.ID,
      }
    );

    if (updated.rowsAffected !== 1) {
      throw new Error("Reset account update failed.");
    }

    await connection.execute(
      `
        UPDATE password_reset_otps
        SET used = 1
        WHERE LOWER(email) = :email
          AND used = 0
      `,
      { email }
    );

    await connection.commit();

    return res.json({
      message:
        "Password reset successfully. You can now sign in with your new password.",
      code: "PASSWORD_RESET_SUCCESS",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);

    return fail(
      res,
      500,
      "Unable to reset the password right now.",
      "PASSWORD_RESET_FAILED"
    );
  } finally {
    await closeConnection(connection);
  }
});

// =====================================================
// ACCOUNT PROFILE
// =====================================================

async function buildProfile(connection, user) {
  const role = String(user.ROLE || "")
    .trim()
    .toLowerCase();

  if (!["student", "admin"].includes(role)) {
    return {
      error: "This account role is not supported.",
      code: "INVALID_ACCOUNT_ROLE",
    };
  }

  const profile = {
    id: user.ID,
    studentId: null,
    name: user.NAME,
    email: user.EMAIL,
    role,
    rollNumber: role === "admin" ? "ADMIN" : null,

    department:
      role === "admin"
        ? "University Administration"
        : null,

    semester: null,
    section: null,
    lastLogin: user.LAST_LOGIN_AT || null,
  };

  if (role === "admin") {
    return { profile };
  }

  const result = await connection.execute(
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
      WHERE LOWER(email) = :email
    `,
    {
      email: normalizeEmail(user.EMAIL),
    },
    DB_OPTIONS
  );

  if (result.rows.length !== 1) {
    return {
      error:
        "Your account is not linked to a unique student academic profile.",
      code: "STUDENT_PROFILE_NOT_FOUND",
    };
  }

  const student = result.rows[0];

  const roll = String(
    student.STUDENT_ROLL || ""
  ).trim();

  if (!roll) {
    return {
      error:
        "Your student profile does not contain a roll number.",
      code: "STUDENT_ROLL_NOT_FOUND",
    };
  }

  return {
    profile: {
      ...profile,
      studentId: student.STUDENT_ID,
      name: student.NAME || user.NAME,
      rollNumber: roll,
      department: student.DEPARTMENT,
      semester: student.SEMESTER,
      section: student.SECTION,
    },
  };
}

// =====================================================
// LOGIN
// =====================================================

router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (
    !email ||
    typeof password !== "string" ||
    !password
  ) {
    return fail(
      res,
      400,
      "Email and password are required.",
      "LOGIN_FIELDS_REQUIRED"
    );
  }

  // Allow existing passwords while bounding malformed requests.
  if (
    !isValidEmail(email) ||
    password.length > 1024
  ) {
    return fail(
      res,
      401,
      "Invalid email or password.",
      "INVALID_CREDENTIALS"
    );
  }

  const secret = getJwtSecret();

  if (!secret) {
    return fail(
      res,
      500,
      "Authentication service is not configured correctly.",
      "AUTH_CONFIGURATION_ERROR"
    );
  }

  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
        SELECT
          id,
          name,
          email,
          password_hash,
          role,
          last_login_at,
          token_version
        FROM users
        WHERE LOWER(email) = :email
      `,
      { email },
      DB_OPTIONS
    );

    const user =
      result.rows.length === 1
        ? result.rows[0]
        : null;

    if (
      !user ||
      !user.PASSWORD_HASH ||
      !(await bcrypt.compare(password, user.PASSWORD_HASH))
    ) {
      return fail(
        res,
        401,
        "Invalid email or password.",
        "INVALID_CREDENTIALS"
      );
    }

    const built = await buildProfile(connection, user);

    if (!built.profile) {
      return fail(res, 403, built.error, built.code);
    }

    const profile = built.profile;
    const tokenVersion = Number(user.TOKEN_VERSION);

    if (
      !Number.isSafeInteger(tokenVersion) ||
      tokenVersion < 0
    ) {
      throw new Error("Invalid token version.");
    }

    const token = signToken(
      {
        id: user.ID,
        name: profile.name,
        email: user.EMAIL,
        role: profile.role,
        rollNumber: profile.rollNumber,
        tokenVersion,
      },
      secret
    );

    await connection.execute(
      `
        UPDATE users
        SET last_login_at = SYSTIMESTAMP
        WHERE id = :userId
      `,
      {
        userId: user.ID,
      }
    );

    const lastLogin = await connection.execute(
      `
        SELECT last_login_at
        FROM users
        WHERE id = :userId
      `,
      {
        userId: user.ID,
      },
      DB_OPTIONS
    );

    profile.lastLogin =
      lastLogin.rows[0]?.LAST_LOGIN_AT || null;

    await connection.commit();

    return res.json({
      message: "Login successful.",
      token,
      user: profile,
    });
  } catch (error) {
    console.error("Login Error:", error);

    return fail(
      res,
      500,
      "Unable to sign in right now.",
      "LOGIN_FAILED"
    );
  } finally {
    await closeConnection(connection);
  }
});

// =====================================================
// CURRENT AUTHENTICATED ACCOUNT
// =====================================================

router.get("/me", authenticateToken, async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
        SELECT
          id,
          name,
          email,
          role,
          last_login_at
        FROM users
        WHERE id = :userId
      `,
      {
        userId: req.user.id,
      },
      DB_OPTIONS
    );

    if (!result.rows.length) {
      return fail(
        res,
        404,
        "Authenticated account was not found.",
        "ACCOUNT_NOT_FOUND"
      );
    }

    const built = await buildProfile(
      connection,
      result.rows[0]
    );

    if (!built.profile) {
      return fail(res, 403, built.error, built.code);
    }

    return res.json({
      user: built.profile,
    });
  } catch (error) {
    console.error("Auth /me Error:", error);

    return fail(
      res,
      500,
      "Unable to load authenticated account.",
      "AUTH_PROFILE_LOAD_FAILED"
    );
  } finally {
    await closeConnection(connection);
  }
});

module.exports = router;