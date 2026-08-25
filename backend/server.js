const express = require("express");
const cors = require("cors");
require("dotenv").config();

const initDatabase = require("./initDb");

const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const examRoutes = require("./routes/examRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const studentRoutes = require("./routes/studentRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/exams", examRoutes);

// Root Route
app.get("/", (req, res) => {
  res.json({
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
    ],
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  res.status(500).json({
    error:
      "Internal server error. " +
      (err.message || ""),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
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