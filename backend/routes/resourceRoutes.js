const express = require("express");
const oracledb = require("oracledb");
const fs = require("fs/promises");

const getConnection = require("../db");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  getResourcePdfPath,
} = require("../services/resourceRagService");

const router = express.Router();

async function closeConnection(connection) {
  if (!connection) return;

  try {
    await connection.close();
  } catch (closeError) {
    console.error("Connection close error:", closeError);
  }
}

// GET /api/resources
router.get("/", authenticateToken, async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
        SELECT
          r.resource_id,
          r.subject_code,
          s.subject_name,
          s.faculty_name,
          r.title,
          r.description,
          r.resource_type,
          r.resource_url,
          r.semester,
          r.uploaded_by,
          r.created_at,

          (
            SELECT COUNT(*)
            FROM resource_chunks rc
            WHERE rc.resource_id =
                  r.resource_id
          ) AS chunk_count

        FROM resources r

        LEFT JOIN subjects s
          ON r.subject_code =
             s.subject_code

        ORDER BY
          s.subject_name,
          r.created_at DESC,
          r.resource_id DESC
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    const resources = result.rows.map((resource) => ({
      ...resource,
      RAG_READY: Number(resource.CHUNK_COUNT) > 0 ? 1 : 0,
    }));

    res.setHeader("Cache-Control", "no-store");

    return res.json(resources);
  } catch (error) {
    console.error("Student resources load error:", error);

    return res.status(500).json({
      error: "Unable to load resources",
    });
  } finally {
    await closeConnection(connection);
  }
});

// GET /api/resources/:id/file
router.get("/:id/file", authenticateToken, async (req, res) => {
  let connection;

  try {
    const rawId = req.params.id;
    const resourceId = Number(rawId);

    if (
      !/^[0-9]+$/.test(rawId) ||
      !Number.isSafeInteger(resourceId) ||
      resourceId <= 0
    ) {
      return res.status(400).json({
        error: "Invalid resource ID",
      });
    }

    connection = await getConnection();

    const result = await connection.execute(
      `
        SELECT
          resource_id,
          title,
          resource_url
        FROM resources
        WHERE resource_id = :resourceId
      `,
      {
        resourceId,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Resource not found",
      });
    }

    const resource = result.rows[0];
    const expectedUrl = `/api/resources/${resourceId}/file`;

    if (resource.RESOURCE_URL !== expectedUrl) {
      return res.status(404).json({
        error: "This resource is not a locally uploaded PDF.",
      });
    }

    const filePath = getResourcePdfPath(resourceId);

    try {
      const fileStat = await fs.stat(filePath);

      if (!fileStat.isFile()) {
        return res.status(404).json({
          error: "The PDF file could not be found.",
        });
      }
    } catch (fileError) {
      if (
        fileError.code === "ENOENT" ||
        fileError.code === "ENOTDIR"
      ) {
        return res.status(404).json({
          error: "The PDF file could not be found.",
        });
      }

      throw fileError;
    }

    const safeFileName =
      String(resource.TITLE || `resource-${resourceId}`)
        .replace(/[^a-zA-Z0-9 _.-]/g, "")
        .trim()
        .slice(0, 150) || `resource-${resourceId}`;

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.sendFile(
      filePath,
      {
        cacheControl: false,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${safeFileName}.pdf"`,
        },
      },
      (fileError) => {
        if (!fileError) return;

        console.error("Resource PDF transfer error:", fileError);

        if (res.destroyed || res.writableEnded) return;

        if (res.headersSent) {
          res.destroy();
          return;
        }

        res.removeHeader("Content-Disposition");
        res.removeHeader("Content-Type");
        res.removeHeader("Content-Length");
        res.removeHeader("Content-Range");

        if (
          fileError.code === "ENOENT" ||
          fileError.code === "ENOTDIR" ||
          fileError.status === 404
        ) {
          return res.status(404).json({
            error: "The PDF file could not be found.",
          });
        }

        if (fileError.status === 416) {
          return res.status(416).json({
            error: "Requested file range is not available.",
          });
        }

        return res.status(500).json({
          error: "Unable to open this resource.",
        });
      }
    );
  } catch (error) {
    console.error("Open resource PDF error:", error);

    if (res.destroyed || res.writableEnded) return;

    if (res.headersSent) {
      res.destroy();
      return;
    }

    return res.status(500).json({
      error: "Unable to open this resource.",
    });
  } finally {
    await closeConnection(connection);
  }
});

module.exports = router;