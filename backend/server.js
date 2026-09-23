require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");

const initDatabase = require("./initDb");

// =====================================================
// ROUTES
// =====================================================

const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const examRoutes = require("./routes/examRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const assignmentFileRoutes = require("./routes/assignmentFileRoutes");

const adminAssignmentRoutes =
  require("./routes/adminAssigmentRoutes");

const subjectRoutes = require("./routes/subjectRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminExamRoutes = require("./routes/adminExamRoutes");

const adminTimetableRoutes =
  require("./routes/adminTimetableRoutes");

const adminNoticeRoutes = require("./routes/adminNoticeRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const adminResourceRoutes = require("./routes/adminResourceRoutes");
const studentRoutes = require("./routes/studentRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const studentIdRoutes = require("./routes/studentIdRoutes");

// =====================================================
// APP
// =====================================================

const app = express();

app.disable("x-powered-by");

// Appropriate for the current direct localhost connection.
// Configure trusted proxies for the actual deployment later.
app.set("trust proxy", false);

// =====================================================
// CORS
// =====================================================

const allowedOrigins = new Set(
  (
    process.env.CORS_ORIGINS ||
    "http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without Origin still require normal
      // authentication and authorization on protected routes.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin is not allowed.");
      error.code = "CORS_ORIGIN_DENIED";

      return callback(error);
    },

    methods: [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    exposedHeaders: [
      "Retry-After",
    ],

    credentials: false,
  })
);

// =====================================================
// AUTHENTICATION RATE LIMITS
// =====================================================

function createAuthLimiter(limit, code, error) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    message: {
      error,
      code,
    },

    handler(req, res, next, options) {
      return res.status(429).json(options.message);
    },
  });
}

const loginLimiter = createAuthLimiter(
  20,
  "LOGIN_RATE_LIMITED",
  "Too many sign-in attempts. Please try again later."
);

const registrationLimiter = createAuthLimiter(
  5,
  "REGISTRATION_RATE_LIMITED",
  "Too many registration attempts. Please try again later."
);

const resetRequestLimiter = createAuthLimiter(
  10,
  "RESET_RATE_LIMITED",
  "Too many password reset requests. Please try again later."
);

const resetAttemptLimiter = createAuthLimiter(
  20,
  "RESET_VERIFY_RATE_LIMITED",
  "Too many password reset verification attempts. Please try again later."
);

// These limits run before JSON parsing and the auth router.
// Default limiter keys use the client IP resolved by Express.

app.post(
  "/api/auth/login",
  loginLimiter
);

app.post(
  "/api/auth/register",
  registrationLimiter
);

app.post(
  "/api/auth/forgot-password",
  resetRequestLimiter
);

// Verification and password submission share this allowance.
app.post(
  "/api/auth/verify-reset-otp",
  resetAttemptLimiter
);

app.post(
  "/api/auth/reset-password",
  resetAttemptLimiter
);

// =====================================================
// REQUEST BODY
// =====================================================

app.use(
  express.json({
    limit: "100kb",
  })
);

// =====================================================
// API ROUTES
// =====================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/timetable",
  timetableRoutes
);

app.use(
  "/api/ai",
  aiRoutes
);

app.use(
  "/api/subjects",
  subjectRoutes
);

app.use(
  "/api/attendance",
  attendanceRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/resources",
  resourceRoutes
);

app.use(
  "/api/admin/assignments",
  adminAssignmentRoutes
);

app.use(
  "/api/notices",
  noticeRoutes
);

app.use(
  "/api/admin/resources",
  adminResourceRoutes
);

app.use(
  "/api/students",
  studentRoutes
);

app.use(
  "/api/assignments",
  assignmentRoutes
);

app.use(
  "/api/admin/timetable",
  adminTimetableRoutes
);

app.use(
  "/api/admin/notices",
  adminNoticeRoutes
);

app.use(
  "/api/assignment-files",
  assignmentFileRoutes
);

app.use(
  "/api/exams",
  examRoutes
);

app.use(
  "/api/admin/exams",
  adminExamRoutes
);

app.use(
  "/api/student-id",
  studentIdRoutes
);

// =====================================================
// ROOT ROUTE
// =====================================================

app.get("/", (req, res) => {
  return res.json({
    status: "online",
    service: "CampusCopilot AI Backend API",
    version: "2.0.0",

    endpoints: [
      "/api/auth",
      "/api/ai/chat",
      "/api/ai/summarize-notice",
      "/api/ai/study-plan",
      "/api/attendance",
      "/api/assignments",
      "/api/notices",
      "/api/students",
      "/api/assignment-files",
      "/api/student-id/verification",
      "/api/student-id/verify/:token",
    ],
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.code === "CORS_ORIGIN_DENIED") {
    return res.status(403).json({
      error: "This browser origin is not allowed.",
      code: "CORS_ORIGIN_DENIED",
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Invalid JSON request body.",
      code: "INVALID_JSON",
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: "Request body is too large.",
      code: "REQUEST_TOO_LARGE",
    });
  }

  // Keep detailed errors in server logs.
  console.error("Unhandled Error:", err);

  return res.status(500).json({
    error: "Internal server error.",
    code: "INTERNAL_SERVER_ERROR",
  });
});

// =====================================================
// SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT);

server.on("listening", () => {
  console.log(
    `CampusCopilot API server running at http://localhost:${PORT}`
  );

  initDatabase().catch((err) => {
    console.warn(
      "Oracle DB connection notice:",
      err.message
    );
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Unable to start CampusCopilot API: port ${PORT} is already in use.`
    );
  } else {
    console.error(
      "CampusCopilot API server error:",
      error
    );
  }

  process.exitCode = 1;
});