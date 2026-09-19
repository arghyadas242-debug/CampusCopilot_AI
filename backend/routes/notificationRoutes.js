const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

const OUT_FORMAT = {
  outFormat: oracledb.OUT_FORMAT_OBJECT,
};

const ALLOWED_TYPES = [
  "ASSIGNMENT",
  "EXAM",
  "NOTICE",
  "RESOURCE",
  "ATTENDANCE",
  "TIMETABLE",
  "SYSTEM",
];

// =====================================================
// HELPERS
// =====================================================

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeRole(user) {
  return String(user?.role || user?.ROLE || "")
    .trim()
    .toLowerCase();
}

function normalizeRoll(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

async function closeConnection(connection) {
  if (!connection) {
    return;
  }

  try {
    await connection.close();
  } catch (error) {
    console.error(
      "Notification connection close error:",
      error
    );
  }
}

async function rollbackConnection(connection) {
  if (!connection) {
    return;
  }

  try {
    await connection.rollback();
  } catch (error) {
    console.error("Notification rollback error:", error);
  }
}

function sendNotificationForbidden(res) {
  return res.status(403).json({
    error:
      "You are not authorized to access these notifications.",
    code: "NOTIFICATION_RECORD_FORBIDDEN",
  });
}

// Students receive the same response for another student's
// notification and a missing notification.
function sendNotificationUnavailable(req, res) {
  if (normalizeRole(req.user) !== "admin") {
    return sendNotificationForbidden(res);
  }

  return res.status(404).json({
    error: "Notification not found",
  });
}

function sendServerError(res, message) {
  return res.status(500).json({
    error: message,
    details: "An internal server error occurred.",
  });
}

// =====================================================
// RESOLVE AUTHENTICATED STUDENT
// Identity comes only from the authenticated req.user.
// Database errors propagate; they never trigger a fallback.
// =====================================================

async function getAuthenticatedStudentRoll(connection, user) {
  const email = String(user?.email || user?.EMAIL || "")
    .trim()
    .toLowerCase();

  // Primary lookup: authenticated email.
  if (email) {
    const result = await connection.execute(
      `
      SELECT student_roll
      FROM students
      WHERE LOWER(email) = :email
      `,
      { email },
      OUT_FORMAT
    );

    // Fail closed if the identity maps to multiple students.
    if (result.rows.length > 1) {
      return "";
    }

    if (result.rows.length === 1) {
      return cleanText(result.rows[0].STUDENT_ROLL);
    }
  }

  // Fallback: student roll from the verified JWT.
  const directRoll =
    user?.rollNumber ||
    user?.studentRoll ||
    user?.student_roll ||
    user?.STUDENT_ROLL ||
    null;

  if (directRoll) {
    const result = await connection.execute(
      `
      SELECT student_roll
      FROM students
      WHERE UPPER(student_roll) = UPPER(:studentRoll)
      `,
      {
        studentRoll: cleanText(directRoll),
      },
      OUT_FORMAT
    );

    if (result.rows.length > 1) {
      return "";
    }

    if (result.rows.length === 1) {
      return cleanText(result.rows[0].STUDENT_ROLL);
    }
  }

  // Final fallback: authenticated user ID -> USERS -> STUDENTS.
  const userId =
    user?.id ??
    user?.userId ??
    user?.user_id ??
    user?.ID ??
    null;

  if (userId !== null) {
    const result = await connection.execute(
      `
      SELECT s.student_roll
      FROM users u
      JOIN students s
        ON LOWER(s.email) = LOWER(u.email)
      WHERE u.id = :userId
      `,
      { userId },
      OUT_FORMAT
    );

    if (result.rows.length > 1) {
      return "";
    }

    if (result.rows.length === 1) {
      return cleanText(result.rows[0].STUDENT_ROLL);
    }
  }

  return "";
}

// =====================================================
// OWNERSHIP CHECK
// =====================================================

async function canAccessStudentNotifications(
  connection,
  req,
  requestedStudentRoll
) {
  const role = normalizeRole(req.user);

  if (role === "admin") {
    return true;
  }

  if (role !== "student") {
    return false;
  }

  const authenticatedStudentRoll =
    await getAuthenticatedStudentRoll(connection, req.user);

  if (!authenticatedStudentRoll) {
    return false;
  }

  return (
    normalizeRoll(authenticatedStudentRoll) ===
    normalizeRoll(requestedStudentRoll)
  );
}

// Only load the fields needed to authorize a mutation.
async function getNotificationById(connection, notificationId) {
  const result = await connection.execute(
    `
    SELECT notification_id, student_roll
    FROM notifications
    WHERE notification_id = :notificationId
    `,
    { notificationId },
    OUT_FORMAT
  );

  return result.rows[0] || null;
}

// =====================================================
// CREATE NOTIFICATION — ADMIN ONLY
// POST /api/notifications
//
// Direct database inserts from other backend modules
// are unaffected by this HTTP route's middleware.
// =====================================================

router.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    let connection;

    try {
      const {
        studentRoll,
        notificationType,
        title,
        message,
        relatedType = null,
        relatedId = null,
        actionUrl = null,
      } = req.body || {};

      const cleanStudentRoll = cleanText(studentRoll);
      const cleanTitle = cleanText(title);
      const cleanMessage = cleanText(message);

      if (
        !cleanStudentRoll ||
        !notificationType ||
        !cleanTitle ||
        !cleanMessage
      ) {
        return res.status(400).json({
          error:
            "studentRoll, notificationType, title and message are required",
        });
      }

      const normalizedType =
        cleanText(notificationType).toUpperCase();

      if (!ALLOWED_TYPES.includes(normalizedType)) {
        return res.status(400).json({
          error: "Invalid notification type",
        });
      }

      connection = await getConnection();

      const studentCheck = await connection.execute(
        `
        SELECT student_roll
        FROM students
        WHERE UPPER(student_roll) = UPPER(:studentRoll)
        `,
        {
          studentRoll: cleanStudentRoll,
        },
        OUT_FORMAT
      );

      if (studentCheck.rows.length === 0) {
        return res.status(404).json({
          error: "Student not found",
        });
      }

      // Avoid selecting an arbitrary recipient if rolls are
      // ambiguous under the existing case-insensitive lookup.
      if (studentCheck.rows.length > 1) {
        return res.status(409).json({
          error: "Student roll number is ambiguous",
        });
      }

      const realStudentRoll =
        studentCheck.rows[0].STUDENT_ROLL;

      const result = await connection.execute(
        `
        INSERT INTO notifications (
          student_roll,
          notification_type,
          title,
          message_text,
          related_type,
          related_id,
          action_url,
          is_read
        )
        VALUES (
          :studentRoll,
          :notificationType,
          :title,
          :message,
          :relatedType,
          :relatedId,
          :actionUrl,
          0
        )
        RETURNING notification_id INTO :notificationId
        `,
        {
          studentRoll: realStudentRoll,
          notificationType: normalizedType,
          title: cleanTitle,
          message: cleanMessage,
          relatedType: relatedType
            ? cleanText(relatedType).toUpperCase()
            : null,
          relatedId,
          actionUrl: actionUrl ? cleanText(actionUrl) : null,
          notificationId: {
            dir: oracledb.BIND_OUT,
            type: oracledb.NUMBER,
          },
        }
      );

      await connection.commit();

      return res.status(201).json({
        message: "Notification created successfully",
        notificationId: result.outBinds.notificationId[0],
      });
    } catch (error) {
      console.error("Create notification error:", error);
      await rollbackConnection(connection);

      return sendServerError(
        res,
        "Unable to create notification"
      );
    } finally {
      await closeConnection(connection);
    }
  }
);

// =====================================================
// GET UNREAD COUNT — OWNER OR ADMIN
// GET /api/notifications/:studentRoll/unread-count
// =====================================================

router.get(
  "/:studentRoll/unread-count",
  authenticateToken,
  async (req, res) => {
    let connection;

    try {
      const studentRoll = cleanText(req.params.studentRoll);

      if (!studentRoll) {
        return res.status(400).json({
          error: "Student roll number is required",
          code: "STUDENT_ROLL_REQUIRED",
        });
      }

      connection = await getConnection();

      const canAccess = await canAccessStudentNotifications(
        connection,
        req,
        studentRoll
      );

      if (!canAccess) {
        return sendNotificationForbidden(res);
      }

      const result = await connection.execute(
        `
        SELECT COUNT(*) AS unread_count
        FROM notifications
        WHERE UPPER(student_roll) = UPPER(:studentRoll)
          AND is_read = 0
        `,
        { studentRoll },
        OUT_FORMAT
      );

      return res.json({
        unreadCount: Number(
          result.rows[0]?.UNREAD_COUNT || 0
        ),
      });
    } catch (error) {
      console.error("Unread count error:", error);

      return sendServerError(
        res,
        "Unable to load unread count"
      );
    } finally {
      await closeConnection(connection);
    }
  }
);

// =====================================================
// GET NOTIFICATIONS — OWNER OR ADMIN
// GET /api/notifications/:studentRoll
// =====================================================

router.get(
  "/:studentRoll",
  authenticateToken,
  async (req, res) => {
    let connection;

    try {
      const studentRoll = cleanText(req.params.studentRoll);

      if (!studentRoll) {
        return res.status(400).json({
          error: "Student roll number is required",
          code: "STUDENT_ROLL_REQUIRED",
        });
      }

      connection = await getConnection();

      const canAccess = await canAccessStudentNotifications(
        connection,
        req,
        studentRoll
      );

      if (!canAccess) {
        return sendNotificationForbidden(res);
      }

      const result = await connection.execute(
        `
        SELECT
          notification_id,
          student_roll,
          notification_type,
          title,
          message_text,
          related_type,
          related_id,
          action_url,
          is_read,
          created_at
        FROM notifications
        WHERE UPPER(student_roll) = UPPER(:studentRoll)
        ORDER BY created_at DESC, notification_id DESC
        `,
        { studentRoll },
        OUT_FORMAT
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Get notifications error:", error);

      return sendServerError(
        res,
        "Unable to load notifications"
      );
    } finally {
      await closeConnection(connection);
    }
  }
);

// =====================================================
// MARK ALL READ — OWNER OR ADMIN
// PATCH /api/notifications/:studentRoll/read-all
// =====================================================

router.patch(
  "/:studentRoll/read-all",
  authenticateToken,
  async (req, res) => {
    let connection;

    try {
      const studentRoll = cleanText(req.params.studentRoll);

      if (!studentRoll) {
        return res.status(400).json({
          error: "Student roll number is required",
          code: "STUDENT_ROLL_REQUIRED",
        });
      }

      connection = await getConnection();

      const canAccess = await canAccessStudentNotifications(
        connection,
        req,
        studentRoll
      );

      if (!canAccess) {
        return sendNotificationForbidden(res);
      }

      const result = await connection.execute(
        `
        UPDATE notifications
        SET is_read = 1
        WHERE UPPER(student_roll) = UPPER(:studentRoll)
          AND is_read = 0
        `,
        { studentRoll }
      );

      await connection.commit();

      return res.json({
        message: "All notifications marked as read",
        updated: result.rowsAffected || 0,
      });
    } catch (error) {
      console.error("Mark all read error:", error);
      await rollbackConnection(connection);

      return sendServerError(
        res,
        "Unable to update notifications"
      );
    } finally {
      await closeConnection(connection);
    }
  }
);

// =====================================================
// MARK ONE READ — OWNER OR ADMIN
// PATCH /api/notifications/:id/read
// =====================================================

router.patch(
  "/:id/read",
  authenticateToken,
  async (req, res) => {
    let connection;

    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
          error: "Invalid notification ID",
        });
      }

      connection = await getConnection();

      const notification = await getNotificationById(
        connection,
        id
      );

      if (!notification) {
        return sendNotificationUnavailable(req, res);
      }

      const canAccess = await canAccessStudentNotifications(
        connection,
        req,
        notification.STUDENT_ROLL
      );

      if (!canAccess) {
        return sendNotificationForbidden(res);
      }

      // Keep the verified owner in the mutation predicate.
      const result = await connection.execute(
        `
        UPDATE notifications
        SET is_read = 1
        WHERE notification_id = :id
          AND UPPER(student_roll) = UPPER(:studentRoll)
        `,
        {
          id,
          studentRoll: notification.STUDENT_ROLL,
        }
      );

      if (result.rowsAffected === 0) {
        return sendNotificationUnavailable(req, res);
      }

      await connection.commit();

      return res.json({
        message: "Notification marked as read",
      });
    } catch (error) {
      console.error("Mark notification read error:", error);
      await rollbackConnection(connection);

      return sendServerError(
        res,
        "Unable to update notification"
      );
    } finally {
      await closeConnection(connection);
    }
  }
);

// =====================================================
// DELETE NOTIFICATION — OWNER OR ADMIN
// DELETE /api/notifications/:id
// =====================================================

router.delete(
  "/:id",
  authenticateToken,
  async (req, res) => {
    let connection;

    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
          error: "Invalid notification ID",
        });
      }

      connection = await getConnection();

      const notification = await getNotificationById(
        connection,
        id
      );

      if (!notification) {
        return sendNotificationUnavailable(req, res);
      }

      const canAccess = await canAccessStudentNotifications(
        connection,
        req,
        notification.STUDENT_ROLL
      );

      if (!canAccess) {
        return sendNotificationForbidden(res);
      }

      // Keep the verified owner in the mutation predicate.
      const result = await connection.execute(
        `
        DELETE FROM notifications
        WHERE notification_id = :id
          AND UPPER(student_roll) = UPPER(:studentRoll)
        `,
        {
          id,
          studentRoll: notification.STUDENT_ROLL,
        }
      );

      if (result.rowsAffected === 0) {
        return sendNotificationUnavailable(req, res);
      }

      await connection.commit();

      return res.json({
        message: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Delete notification error:", error);
      await rollbackConnection(connection);

      return sendServerError(
        res,
        "Unable to delete notification"
      );
    } finally {
      await closeConnection(connection);
    }
  }
);

module.exports = router;