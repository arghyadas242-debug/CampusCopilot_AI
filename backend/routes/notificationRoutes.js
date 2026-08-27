const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

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
// GET ALL NOTIFICATIONS FOR A STUDENT
//
// GET /api/notifications/:studentRoll
// =====================================================

router.get("/:studentRoll", 
    async (req, res) => {
  let connection;

  try {
    const { studentRoll } = req.params;

    connection = await getConnection();

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
      WHERE student_roll = :studentRoll
      ORDER BY created_at DESC, notification_id DESC
      `,
      {
        studentRoll,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(
      "Get notifications error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load notifications",
      details: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error(
          "Notification connection close error:",
          error
        );
      }
    }
  }
});

// =====================================================
// GET UNREAD NOTIFICATION COUNT
//
// GET /api/notifications/:studentRoll/unread-count
// =====================================================

router.get(
  "/:studentRoll/unread-count",
  async (req, res) => {
    let connection;

    try {
      const { studentRoll } =
        req.params;

      connection =
        await getConnection();

      const result =
        await connection.execute(
          `
          SELECT COUNT(*) AS unread_count
          FROM notifications
          WHERE student_roll = :studentRoll
            AND is_read = 0
          `,
          {
            studentRoll,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );

      return res.json({
        unreadCount:
          result.rows[0]
            ?.UNREAD_COUNT || 0,
      });
    } catch (error) {
      console.error(
        "Unread count error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load unread count",
        details: error.message,
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error(
            "Notification connection close error:",
            error
          );
        }
      }
    }
  }
);

// =====================================================
// CREATE NOTIFICATION
//
// POST /api/notifications
// =====================================================

router.post("/", async (req, res) => {
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
    } = req.body;

    // -----------------------------
    // Required field validation
    // -----------------------------

    if (
      !studentRoll ||
      !notificationType ||
      !title ||
      !message
    ) {
      return res.status(400).json({
        error:
          "studentRoll, notificationType, title and message are required",
      });
    }

    const normalizedType =
      String(
        notificationType
      ).toUpperCase();

    if (
      !ALLOWED_TYPES.includes(
        normalizedType
      )
    ) {
      return res.status(400).json({
        error:
          "Invalid notification type",
      });
    }

    connection =
      await getConnection();

    // -----------------------------
    // Check student exists
    // -----------------------------

    const studentCheck =
      await connection.execute(
        `
        SELECT student_roll
        FROM students
        WHERE student_roll = :studentRoll
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
      studentCheck.rows.length === 0
    ) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    // -----------------------------
    // Insert notification
    // -----------------------------

    const result =
      await connection.execute(
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
        RETURNING notification_id
        INTO :notificationId
        `,
        {
          studentRoll,

          notificationType:
            normalizedType,

          title,

          message,

          relatedType,

          relatedId,

          actionUrl,

          notificationId: {
            dir:
              oracledb.BIND_OUT,
            type:
              oracledb.NUMBER,
          },
        }
      );

    await connection.commit();

    return res.status(201).json({
      message:
        "Notification created successfully",

      notificationId:
        result.outBinds
          .notificationId[0],
    });
  } catch (error) {
    console.error(
      "Create notification error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to create notification",
      details: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error(
          "Notification connection close error:",
          error
        );
      }
    }
  }
});

// =====================================================
// MARK ONE NOTIFICATION AS READ
//
// PATCH /api/notifications/:id/read
// =====================================================

router.patch(
  "/:id/read",
  async (req, res) => {
    let connection;

    try {
      const id =
        Number(req.params.id);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          error:
            "Invalid notification ID",
        });
      }

      connection =
        await getConnection();

      const result =
        await connection.execute(
          `
          UPDATE notifications
          SET is_read = 1
          WHERE notification_id = :id
          `,
          {
            id,
          }
        );

      if (
        result.rowsAffected === 0
      ) {
        return res.status(404).json({
          error:
            "Notification not found",
        });
      }

      await connection.commit();

      return res.json({
        message:
          "Notification marked as read",
      });
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to update notification",
        details: error.message,
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error(
            "Notification connection close error:",
            error
          );
        }
      }
    }
  }
);

// =====================================================
// MARK ALL STUDENT NOTIFICATIONS AS READ
//
// PATCH /api/notifications/:studentRoll/read-all
// =====================================================

router.patch(
  "/:studentRoll/read-all",
  async (req, res) => {
    let connection;

    try {
      const { studentRoll } =
        req.params;

      connection =
        await getConnection();

      const result =
        await connection.execute(
          `
          UPDATE notifications
          SET is_read = 1
          WHERE student_roll = :studentRoll
            AND is_read = 0
          `,
          {
            studentRoll,
          }
        );

      await connection.commit();

      return res.json({
        message:
          "All notifications marked as read",

        updated:
          result.rowsAffected || 0,
      });
    } catch (error) {
      console.error(
        "Mark all read error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to update notifications",
        details: error.message,
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error(
            "Notification connection close error:",
            error
          );
        }
      }
    }
  }
);

// =====================================================
// DELETE A NOTIFICATION
//
// DELETE /api/notifications/:id
// =====================================================

router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const id =
      Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        error:
          "Invalid notification ID",
      });
    }

    connection =
      await getConnection();

    const result =
      await connection.execute(
        `
        DELETE FROM notifications
        WHERE notification_id = :id
        `,
        {
          id,
        }
      );

    if (
      result.rowsAffected === 0
    ) {
      return res.status(404).json({
        error:
          "Notification not found",
      });
    }

    await connection.commit();

    return res.json({
      message:
        "Notification deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete notification error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to delete notification",
      details: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error(
          "Notification connection close error:",
          error
        );
      }
    }
  }
});

module.exports = router;