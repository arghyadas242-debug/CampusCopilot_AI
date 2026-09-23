const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");
const getConnection = require("../db");

function authError(status, message, code) {
  const error = new Error(message);
  error.authStatus = status;
  error.authCode = code;
  return error;
}

function readBearerToken(req) {
  const header = req.headers.authorization;

  if (
    typeof header !== "string" ||
    !header.startsWith("Bearer ")
  ) {
    return "";
  }

  return header.slice(7).trim();
}

async function verifyAccount(token) {
  const secret = process.env.JWT_SECRET;

  if (!secret || !secret.trim()) {
    console.error("JWT_SECRET is not configured.");

    throw authError(
      500,
      "Authentication service is not configured correctly.",
      "AUTH_CONFIGURATION_ERROR"
    );
  }

  let decoded;

  try {
    decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw authError(
        401,
        "Your session has expired. Please log in again.",
        "AUTH_TOKEN_EXPIRED"
      );
    }

    if (error.name === "NotBeforeError") {
      throw authError(
        401,
        "Your authentication token is not active yet.",
        "AUTH_TOKEN_NOT_ACTIVE"
      );
    }

    throw authError(
      403,
      "Invalid authentication token.",
      "AUTH_TOKEN_INVALID"
    );
  }

  if (
    !decoded ||
    typeof decoded !== "object" ||
    Array.isArray(decoded) ||
    !["number", "string"].includes(typeof decoded.id) ||
    !/^\d+$/.test(String(decoded.id)) ||
    !Number.isSafeInteger(Number(decoded.id)) ||
    Number(decoded.id) <= 0 ||
    !Number.isSafeInteger(decoded.exp)
  ) {
    throw authError(
      403,
      "Invalid authentication token.",
      "AUTH_TOKEN_INVALID"
    );
  }

  // Tokens issued before the migration belong to version zero.
  const tokenVersion =
    decoded.tokenVersion === undefined
      ? 0
      : decoded.tokenVersion;

  if (
    !Number.isSafeInteger(tokenVersion) ||
    tokenVersion < 0
  ) {
    throw authError(
      403,
      "Invalid authentication token.",
      "AUTH_TOKEN_INVALID"
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
          role,
          token_version
        FROM users
        WHERE id = :userId
      `,
      {
        userId: Number(decoded.id),
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    const user = result.rows[0];

    if (!user) {
      throw authError(
        401,
        "Your session is no longer valid. Please log in again.",
        "AUTH_SESSION_REVOKED"
      );
    }

    const currentVersion = Number(user.TOKEN_VERSION);

    if (
      !Number.isSafeInteger(currentVersion) ||
      currentVersion < 0
    ) {
      throw new Error("Invalid account token version.");
    }

    if (tokenVersion !== currentVersion) {
      throw authError(
        401,
        "Your session is no longer valid. Please log in again.",
        "AUTH_SESSION_REVOKED"
      );
    }

    const role = String(user.ROLE || "")
      .trim()
      .toLowerCase();

    const signedRole = String(decoded.role || "")
      .trim()
      .toLowerCase();

    const email = String(user.EMAIL || "")
      .trim()
      .toLowerCase();

    const signedEmail = String(decoded.email || "")
      .trim()
      .toLowerCase();

    if (
      !["admin", "student"].includes(role) ||
      role !== signedRole ||
      email !== signedEmail
    ) {
      throw authError(
        401,
        "Your account has changed. Please log in again.",
        "AUTH_SESSION_REVOKED"
      );
    }

    return {
      ...decoded,
      id: user.ID,
      name: user.NAME,
      email,
      role,
      tokenVersion: currentVersion,
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Auth connection close error:", error);
      }
    }
  }
}

async function authenticateToken(req, res, next) {
  const token = readBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Access denied. No authentication token provided.",
      code: "AUTH_TOKEN_REQUIRED",
    });
  }

  try {
    req.user = await verifyAccount(token);
  } catch (error) {
    if (error.authStatus) {
      return res.status(error.authStatus).json({
        error: error.message,
        code: error.authCode,
      });
    }

    console.error("Authentication verification error:", error);

    return res.status(500).json({
      error: "Unable to verify authentication right now.",
      code: "AUTH_VERIFICATION_FAILED",
    });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication is required.",
      code: "AUTH_REQUIRED",
    });
  }

  const role = String(req.user.role || "")
    .trim()
    .toLowerCase();

  if (role !== "admin") {
    return res.status(403).json({
      error: "Access denied. Administrator privileges required.",
      code: "ADMIN_ACCESS_REQUIRED",
    });
  }

  return next();
}

function requireStudent(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication is required.",
      code: "AUTH_REQUIRED",
    });
  }

  const role = String(req.user.role || "")
    .trim()
    .toLowerCase();

  if (role !== "student") {
    return res.status(403).json({
      error: "Access denied. Student account required.",
      code: "STUDENT_ACCESS_REQUIRED",
    });
  }

  return next();
}

async function optionalAuthenticateToken(req, res, next) {
  req.user = null;

  const token = readBearerToken(req);

  if (!token) {
    return next();
  }

  try {
    req.user = await verifyAccount(token);
  } catch (error) {
    // Invalid, expired or revoked tokens remain anonymous.
    if (error.authStatus && error.authStatus < 500) {
      return next();
    }

    // Database/configuration failures must not silently succeed.
    console.error(
      "Optional authentication verification error:",
      error
    );

    return res.status(500).json({
      error: "Unable to verify authentication right now.",
      code: "AUTH_VERIFICATION_FAILED",
    });
  }

  return next();
}

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  requireAdmin,
  requireStudent,
};