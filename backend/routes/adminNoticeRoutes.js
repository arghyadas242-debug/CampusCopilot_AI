const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();


// =====================================================
// GET ALL NOTICES
// GET /api/admin/notices
// =====================================================

router.get("/", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        id,
        title,
        author,
        tag,
        tag_color,
        category,
        content,
        ai_summary,
        created_at
      FROM notices
      ORDER BY created_at DESC, id DESC
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,

        fetchInfo: {
          CONTENT: {
            type: oracledb.STRING,
          },

          AI_SUMMARY: {
            type: oracledb.STRING,
          },
        },
      }
    );

    return res.json(result.rows);

  } catch (error) {

    console.error(
      "Admin notices load error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load notices",
      details: error.message,
    });

  } finally {

    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Connection close error:",
          closeError
        );
      }
    }
  }
});


// =====================================================
// ADD NOTICE
// POST /api/admin/notices
// =====================================================

router.post("/", async (req, res) => {
  let connection;

  try {
    const {
      title,
      author,
      category,
      tag,
      tagColor,
      content,
      aiSummary,
    } = req.body;


    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (
      !title?.trim() ||
      !author?.trim() ||
      !content?.trim()
    ) {
      return res.status(400).json({
        error:
          "Title, author and content are required",
      });
    }


    const cleanTitle =
      title.trim();

    const cleanAuthor =
      author.trim();

    const cleanCategory =
      category?.trim() || "General";

    const cleanTag =
      tag?.trim() || "General";

    const cleanTagColor =
      tagColor?.trim() || "blue";

    const cleanContent =
      content.trim();

    const cleanAiSummary =
      aiSummary?.trim() || null;


    connection = await getConnection();


    // -------------------------------------------------
    // INSERT NOTICE
    // RETURN GENERATED NOTICE ID
    // -------------------------------------------------

    const noticeResult =
      await connection.execute(
        `
        INSERT INTO notices (
          title,
          author,
          tag,
          tag_color,
          category,
          content,
          ai_summary,
          created_at
        )
        VALUES (
          :title,
          :author,
          :tag,
          :tagColor,
          :category,
          :content,
          :aiSummary,
          SYSTIMESTAMP
        )
        RETURNING id
        INTO :noticeId
        `,
        {
          title:
            cleanTitle,

          author:
            cleanAuthor,

          tag:
            cleanTag,

          tagColor:
            cleanTagColor,

          category:
            cleanCategory,

          content: {
            val: cleanContent,
            type: oracledb.CLOB,
          },

          aiSummary: {
            val: cleanAiSummary,
            type: oracledb.CLOB,
          },

          noticeId: {
            dir: oracledb.BIND_OUT,
            type: oracledb.NUMBER,
          },
        }
      );


    // -------------------------------------------------
    // GET GENERATED NOTICE ID
    // -------------------------------------------------

    const noticeId =
      noticeResult.outBinds
        .noticeId[0];


    // -------------------------------------------------
    // BUILD NOTIFICATION
    // -------------------------------------------------

    const notificationTitle =
      "New Campus Notice";

    const notificationMessage =
      `${cleanCategory} notice published: ${cleanTitle}`;


    // -------------------------------------------------
    // CREATE NOTIFICATION FOR ALL STUDENTS
    //
    // One notification row is created for every
    // student currently in the STUDENTS table.
    // -------------------------------------------------

    const notificationResult =
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

        SELECT
          student_roll,
          'NOTICE',
          :notificationTitle,
          :messageText,
          'NOTICE',
          :relatedId,
          '/notices',
          0
        FROM students
        `,
        {
          notificationTitle:
            notificationTitle,

          messageText:
            notificationMessage,

          relatedId:
            noticeId,
        }
      );


    // -------------------------------------------------
    // COMMIT NOTICE + ALL NOTIFICATIONS TOGETHER
    // -------------------------------------------------

    await connection.commit();


    return res.status(201).json({
      message:
        "Notice published successfully",

      noticeId,

      notificationsCreated:
        notificationResult.rowsAffected || 0,
    });

  } catch (error) {

    // -------------------------------------------------
    // ROLLBACK NOTICE + NOTIFICATIONS IF ANYTHING FAILS
    // -------------------------------------------------

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }
    }


    console.error(
      "Create notice error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to publish notice",

      details:
        error.message,
    });

  } finally {

    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Connection close error:",
          closeError
        );
      }
    }
  }
});


// =====================================================
// UPDATE NOTICE
// PUT /api/admin/notices/:id
// =====================================================

router.put("/:id", async (req, res) => {
  let connection;

  try {
    const noticeId =
      Number(req.params.id);


    if (
      !Number.isInteger(noticeId) ||
      noticeId <= 0
    ) {
      return res.status(400).json({
        error: "Invalid notice ID",
      });
    }


    const {
      title,
      author,
      category,
      tag,
      tagColor,
      content,
      aiSummary,
    } = req.body;


    if (
      !title?.trim() ||
      !author?.trim() ||
      !content?.trim()
    ) {
      return res.status(400).json({
        error:
          "Title, author and content are required",
      });
    }


    connection = await getConnection();


    // -------------------------------------------------
    // CHECK NOTICE EXISTS
    // -------------------------------------------------

    const existing =
      await connection.execute(
        `
        SELECT id
        FROM notices
        WHERE id = :id
        `,
        {
          id: noticeId,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      existing.rows.length === 0
    ) {
      return res.status(404).json({
        error: "Notice not found",
      });
    }


    // -------------------------------------------------
    // UPDATE NOTICE
    // -------------------------------------------------

    await connection.execute(
      `
      UPDATE notices
      SET
        title = :title,
        author = :author,
        tag = :tag,
        tag_color = :tagColor,
        category = :category,
        content = :content,
        ai_summary = :aiSummary
      WHERE id = :id
      `,
      {
        title:
          title.trim(),

        author:
          author.trim(),

        tag:
          tag?.trim() || "General",

        tagColor:
          tagColor?.trim() || "blue",

        category:
          category?.trim() || "General",

        content: {
          val: content.trim(),
          type: oracledb.CLOB,
        },

        aiSummary: {
          val:
            aiSummary?.trim() || null,
          type: oracledb.CLOB,
        },

        id:
          noticeId,
      }
    );


    await connection.commit();


    return res.json({
      message:
        "Notice updated successfully",
    });

  } catch (error) {

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }
    }


    console.error(
      "Update notice error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to update notice",

      details:
        error.message,
    });

  } finally {

    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Connection close error:",
          closeError
        );
      }
    }
  }
});


// =====================================================
// DELETE NOTICE
// DELETE /api/admin/notices/:id
// =====================================================

router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const noticeId =
      Number(req.params.id);


    if (
      !Number.isInteger(noticeId) ||
      noticeId <= 0
    ) {
      return res.status(400).json({
        error: "Invalid notice ID",
      });
    }


    connection = await getConnection();


    const result =
      await connection.execute(
        `
        DELETE FROM notices
        WHERE id = :id
        `,
        {
          id: noticeId,
        }
      );


    if (
      result.rowsAffected === 0
    ) {
      await connection.rollback();

      return res.status(404).json({
        error: "Notice not found",
      });
    }


    await connection.commit();


    return res.json({
      message:
        "Notice deleted successfully",
    });

  } catch (error) {

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }
    }


    console.error(
      "Delete notice error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to delete notice",

      details:
        error.message,
    });

  } finally {

    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Connection close error:",
          closeError
        );
      }
    }
  }
});


module.exports = router;