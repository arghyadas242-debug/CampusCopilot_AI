const express = require("express");
const multer = require("multer");
const oracledb = require("oracledb");
const path = require("path");
const fs = require("fs");

const getConnection = require("../db");

const {
  authenticateToken,
  requireStudent,
  requireAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// FOLDERS
// =====================================================

const assignmentFolder = path.join(
  __dirname,
  "..",
  "uploads",
  "assignments"
);

const submissionFolder = path.join(
  __dirname,
  "..",
  "uploads",
  "submissions"
);

// Make sure folders exist.
fs.mkdirSync(assignmentFolder, {
  recursive: true,
});

fs.mkdirSync(submissionFolder, {
  recursive: true,
});

// =====================================================
// HELPERS
// =====================================================

function safeFileBase(originalName) {
  const extension = path
    .extname(originalName)
    .toLowerCase();

  const baseName = path
    .basename(originalName, extension)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 70);

  return {
    extension,
    baseName:
      baseName || "file",
  };
}

function deleteFileIfExists(filePath) {
  if (!filePath) {
    return;
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(
      "Unable to remove old upload:",
      error
    );
  }
}

function filenameFromUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const clean =
      decodeURIComponent(
        String(url)
      );

    return path.basename(clean);
  } catch {
    return path.basename(
      String(url)
    );
  }
}

// =====================================================
// MULTER STORAGE — ASSIGNMENT ATTACHMENTS
// =====================================================

const assignmentStorage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback
    ) => {
      callback(
        null,
        assignmentFolder
      );
    },

    filename: (
      req,
      file,
      callback
    ) => {
      const {
        extension,
        baseName,
      } = safeFileBase(
        file.originalname
      );

      callback(
        null,
        `${Date.now()}-${baseName}${extension}`
      );
    },
  });

// =====================================================
// MULTER STORAGE — STUDENT SUBMISSIONS
// =====================================================

const submissionStorage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback
    ) => {
      callback(
        null,
        submissionFolder
      );
    },

    filename: (
      req,
      file,
      callback
    ) => {
      const {
        extension,
        baseName,
      } = safeFileBase(
        file.originalname
      );

      callback(
        null,
        `${Date.now()}-${baseName}${extension}`
      );
    },
  });

// =====================================================
// FILE FILTERS
// =====================================================

function assignmentFileFilter(
  req,
  file,
  callback
) {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const allowed = [
    ".pdf",
    ".doc",
    ".docx",
  ];

  if (!allowed.includes(extension)) {
    return callback(
      new Error(
        "Assignment attachment must be PDF, DOC or DOCX."
      )
    );
  }

  callback(null, true);
}

function submissionFileFilter(
  req,
  file,
  callback
) {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const allowed = [
    ".pdf",
    ".doc",
    ".docx",
    ".zip",
  ];

  if (!allowed.includes(extension)) {
    return callback(
      new Error(
        "Submission must be PDF, DOC, DOCX or ZIP."
      )
    );
  }

  callback(null, true);
}

// =====================================================
// UPLOAD CONFIG
// =====================================================

const uploadAssignment =
  multer({
    storage:
      assignmentStorage,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },

    fileFilter:
      assignmentFileFilter,
  });

const uploadSubmission =
  multer({
    storage:
      submissionStorage,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },

    fileFilter:
      submissionFileFilter,
  });

// =====================================================
// AUTHENTICATED STUDENT
// =====================================================

async function getAuthenticatedStudent(
  connection,
  req
) {
  const email = String(
    req.user?.email || ""
  )
    .trim()
    .toLowerCase();

  if (!email) {
    const error = new Error(
      "Authenticated account does not contain an email address."
    );

    error.statusCode = 401;

    throw error;
  }

  const result =
    await connection.execute(
      `
      SELECT
        student_roll,
        name,
        email

      FROM students

      WHERE LOWER(email) =
            :email
      `,
      {
        email,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );

  if (
    result.rows.length === 0
  ) {
    const error = new Error(
      "Student profile was not found."
    );

    error.statusCode = 403;

    throw error;
  }

  return result.rows[0];
}

// =====================================================
// CHECK ASSIGNMENT BELONGS TO STUDENT
// =====================================================

async function getStudentAssignment(
  connection,
  assignmentId,
  studentRoll
) {
  const result =
    await connection.execute(
      `
      SELECT
        id,
        student_roll,
        subject_code,
        title,
        due_date,
        status,
        attachment_url

      FROM assignments

      WHERE id = :assignmentId

        AND student_roll =
            :studentRoll
      `,
      {
        assignmentId,
        studentRoll,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );

  return (
    result.rows[0] ||
    null
  );
}

// =====================================================
// ADMIN — UPLOAD ASSIGNMENT ATTACHMENT
//
// POST
// /api/assignment-files/:assignmentId/attachment
//
// form field name:
// file
// =====================================================

router.post(
  "/:assignmentId/attachment",

  authenticateToken,
  requireAdmin,

  uploadAssignment.single(
    "file"
  ),

  async (req, res) => {
    let connection;

    try {
      const assignmentId =
        Number(
          req.params
            .assignmentId
        );

      if (
        !Number.isInteger(
          assignmentId
        ) ||
        assignmentId <= 0
      ) {
        deleteFileIfExists(
          req.file?.path
        );

        return res
          .status(400)
          .json({
            error:
              "Invalid assignment ID.",
          });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({
            error:
              "Please select an assignment file.",
          });
      }

      connection =
        await getConnection();

      const current =
        await connection.execute(
          `
          SELECT
            id,
            attachment_url

          FROM assignments

          WHERE id =
                :assignmentId
          `,
          {
            assignmentId,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );

      if (
        current.rows
          .length === 0
      ) {
        deleteFileIfExists(
          req.file.path
        );

        return res
          .status(404)
          .json({
            error:
              "Assignment not found.",
          });
      }

      const attachmentUrl =
        `/api/assignment-files/${assignmentId}/attachment/${encodeURIComponent(
          req.file.filename
        )}`;

      const oldUrl =
        current.rows[0]
          .ATTACHMENT_URL;

      await connection.execute(
        `
        UPDATE assignments

        SET attachment_url =
            :attachmentUrl

        WHERE id =
              :assignmentId
        `,
        {
          attachmentUrl,
          assignmentId,
        }
      );

      await connection.commit();

      // Remove old file only after
      // database update succeeded.

      if (oldUrl) {
        const oldFilename =
          filenameFromUrl(
            oldUrl
          );

        if (
          oldFilename &&
          oldFilename !==
            req.file.filename
        ) {
          deleteFileIfExists(
            path.join(
              assignmentFolder,
              oldFilename
            )
          );
        }
      }

      return res.json({
        message:
          "Assignment attachment uploaded successfully.",

        assignmentId,

        attachment: {
          fileName:
            req.file
              .originalname,

          url:
            attachmentUrl,
        },
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Attachment rollback error:",
            rollbackError
          );
        }
      }

      deleteFileIfExists(
        req.file?.path
      );

      console.error(
        "Assignment attachment error:",
        error
      );

      return res
        .status(
          error.statusCode ||
            500
        )
        .json({
          error:
            error.message ||
            "Unable to upload assignment attachment.",
        });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (
          closeError
        ) {
          console.error(
            "Connection close error:",
            closeError
          );
        }
      }
    }
  }
);

// =====================================================
// STUDENT — GET FILE/SUBMISSION STATE
//
// GET
// /api/assignment-files/:assignmentId/state
// =====================================================

router.get(
  "/:assignmentId/state",

  authenticateToken,
  requireStudent,

  async (req, res) => {
    let connection;

    try {
      const assignmentId =
        Number(
          req.params
            .assignmentId
        );

      if (
        !Number.isInteger(
          assignmentId
        ) ||
        assignmentId <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid assignment ID.",
          });
      }

      connection =
        await getConnection();

      const student =
        await getAuthenticatedStudent(
          connection,
          req
        );

      const assignment =
        await getStudentAssignment(
          connection,
          assignmentId,
          student.STUDENT_ROLL
        );

      if (!assignment) {
        return res
          .status(404)
          .json({
            error:
              "Assignment not found.",
          });
      }

      const submissionResult =
        await connection.execute(
          `
          SELECT
            submission_id,
            assignment_id,
            student_roll,
            file_name,
            file_url,
            submitted_at,
            status

          FROM assignment_submissions

          WHERE assignment_id =
                :assignmentId

            AND student_roll =
                :studentRoll
          `,
          {
            assignmentId,

            studentRoll:
              student.STUDENT_ROLL,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );

      const submission =
        submissionResult
          .rows[0] ||
        null;

      return res.json({
        assignmentId,

        attachmentUrl:
          assignment
            .ATTACHMENT_URL ||
          null,

        submitted:
          Boolean(submission),

        submission:
          submission
            ? {
                submissionId:
                  submission
                    .SUBMISSION_ID,

                fileName:
                  submission
                    .FILE_NAME,

                fileUrl:
                  submission
                    .FILE_URL,

                submittedAt:
                  submission
                    .SUBMITTED_AT,

                status:
                  submission
                    .STATUS,
              }
            : null,
      });
    } catch (error) {
      console.error(
        "Assignment state error:",
        error
      );

      return res
        .status(
          error.statusCode ||
            500
        )
        .json({
          error:
            error.message ||
            "Unable to load assignment submission state.",
        });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (
          closeError
        ) {
          console.error(
            "Connection close error:",
            closeError
          );
        }
      }
    }
  }
);

// =====================================================
// STUDENT — SUBMIT ASSIGNMENT
//
// POST
// /api/assignment-files/:assignmentId/submit
//
// form field:
// file
// =====================================================

router.post(
  "/:assignmentId/submit",

  authenticateToken,
  requireStudent,

  uploadSubmission.single(
    "file"
  ),

  async (req, res) => {
    let connection;

    try {
      const assignmentId =
        Number(
          req.params
            .assignmentId
        );

      if (
        !Number.isInteger(
          assignmentId
        ) ||
        assignmentId <= 0
      ) {
        deleteFileIfExists(
          req.file?.path
        );

        return res
          .status(400)
          .json({
            error:
              "Invalid assignment ID.",
          });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({
            error:
              "Please select a submission file.",
          });
      }

      connection =
        await getConnection();

      const student =
        await getAuthenticatedStudent(
          connection,
          req
        );

      const assignment =
        await getStudentAssignment(
          connection,
          assignmentId,
          student.STUDENT_ROLL
        );

      if (!assignment) {
        deleteFileIfExists(
          req.file.path
        );

        return res
          .status(404)
          .json({
            error:
              "Assignment not found.",
          });
      }

      // Prevent duplicate POST.

      const existing =
        await connection.execute(
          `
          SELECT
            submission_id

          FROM assignment_submissions

          WHERE assignment_id =
                :assignmentId

            AND student_roll =
                :studentRoll
          `,
          {
            assignmentId,

            studentRoll:
              student.STUDENT_ROLL,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );

      if (
        existing.rows
          .length > 0
      ) {
        deleteFileIfExists(
          req.file.path
        );

        return res
          .status(409)
          .json({
            error:
              "This assignment has already been submitted. Use replace submission instead.",
          });
      }

      const fileUrl =
        `/api/assignment-files/${assignmentId}/submission/${encodeURIComponent(
          req.file.filename
        )}`;

      const result =
        await connection.execute(
          `
          INSERT INTO assignment_submissions (
            assignment_id,
            student_roll,
            file_name,
            file_url,
            status
          )

          VALUES (
            :assignmentId,
            :studentRoll,
            :fileName,
            :fileUrl,
            'SUBMITTED'
          )

          RETURNING submission_id
          INTO :submissionId
          `,
          {
            assignmentId,

            studentRoll:
              student.STUDENT_ROLL,

            fileName:
              req.file
                .originalname,

            fileUrl,

            submissionId: {
              dir:
                oracledb.BIND_OUT,

              type:
                oracledb.NUMBER,
            },
          }
        );

      await connection.commit();

      return res
        .status(201)
        .json({
          message:
            "Assignment submitted successfully.",

          submission: {
            submissionId:
              result.outBinds
                .submissionId[0],

            assignmentId,

            fileName:
              req.file
                .originalname,

            fileUrl,

            status:
              "SUBMITTED",
          },
        });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Submission rollback error:",
            rollbackError
          );
        }
      }

      deleteFileIfExists(
        req.file?.path
      );

      console.error(
        "Assignment submit error:",
        error
      );

      return res
        .status(
          error.statusCode ||
            500
        )
        .json({
          error:
            error.message ||
            "Unable to submit assignment.",
        });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (
          closeError
        ) {
          console.error(
            "Connection close error:",
            closeError
          );
        }
      }
    }
  }
);

// =====================================================
// STUDENT — REPLACE SUBMISSION
//
// PUT
// /api/assignment-files/:assignmentId/submit
// =====================================================

router.put(
  "/:assignmentId/submit",

  authenticateToken,
  requireStudent,

  uploadSubmission.single(
    "file"
  ),

  async (req, res) => {
    let connection;

    try {
      const assignmentId =
        Number(
          req.params
            .assignmentId
        );

      if (
        !Number.isInteger(
          assignmentId
        ) ||
        assignmentId <= 0
      ) {
        deleteFileIfExists(
          req.file?.path
        );

        return res
          .status(400)
          .json({
            error:
              "Invalid assignment ID.",
          });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({
            error:
              "Please select a replacement file.",
          });
      }

      connection =
        await getConnection();

      const student =
        await getAuthenticatedStudent(
          connection,
          req
        );

      const assignment =
        await getStudentAssignment(
          connection,
          assignmentId,
          student.STUDENT_ROLL
        );

      if (!assignment) {
        deleteFileIfExists(
          req.file.path
        );

        return res
          .status(404)
          .json({
            error:
              "Assignment not found.",
          });
      }

      const existing =
        await connection.execute(
          `
          SELECT
            submission_id,
            file_url

          FROM assignment_submissions

          WHERE assignment_id =
                :assignmentId

            AND student_roll =
                :studentRoll
          `,
          {
            assignmentId,

            studentRoll:
              student.STUDENT_ROLL,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );

      if (
        existing.rows
          .length === 0
      ) {
        deleteFileIfExists(
          req.file.path
        );

        return res
          .status(404)
          .json({
            error:
              "No existing submission was found.",
          });
      }

      const oldUrl =
        existing.rows[0]
          .FILE_URL;

      const fileUrl =
        `/api/assignment-files/${assignmentId}/submission/${encodeURIComponent(
          req.file.filename
        )}`;

      await connection.execute(
        `
        UPDATE assignment_submissions

        SET
          file_name =
            :fileName,

          file_url =
            :fileUrl,

          submitted_at =
            CURRENT_TIMESTAMP,

          status =
            'SUBMITTED'

        WHERE assignment_id =
              :assignmentId

          AND student_roll =
              :studentRoll
        `,
        {
          fileName:
            req.file.originalname,

          fileUrl,

          assignmentId,

          studentRoll:
            student.STUDENT_ROLL,
        }
      );

      await connection.commit();

      const oldFilename =
        filenameFromUrl(
          oldUrl
        );

      if (
        oldFilename &&
        oldFilename !==
          req.file.filename
      ) {
        deleteFileIfExists(
          path.join(
            submissionFolder,
            oldFilename
          )
        );
      }

      return res.json({
        message:
          "Submission replaced successfully.",

        submission: {
          assignmentId,

          fileName:
            req.file
              .originalname,

          fileUrl,

          status:
            "SUBMITTED",
        },
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Replace rollback error:",
            rollbackError
          );
        }
      }

      deleteFileIfExists(
        req.file?.path
      );

      console.error(
        "Replace submission error:",
        error
      );

      return res
        .status(
          error.statusCode ||
            500
        )
        .json({
          error:
            error.message ||
            "Unable to replace submission.",
        });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (
          closeError
        ) {
          console.error(
            "Connection close error:",
            closeError
          );
        }
      }
    }
  }
);

// =====================================================
// STUDENT — OPEN ASSIGNMENT ATTACHMENT
// =====================================================

router.get(
  "/:assignmentId/attachment/:fileName",

  authenticateToken,
  requireStudent,

  async (req, res) => {
    let connection;

    try {
      const assignmentId =
        Number(
          req.params
            .assignmentId
        );

      connection =
        await getConnection();

      const student =
        await getAuthenticatedStudent(
          connection,
          req
        );

      const assignment =
        await getStudentAssignment(
          connection,
          assignmentId,
          student.STUDENT_ROLL
        );

      if (
        !assignment ||
        !assignment.ATTACHMENT_URL
      ) {
        return res
          .status(404)
          .json({
            error:
              "Assignment attachment not found.",
          });
      }

      const expectedFilename =
        filenameFromUrl(
          assignment
            .ATTACHMENT_URL
        );

      if (
        expectedFilename !==
        req.params.fileName
      ) {
        return res
          .status(404)
          .json({
            error:
              "Assignment attachment not found.",
          });
      }

      const filePath =
        path.join(
          assignmentFolder,
          expectedFilename
        );

      if (
        !fs.existsSync(
          filePath
        )
      ) {
        return res
          .status(404)
          .json({
            error:
              "Assignment file is missing from storage.",
          });
      }

      return res.sendFile(
        filePath
      );
    } catch (error) {
      console.error(
        "Open assignment file error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to open assignment attachment.",
        });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {
          // Ignore.
        }
      }
    }
  }
);

// =====================================================
// STUDENT — OPEN OWN SUBMISSION
// =====================================================

router.get(
  "/:assignmentId/submission/:fileName",

  authenticateToken,
  requireStudent,

  async (req, res) => {
    let connection;

    try {
      const assignmentId =
        Number(
          req.params
            .assignmentId
        );

      connection =
        await getConnection();

      const student =
        await getAuthenticatedStudent(
          connection,
          req
        );

      const result =
        await connection.execute(
          `
          SELECT
            file_name,
            file_url

          FROM assignment_submissions

          WHERE assignment_id =
                :assignmentId

            AND student_roll =
                :studentRoll
          `,
          {
            assignmentId,

            studentRoll:
              student.STUDENT_ROLL,
          },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );

      if (
        result.rows
          .length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Submission not found.",
          });
      }

      const submission =
        result.rows[0];

      const expectedFilename =
        filenameFromUrl(
          submission.FILE_URL
        );

      if (
        expectedFilename !==
        req.params.fileName
      ) {
        return res
          .status(404)
          .json({
            error:
              "Submission not found.",
          });
      }

      const filePath =
        path.join(
          submissionFolder,
          expectedFilename
        );

      if (
        !fs.existsSync(
          filePath
        )
      ) {
        return res
          .status(404)
          .json({
            error:
              "Submission file is missing from storage.",
          });
      }

      return res.download(
        filePath,
        submission.FILE_NAME
      );
    } catch (error) {
      console.error(
        "Open submission error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to open submission.",
        });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {
          // Ignore.
        }
      }
    }
  }
);

// =====================================================
// MULTER ERROR HANDLER
// =====================================================

router.use(
  (error, req, res, next) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(400)
          .json({
            error:
              "File size must not exceed 10 MB.",
          });
      }

      return res
        .status(400)
        .json({
          error:
            error.message,
        });
    }

    if (error) {
      return res
        .status(400)
        .json({
          error:
            error.message ||
            "Invalid uploaded file.",
        });
    }

    next();
  }
);

module.exports = router;