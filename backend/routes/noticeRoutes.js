const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/authMiddleware");

const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ||
  "gemini-3.6-flash";

// =====================================================
// GET ALL NOTICES
// GET /api/notices
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

        // Convert Oracle CLOB values directly to normal
        // JavaScript strings instead of returning Lob objects.
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

    const notices = result.rows.map((row) => {
      let parsedSummary = [];

      if (row.AI_SUMMARY) {
        try {
          parsedSummary = JSON.parse(row.AI_SUMMARY);

          if (
            parsedSummary &&
            typeof parsedSummary === "object" &&
            Array.isArray(parsedSummary.summary)
          ) {
            parsedSummary = parsedSummary.summary;
          } else if (!Array.isArray(parsedSummary)) {
            parsedSummary = [String(row.AI_SUMMARY)];
          }
        } catch {
          parsedSummary = [
            String(row.AI_SUMMARY),
          ];
        }
      }

      return {
        id: row.ID,
        title: row.TITLE,
        author: row.AUTHOR,

        tag: row.TAG,

        tagColor: row.TAG_COLOR,

        category: row.CATEGORY,

        content: row.CONTENT,

        aiSummary: row.AI_SUMMARY,

        summary:
          parsedSummary,

        createdAt:
          row.CREATED_AT,
      };
    });

    return res.json({
      notices,
    });
  } catch (err) {
    console.error(
      "Fetch Notices Error:",
      err
    );

    return res.status(500).json({
      error:
        "Failed to fetch notices. " +
        (err.message || ""),
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Notice connection close error:",
          closeError
        );
      }
    }
  }
});

// =====================================================
// ADMIN: PUBLISH NOTICE
// POST /api/notices
// =====================================================

router.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const {
      title,
      author,
      category,
      content,
      tag,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error:
          "Title and content are required.",
      });
    }

    // ===============================================
    // GENERATE AI SUMMARY
    // ===============================================

    let summaryArray = [];

    let detectedTag =
      tag || "ACADEMIC";

    if (
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim() !== ""
    ) {
      try {
        const ai = new GoogleGenAI({
          apiKey:
            process.env.GEMINI_API_KEY,
        });

        const prompt = `
Summarize this campus notice into 3 short bullet points.

Title:
${title}

Content:
${content}

Return ONLY valid JSON:

{
  "summary": [
    "point 1",
    "point 2",
    "point 3"
  ],
  "urgency": "URGENT" | "ACADEMIC" | "EVENT"
}
`;

        const aiRes =
          await ai.models.generateContent({
            model:
              GEMINI_MODEL,

            contents: [
              {
                role: "user",

                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],

            config: {
              responseMimeType:
                "application/json",
            },
          });

        const parsed =
          JSON.parse(aiRes.text);

        summaryArray =
          Array.isArray(parsed.summary)
            ? parsed.summary
            : [];

        if (parsed.urgency) {
          detectedTag =
            parsed.urgency;
        }
      } catch (error) {
        console.warn(
          "AI Notice Summary skipped:",
          error.message
        );

        summaryArray = [
          "Official circular published by university administration.",
        ];
      }
    } else {
      summaryArray = [
        "Review the circular guidelines carefully.",
        "Check with your department coordinator for details.",
        "Official notice recorded in university database.",
      ];
    }

    let connection;

    try {
      connection =
        await getConnection();

      const tagColor =
        detectedTag === "URGENT"
          ? "bg-error-container text-on-error-container"
          : detectedTag === "EVENT"
          ? "bg-secondary-container text-on-secondary-container"
          : "bg-primary-container text-on-primary-container";

      await connection.execute(
        `
          INSERT INTO notices
          (
            title,
            author,
            tag,
            tag_color,
            category,
            content,
            ai_summary
          )
          VALUES
          (
            :title,
            :author,
            :tag,
            :tagColor,
            :category,
            :content,
            :aiSummary
          )
        `,
        {
          title,

          author:
            author ||
            req.user?.name ||
            "University Administration",

          tag:
            detectedTag,

          tagColor,

          category:
            category ||
            "academic",

          content,

          aiSummary:
            JSON.stringify(
              summaryArray
            ),
        },
        {
          autoCommit: true,
        }
      );

      return res.status(201).json({
        message:
          "Notice published successfully with AI summary!",

        summary:
          summaryArray,
      });
    } catch (err) {
      console.error(
        "Publish Notice Error:",
        err
      );

      return res.status(500).json({
        error:
          "Failed to publish notice. " +
          (err.message || ""),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (closeError) {
          console.error(
            "Notice connection close error:",
            closeError
          );
        }
      }
    }
  }
);

module.exports = router;
