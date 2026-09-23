const express = require("express");
const oracledb = require("oracledb");
const multer = require("multer");
const fs = require("fs/promises");
const crypto = require("crypto");

const getConnection = require("../db");

const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/authMiddleware");

const {
  extractPdfText,
  replaceResourceChunks,
  deleteResourceChunks,
  getResourcePdfPath,
  ensureUploadDirectory,
} = require("../services/resourceRagService");

const router = express.Router();

// =====================================================
// ADMIN AUTHORIZATION
// =====================================================

router.use(authenticateToken, requireAdmin);

router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// =====================================================
// CONFIGURATION
// =====================================================

const DB_OPTIONS = {
  outFormat: oracledb.OUT_FORMAT_OBJECT,
  autoCommit: false,
};

const WRITE_OPTIONS = {
  autoCommit: false,
};

const VALID_RESOURCE_TYPES = [
  "PDF",
  "Notes",
  "Question Paper",
  "Video",
  "Link",
  "Other",
];

const FILE_RESOURCE_TYPES = new Set([
  "PDF",
  "Notes",
  "Question Paper",
  "Other",
]);

// =====================================================
// VALIDATION
// =====================================================

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function resourceId(value) {
  if (
    !/^\d+$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) <= 0
  ) {
    throw new RequestError(400, "Invalid resource ID");
  }

  return Number(value);
}

function textField(value, label, required = false) {
  if (value === undefined || value === null) {
    value = "";
  }

  if (typeof value !== "string") {
    throw new RequestError(
      400,
      `${label} must be text.`
    );
  }

  const clean = value.trim();

  if (required && !clean) {
    throw new RequestError(
      400,
      "Subject, title and resource type are required."
    );
  }

  return clean;
}

function parseInput(req) {
  if (
    !req.body ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    throw new RequestError(
      400,
      "A request body is required."
    );
  }

  const body = req.body;

  const type = textField(
    body.resourceType,
    "Resource type",
    true
  );

  if (!VALID_RESOURCE_TYPES.includes(type)) {
    throw new RequestError(400, "Invalid resource type");
  }

  let semester = null;

  if (
    body.semester !== undefined &&
    body.semester !== null &&
    body.semester !== ""
  ) {
    if (
      !["string", "number"].includes(
        typeof body.semester
      )
    ) {
      throw new RequestError(
        400,
        "Semester must be between 1 and 8"
      );
    }

    semester = Number(body.semester);

    if (
      !Number.isInteger(semester) ||
      semester < 1 ||
      semester > 8
    ) {
      throw new RequestError(
        400,
        "Semester must be between 1 and 8"
      );
    }
  }

  if (
    req.file &&
    !FILE_RESOURCE_TYPES.has(type)
  ) {
    throw new RequestError(
      400,
      "PDF upload is available for PDF, Notes, Question Paper and Other resource types."
    );
  }

  return {
    subjectCode: textField(
      body.subjectCode,
      "Subject",
      true
    ).toUpperCase(),

    title: textField(body.title, "Title", true),

    description:
      textField(body.description, "Description") || null,

    resourceType: type,

    resourceUrl: textField(
      body.resourceUrl,
      "Resource URL"
    ),

    semester,

    uploadedBy:
      textField(body.uploadedBy, "Uploaded by") ||
      "Academic Office",
  };
}

function localUrl(id) {
  return `/api/resources/${id}/file`;
}

function isLocalUrl(value) {
  return /^\/api\/resources\/\d+\/file$/.test(
    String(value || "")
  );
}

function externalUrl(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new RequestError(
      400,
      "Provide a valid HTTP or HTTPS resource URL."
    );
  }

  if (
    !/^https?:\/\//i.test(value) ||
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    /[\u0000-\u0020\u007f\\]/.test(value)
  ) {
    throw new RequestError(
      400,
      "Provide a valid HTTP or HTTPS resource URL without embedded credentials."
    );
  }

  return value;
}

// =====================================================
// UPLOAD
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 20,
    parts: 21,
  },

  fileFilter(req, file, callback) {
    const pdfMetadata =
      file.mimetype === "application/pdf" ||
      String(file.originalname || "")
        .toLowerCase()
        .endsWith(".pdf");

    if (!pdfMetadata) {
      return callback(
        new RequestError(
          400,
          "Only PDF files can be uploaded."
        )
      );
    }

    return callback(null, true);
  },
});

function optionalPdfUpload(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      return next();
    }

    console.error("Resource upload error:", error);

    const message =
      error instanceof RequestError
        ? error.message
        : error.code === "LIMIT_FILE_SIZE"
          ? "PDF file size must be 10 MB or less."
          : "Invalid PDF upload. Use one file in the file field and valid form fields.";

    return res.status(400).json({
      error: message,
    });
  });
}

async function extractUpload(file) {
  if (!file) {
    return null;
  }

  try {
    return await extractPdfText(file.buffer);
  } catch (error) {
    console.error("Resource PDF extraction error:", error);

    if (error.statusCode === 422) {
      throw new RequestError(
        422,
        "This PDF does not contain enough extractable text for CampusCopilot. Scanned image-only PDFs will require OCR."
      );
    }

    if (error.statusCode === 400) {
      throw new RequestError(
        400,
        "The uploaded file is not a valid PDF."
      );
    }

    throw new RequestError(
      422,
      "Unable to read this PDF. Upload a readable, unencrypted PDF."
    );
  }
}

// =====================================================
// FILE STAGING AND RECOVERY
// =====================================================

// Staging and backup files are never returned in API responses.
// Existing resource rows remain locked during file recovery.

function fileChange(id) {
  const target = getResourcePdfPath(id);
  const suffix = crypto.randomUUID();

  return {
    target,
    staged: `${target}.${suffix}.pending`,
    backup: `${target}.${suffix}.backup`,
    moved: false,
    installed: false,
    stagedCreated: false,
  };
}

async function removeIfPresent(filename) {
  try {
    await fs.unlink(filename);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function applyFileChange(
  change,
  buffer,
  creating = false
) {
  await ensureUploadDirectory();

  if (buffer) {
    change.stagedCreated = true;

    await fs.writeFile(change.staged, buffer, {
      flag: "wx",
      mode: 0o600,
    });
  }

  if (creating) {
    try {
      await fs.lstat(change.target);

      throw new RequestError(
        409,
        "A file already exists for this resource ID. No existing file was overwritten."
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  } else {
    try {
      await fs.rename(change.target, change.backup);
      change.moved = true;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  if (buffer) {
    await fs.rename(change.staged, change.target);

    change.installed = true;
    change.stagedCreated = false;
  }
}

async function restoreFile(change) {
  if (!change) {
    return;
  }

  if (change.installed) {
    await removeIfPresent(change.target);
  }

  if (change.moved) {
    await fs.rename(change.backup, change.target);
  }

  if (change.stagedCreated) {
    await removeIfPresent(change.staged);
  }
}

async function finishFile(change) {
  if (!change) {
    return false;
  }

  try {
    if (change.moved) {
      await removeIfPresent(change.backup);
    }

    if (change.stagedCreated) {
      await removeIfPresent(change.staged);
    }

    return false;
  } catch (error) {
    console.error(
      "Committed resource backup cleanup pending:",
      change,
      error
    );

    return true;
  }
}

// =====================================================
// TRANSACTION HELPERS
// =====================================================

function transactionState() {
  return {
    connection: null,
    file: null,
    commitStarted: false,
    committed: false,
  };
}

async function closeConnection(connection) {
  if (!connection) {
    return;
  }

  try {
    await connection.close();
  } catch (error) {
    console.error(
      "Resource connection close error:",
      error
    );
  }
}

async function handleFailure(
  state,
  error,
  res,
  message
) {
  console.error(message, error);

  if (state.commitStarted) {
    // A failed commit response does not prove Oracle rolled back.
    // Retain recovery files rather than delete potentially
    // committed resource data.
    console.error(
      "Resource commit requires reconciliation:",
      {
        committed: state.committed,
        file: state.file,
      }
    );

    return res.status(500).json({
      error:
        "The resource operation could not be confirmed. Reload the resource list before retrying; administrator verification may be required.",
      code: "RESOURCE_COMMIT_UNCONFIRMED",
    });
  }

  let recoveryFailed = false;

  // Restore files before releasing the resource row lock.
  try {
    await restoreFile(state.file);
  } catch (recoveryError) {
    recoveryFailed = true;

    console.error(
      "Resource file recovery failed:",
      state.file,
      recoveryError
    );
  }

  if (state.connection) {
    try {
      await state.connection.rollback();
    } catch (rollbackError) {
      recoveryFailed = true;

      console.error(
        "Resource rollback failed:",
        rollbackError
      );
    }
  }

  if (recoveryFailed) {
    return res.status(500).json({
      error:
        "The operation failed and recovery needs administrator attention.",
      code: "RESOURCE_RECOVERY_REQUIRED",
    });
  }

  return res
    .status(
      error instanceof RequestError
        ? error.status
        : 500
    )
    .json({
      error:
        error instanceof RequestError
          ? error.message
          : message,
    });
}

async function commit(state) {
  state.commitStarted = true;

  await state.connection.commit();

  state.committed = true;
}

// =====================================================
// GET ALL RESOURCES
// =====================================================

router.get("/", async (req, res) => {
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
            WHERE rc.resource_id = r.resource_id
          ) AS chunk_count

        FROM resources r

        LEFT JOIN subjects s
          ON r.subject_code = s.subject_code

        ORDER BY
          r.created_at DESC,
          r.resource_id DESC
      `,
      [],
      DB_OPTIONS
    );

    return res.json(
      result.rows.map((resource) => ({
        ...resource,
        RAG_READY:
          Number(resource.CHUNK_COUNT) > 0 ? 1 : 0,
      }))
    );
  } catch (error) {
    console.error("Admin resources load error:", error);

    return res.status(500).json({
      error: "Unable to load resources",
    });
  } finally {
    await closeConnection(connection);
  }
});

// =====================================================
// ADD RESOURCE
// =====================================================

router.post("/", optionalPdfUpload, async (req, res) => {
  const state = transactionState();

  try {
    const input = parseInput(req);
    const hasFile = Boolean(req.file);

    if (!hasFile && !input.resourceUrl) {
      throw new RequestError(
        400,
        "Provide either a resource URL or upload a PDF file."
      );
    }

    if (!hasFile) {
      input.resourceUrl = externalUrl(input.resourceUrl);
    }

    const text = await extractUpload(req.file);

    const connection =
      state.connection = await getConnection();

    const subject = await connection.execute(
      `
        SELECT subject_code, subject_name
        FROM subjects
        WHERE UPPER(subject_code) = UPPER(:subjectCode)
      `,
      {
        subjectCode: input.subjectCode,
      },
      DB_OPTIONS
    );

    if (!subject.rows.length) {
      throw new RequestError(404, "Subject not found");
    }

    const result = await connection.execute(
      `
        INSERT INTO resources (
          subject_code,
          title,
          description,
          resource_type,
          resource_url,
          semester,
          uploaded_by
        )
        VALUES (
          :subjectCode,
          :title,
          :description,
          :resourceType,
          :resourceUrl,
          :semester,
          :uploadedBy
        )
        RETURNING resource_id INTO :resourceId
      `,
      {
        ...input,

        resourceUrl:
          hasFile
            ? "LOCAL_UPLOAD_PENDING"
            : input.resourceUrl,

        resourceId: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER,
        },
      },
      WRITE_OPTIONS
    );

    const id = resourceId(
      Array.isArray(result.outBinds.resourceId)
        ? result.outBinds.resourceId[0]
        : result.outBinds.resourceId
    );

    let chunkCount = 0;

    const finalUrl =
      hasFile ? localUrl(id) : input.resourceUrl;

    if (hasFile) {
      await connection.execute(
        `
          UPDATE resources
          SET resource_url = :resourceUrl
          WHERE resource_id = :resourceId
        `,
        {
          resourceUrl: finalUrl,
          resourceId: id,
        },
        WRITE_OPTIONS
      );

      chunkCount = await replaceResourceChunks(
        connection,
        id,
        text
      );
    }

    const subjectName =
      subject.rows[0].SUBJECT_NAME ||
      input.subjectCode;

    const message =
      `${input.resourceType}: ${input.title} has been added for ${subjectName}` +
      (
        input.semester
          ? `, Semester ${input.semester}`
          : ""
      ) +
      ".";

    const notifications = await connection.execute(
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
          s.student_roll,
          'RESOURCE',
          :notificationTitle,
          :messageText,
          'RESOURCE',
          :relatedId,
          '/resources',
          0

        FROM students s

        WHERE :semester IS NULL
          OR s.semester = :semester
      `,
      {
        notificationTitle: "New Study Resource",
        messageText: message,
        relatedId: id,
        semester: input.semester,
      },
      WRITE_OPTIONS
    );

    if (hasFile) {
      state.file = fileChange(id);

      await applyFileChange(
        state.file,
        req.file.buffer,
        true
      );
    }

    await commit(state);

    const cleanupPending = await finishFile(state.file);

    return res.status(201).json({
      message:
        hasFile
          ? "PDF resource uploaded and indexed successfully."
          : "Resource added successfully.",

      resourceId: id,
      resourceUrl: finalUrl,
      ragReady: chunkCount > 0,
      chunkCount,

      notificationsCreated:
        notifications.rowsAffected || 0,

      ...(cleanupPending
        ? { cleanupPending: true }
        : {}),
    });
  } catch (error) {
    return await handleFailure(
      state,
      error,
      res,
      "Unable to add resource"
    );
  } finally {
    await closeConnection(state.connection);
  }
});

// =====================================================
// UPDATE RESOURCE
// =====================================================

router.put("/:id", optionalPdfUpload, async (req, res) => {
  const state = transactionState();

  try {
    const id = resourceId(req.params.id);
    const input = parseInput(req);
    const hasFile = Boolean(req.file);
    const text = await extractUpload(req.file);

    const connection =
      state.connection = await getConnection();

    const existing = await connection.execute(
      `
        SELECT resource_id, resource_url
        FROM resources
        WHERE resource_id = :resourceId
        FOR UPDATE WAIT 5
      `,
      {
        resourceId: id,
      },
      DB_OPTIONS
    );

    if (!existing.rows.length) {
      throw new RequestError(404, "Resource not found");
    }

    const oldUrl =
      existing.rows[0].RESOURCE_URL || "";

    const subject = await connection.execute(
      `
        SELECT subject_code
        FROM subjects
        WHERE UPPER(subject_code) = UPPER(:subjectCode)
      `,
      {
        subjectCode: input.subjectCode,
      },
      DB_OPTIONS
    );

    if (!subject.rows.length) {
      throw new RequestError(404, "Subject not found");
    }

    let finalUrl =
      hasFile
        ? localUrl(id)
        : input.resourceUrl || oldUrl;

    if (!finalUrl) {
      throw new RequestError(
        400,
        "A resource URL or PDF file is required."
      );
    }

    if (!hasFile) {
      if (isLocalUrl(finalUrl)) {
        if (
          finalUrl !== localUrl(id) ||
          oldUrl !== finalUrl
        ) {
          throw new RequestError(
            400,
            "Upload a PDF to create or change a local resource file."
          );
        }
      } else {
        finalUrl = externalUrl(finalUrl);
      }
    }

    let chunkCount = null;

    const removeOldFile =
      !hasFile &&
      isLocalUrl(oldUrl) &&
      !isLocalUrl(finalUrl);

    if (hasFile) {
      chunkCount = await replaceResourceChunks(
        connection,
        id,
        text
      );
    } else if (removeOldFile) {
      await deleteResourceChunks(connection, id);
    }

    const result = await connection.execute(
      `
        UPDATE resources
        SET
          subject_code = :subjectCode,
          title = :title,
          description = :description,
          resource_type = :resourceType,
          resource_url = :resourceUrl,
          semester = :semester,
          uploaded_by = :uploadedBy
        WHERE resource_id = :resourceId
      `,
      {
        ...input,
        resourceUrl: finalUrl,
        resourceId: id,
      },
      WRITE_OPTIONS
    );

    if (result.rowsAffected !== 1) {
      throw new Error(
        "Resource update did not affect one row."
      );
    }

    if (hasFile || removeOldFile) {
      state.file = fileChange(id);

      await applyFileChange(
        state.file,
        hasFile ? req.file.buffer : null
      );
    }

    await commit(state);

    const cleanupPending = await finishFile(state.file);

    return res.json({
      message:
        hasFile
          ? "Resource updated and PDF re-indexed successfully."
          : "Resource updated successfully.",

      resourceId: id,
      resourceUrl: finalUrl,

      ragReady:
        hasFile ? chunkCount > 0 : undefined,

      chunkCount,

      ...(cleanupPending
        ? { cleanupPending: true }
        : {}),
    });
  } catch (error) {
    return await handleFailure(
      state,
      error,
      res,
      "Unable to update resource"
    );
  } finally {
    await closeConnection(state.connection);
  }
});

// =====================================================
// DELETE RESOURCE
// =====================================================

router.delete("/:id", async (req, res) => {
  const state = transactionState();

  try {
    const id = resourceId(req.params.id);

    const connection =
      state.connection = await getConnection();

    const existing = await connection.execute(
      `
        SELECT resource_id, resource_url
        FROM resources
        WHERE resource_id = :resourceId
        FOR UPDATE WAIT 5
      `,
      {
        resourceId: id,
      },
      DB_OPTIONS
    );

    if (!existing.rows.length) {
      throw new RequestError(404, "Resource not found");
    }

    // Preserve the existing ON DELETE CASCADE behavior
    // for resource_chunks.
    const result = await connection.execute(
      `
        DELETE FROM resources
        WHERE resource_id = :resourceId
      `,
      {
        resourceId: id,
      },
      WRITE_OPTIONS
    );

    if (result.rowsAffected !== 1) {
      throw new Error(
        "Resource delete did not affect one row."
      );
    }

    if (isLocalUrl(existing.rows[0].RESOURCE_URL)) {
      state.file = fileChange(id);

      await applyFileChange(state.file, null);
    }

    await commit(state);

    const cleanupPending = await finishFile(state.file);

    return res.json({
      message: "Resource deleted successfully",

      ...(cleanupPending
        ? { cleanupPending: true }
        : {}),
    });
  } catch (error) {
    return await handleFailure(
      state,
      error,
      res,
      "Unable to delete resource"
    );
  } finally {
    await closeConnection(state.connection);
  }
});

module.exports = router;