const express =
  require("express");

const oracledb =
  require("oracledb");

const multer =
  require("multer");

const getConnection =
  require("../db");

const {
  extractPdfText,
  replaceResourceChunks,
  deleteResourceChunks,
  saveResourcePdf,
  deleteResourcePdf,
} = require(
  "../services/resourceRagService"
);


const router =
  express.Router();


// =====================================================
// RESOURCE CONFIGURATION
// =====================================================

const VALID_RESOURCE_TYPES = [
  "PDF",
  "Notes",
  "Question Paper",
  "Video",
  "Link",
  "Other",
];


const FILE_RESOURCE_TYPES =
  new Set([
    "PDF",
    "Notes",
    "Question Paper",
    "Other",
  ]);


// =====================================================
// MULTER CONFIGURATION
// =====================================================

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        10 *
        1024 *
        1024,

      files: 1,

      fields: 20,
    },

    fileFilter: (
      req,
      file,
      callback
    ) => {
      const isPdf =
        file.mimetype ===
          "application/pdf" ||
        String(
          file.originalname ||
          ""
        )
          .toLowerCase()
          .endsWith(
            ".pdf"
          );


      if (!isPdf) {
        return callback(
          new Error(
            "Only PDF files can be uploaded."
          )
        );
      }


      return callback(
        null,
        true
      );
    },
  });


// =====================================================
// SAFE PDF UPLOAD MIDDLEWARE
// =====================================================

function optionalPdfUpload(
  req,
  res,
  next
) {
  upload.single(
    "file"
  )(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }


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
                "PDF file size must be 10 MB or less.",
            });
        }


        return res
          .status(400)
          .json({
            error:
              `PDF upload failed: ${error.message}`,
          });
      }


      return res
        .status(400)
        .json({
          error:
            error.message ||
            "Unable to upload PDF.",
        });
    }
  );
}


// =====================================================
// SEMESTER HELPER
// =====================================================

function parseSemester(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }


  const semester =
    Number(value);


  if (
    !Number.isInteger(
      semester
    ) ||
    semester < 1 ||
    semester > 8
  ) {
    const error =
      new Error(
        "Semester must be between 1 and 8"
      );

    error.statusCode =
      400;

    throw error;
  }


  return semester;
}


// =====================================================
// RESOURCE TYPE HELPER
// =====================================================

function validateResourceType(
  value
) {
  const resourceType =
    String(
      value || ""
    ).trim();


  if (
    !VALID_RESOURCE_TYPES.includes(
      resourceType
    )
  ) {
    const error =
      new Error(
        "Invalid resource type"
      );

    error.statusCode =
      400;

    throw error;
  }


  return resourceType;
}


// =====================================================
// LOCAL RESOURCE URL
// =====================================================

function buildLocalResourceUrl(
  resourceId
) {
  return `/api/resources/${resourceId}/file`;
}


function isLocalResourceUrl(
  value
) {
  return /^\/api\/resources\/\d+\/file$/.test(
    String(
      value || ""
    )
  );
}


// =====================================================
// CLOSE CONNECTION
// =====================================================

async function closeConnection(
  connection
) {
  if (!connection) {
    return;
  }


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


// =====================================================
// GET ALL RESOURCES
// GET /api/admin/resources
// =====================================================

router.get(
  "/",
  async (
    req,
    res
  ) => {
    let connection;


    try {
      connection =
        await getConnection();


      const result =
        await connection.execute(
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
              r.created_at DESC,
              r.resource_id DESC
          `,
          [],
          {
            outFormat:
              oracledb
                .OUT_FORMAT_OBJECT,
          }
        );


      const resources =
        result.rows.map(
          (resource) => ({
            ...resource,

            RAG_READY:
              Number(
                resource
                  .CHUNK_COUNT
              ) > 0
                ? 1
                : 0,
          })
        );


      return res.json(
        resources
      );

    } catch (error) {
      console.error(
        "Admin resources load error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to load resources",

          details:
            error.message,
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// ADD RESOURCE
// POST /api/admin/resources
//
// Supports:
// - application/json
// - multipart/form-data with field name "file"
// =====================================================

router.post(
  "/",
  optionalPdfUpload,
  async (
    req,
    res
  ) => {
    let connection;

    let resourceId = null;

    let localFileSaved =
      false;


    try {
      const {
        subjectCode,
        title,
        description,
        resourceType,
        resourceUrl,
        semester,
        uploadedBy,
      } =
        req.body || {};


      // -------------------------------------------------
      // REQUIRED FIELDS
      // -------------------------------------------------

      if (
        !String(
          subjectCode || ""
        ).trim() ||
        !String(
          title || ""
        ).trim() ||
        !String(
          resourceType || ""
        ).trim()
      ) {
        return res
          .status(400)
          .json({
            error:
              "Subject, title and resource type are required.",
          });
      }


      const cleanSubjectCode =
        String(
          subjectCode
        )
          .trim()
          .toUpperCase();


      const cleanTitle =
        String(
          title
        ).trim();


      const cleanDescription =
        String(
          description || ""
        ).trim() ||
        null;


      const cleanResourceType =
        validateResourceType(
          resourceType
        );


      const cleanSemester =
        parseSemester(
          semester
        );


      const cleanUploadedBy =
        String(
          uploadedBy || ""
        ).trim() ||
        "Academic Office";


      const hasFile =
        Boolean(
          req.file
        );


      const providedUrl =
        String(
          resourceUrl || ""
        ).trim();


      // -------------------------------------------------
      // FILE / URL VALIDATION
      // -------------------------------------------------

      if (
        !hasFile &&
        !providedUrl
      ) {
        return res
          .status(400)
          .json({
            error:
              "Provide either a resource URL or upload a PDF file.",
          });
      }


      if (
        hasFile &&
        !FILE_RESOURCE_TYPES.has(
          cleanResourceType
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "PDF upload is available for PDF, Notes, Question Paper and Other resource types.",
          });
      }


      // -------------------------------------------------
      // EXTRACT PDF BEFORE DATABASE WRITE
      // -------------------------------------------------

      let extractedText =
        null;


      if (hasFile) {
        extractedText =
          await extractPdfText(
            req.file.buffer
          );
      }


      // -------------------------------------------------
      // DATABASE
      // -------------------------------------------------

      connection =
        await getConnection();


      // -------------------------------------------------
      // CHECK SUBJECT
      // -------------------------------------------------

      const subjectResult =
        await connection.execute(
          `
            SELECT
              subject_code,
              subject_name
            FROM subjects
            WHERE UPPER(subject_code) =
                  UPPER(:subjectCode)
          `,
          {
            subjectCode:
              cleanSubjectCode,
          },
          {
            outFormat:
              oracledb
                .OUT_FORMAT_OBJECT,
          }
        );


      if (
        subjectResult.rows
          .length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Subject not found",
          });
      }


      const subjectName =
        subjectResult
          .rows[0]
          .SUBJECT_NAME ||
        cleanSubjectCode;


      // -------------------------------------------------
      // INSERT RESOURCE
      // -------------------------------------------------

      const initialUrl =
        hasFile
          ? "LOCAL_UPLOAD_PENDING"
          : providedUrl;


      const resourceResult =
        await connection.execute(
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
            RETURNING resource_id
            INTO :resourceId
          `,
          {
            subjectCode:
              cleanSubjectCode,

            title:
              cleanTitle,

            description:
              cleanDescription,

            resourceType:
              cleanResourceType,

            resourceUrl:
              initialUrl,

            semester:
              cleanSemester,

            uploadedBy:
              cleanUploadedBy,

            resourceId: {
              dir:
                oracledb
                  .BIND_OUT,

              type:
                oracledb
                  .NUMBER,
            },
          }
        );


      resourceId =
        resourceResult
          .outBinds
          .resourceId[0];


      let finalResourceUrl =
        providedUrl;

      let chunkCount = 0;


      // -------------------------------------------------
      // LOCAL PDF
      // -------------------------------------------------

      if (hasFile) {
        await saveResourcePdf(
          resourceId,
          req.file.buffer
        );


        localFileSaved =
          true;


        finalResourceUrl =
          buildLocalResourceUrl(
            resourceId
          );


        await connection.execute(
          `
            UPDATE resources
            SET resource_url =
                :resourceUrl
            WHERE resource_id =
                  :resourceId
          `,
          {
            resourceUrl:
              finalResourceUrl,

            resourceId,
          }
        );


        chunkCount =
          await replaceResourceChunks(
            connection,
            resourceId,
            extractedText
          );
      }


      // -------------------------------------------------
      // NOTIFICATION
      // -------------------------------------------------

      let notificationMessage =
        `${cleanResourceType}: ${cleanTitle} has been added for ${subjectName}.`;


      if (
        cleanSemester
      ) {
        notificationMessage =
          `${cleanResourceType}: ${cleanTitle} has been added for ${subjectName}, Semester ${cleanSemester}.`;
      }


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
              s.student_roll,
              'RESOURCE',
              :notificationTitle,
              :messageText,
              'RESOURCE',
              :relatedId,
              '/resources',
              0
            FROM students s

            WHERE
              :semester IS NULL
              OR s.semester =
                 :semester
          `,
          {
            notificationTitle:
              "New Study Resource",

            messageText:
              notificationMessage,

            relatedId:
              resourceId,

            semester:
              cleanSemester,
          }
        );


      // -------------------------------------------------
      // COMMIT
      // -------------------------------------------------

      await connection.commit();


      return res
        .status(201)
        .json({
          message:
            hasFile
              ? "PDF resource uploaded and indexed successfully."
              : "Resource added successfully.",

          resourceId,

          resourceUrl:
            finalResourceUrl,

          ragReady:
            chunkCount > 0,

          chunkCount,

          notificationsCreated:
            notificationResult
              .rowsAffected ||
            0,
        });

    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Rollback error:",
            rollbackError
          );
        }
      }


      if (
        localFileSaved &&
        resourceId
      ) {
        try {
          await deleteResourcePdf(
            resourceId
          );
        } catch (
          fileError
        ) {
          console.error(
            "Failed to clean uploaded PDF:",
            fileError
          );
        }
      }


      console.error(
        "Create resource error:",
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
            "Unable to add resource",
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// UPDATE RESOURCE
// PUT /api/admin/resources/:id
// =====================================================

router.put(
  "/:id",
  optionalPdfUpload,
  async (
    req,
    res
  ) => {
    let connection;


    try {
      const resourceId =
        Number(
          req.params.id
        );


      if (
        !Number.isInteger(
          resourceId
        ) ||
        resourceId <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid resource ID",
          });
      }


      const {
        subjectCode,
        title,
        description,
        resourceType,
        resourceUrl,
        semester,
        uploadedBy,
      } =
        req.body || {};


      if (
        !String(
          subjectCode || ""
        ).trim() ||
        !String(
          title || ""
        ).trim() ||
        !String(
          resourceType || ""
        ).trim()
      ) {
        return res
          .status(400)
          .json({
            error:
              "Subject, title and resource type are required.",
          });
      }


      const cleanSubjectCode =
        String(
          subjectCode
        )
          .trim()
          .toUpperCase();


      const cleanResourceType =
        validateResourceType(
          resourceType
        );


      const cleanSemester =
        parseSemester(
          semester
        );


      const hasFile =
        Boolean(
          req.file
        );


      if (
        hasFile &&
        !FILE_RESOURCE_TYPES.has(
          cleanResourceType
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "PDF upload is available for PDF, Notes, Question Paper and Other resource types.",
          });
      }


      let extractedText =
        null;


      if (hasFile) {
        extractedText =
          await extractPdfText(
            req.file.buffer
          );
      }


      connection =
        await getConnection();


      // -------------------------------------------------
      // EXISTING RESOURCE
      // -------------------------------------------------

      const existingResult =
        await connection.execute(
          `
            SELECT
              resource_id,
              resource_url
            FROM resources
            WHERE resource_id =
                  :resourceId
          `,
          {
            resourceId,
          },
          {
            outFormat:
              oracledb
                .OUT_FORMAT_OBJECT,
          }
        );


      if (
        existingResult.rows
          .length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Resource not found",
          });
      }


      const existingUrl =
        existingResult
          .rows[0]
          .RESOURCE_URL ||
        "";


      // -------------------------------------------------
      // SUBJECT EXISTS
      // -------------------------------------------------

      const subjectResult =
        await connection.execute(
          `
            SELECT subject_code
            FROM subjects
            WHERE UPPER(subject_code) =
                  UPPER(:subjectCode)
          `,
          {
            subjectCode:
              cleanSubjectCode,
          },
          {
            outFormat:
              oracledb
                .OUT_FORMAT_OBJECT,
          }
        );


      if (
        subjectResult.rows
          .length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Subject not found",
          });
      }


      let finalResourceUrl =
        String(
          resourceUrl || ""
        ).trim();


      let chunkCount =
        null;


      // -------------------------------------------------
      // NEW PDF FILE
      // -------------------------------------------------

      if (hasFile) {
        await saveResourcePdf(
          resourceId,
          req.file.buffer
        );


        finalResourceUrl =
          buildLocalResourceUrl(
            resourceId
          );


        chunkCount =
          await replaceResourceChunks(
            connection,
            resourceId,
            extractedText
          );

      } else {
        if (
          !finalResourceUrl
        ) {
          finalResourceUrl =
            existingUrl;
        }


        /*
          If admin changes a locally-uploaded
          PDF into an external URL, remove the
          old RAG chunks.
        */

        if (
          isLocalResourceUrl(
            existingUrl
          ) &&
          !isLocalResourceUrl(
            finalResourceUrl
          )
        ) {
          await deleteResourceChunks(
            connection,
            resourceId
          );
        }
      }


      if (
        !finalResourceUrl
      ) {
        return res
          .status(400)
          .json({
            error:
              "A resource URL or PDF file is required.",
          });
      }


      // -------------------------------------------------
      // UPDATE RESOURCE
      // -------------------------------------------------

      await connection.execute(
        `
          UPDATE resources
          SET
            subject_code =
              :subjectCode,

            title =
              :title,

            description =
              :description,

            resource_type =
              :resourceType,

            resource_url =
              :resourceUrl,

            semester =
              :semester,

            uploaded_by =
              :uploadedBy

          WHERE resource_id =
                :resourceId
        `,
        {
          subjectCode:
            cleanSubjectCode,

          title:
            String(
              title
            ).trim(),

          description:
            String(
              description || ""
            ).trim() ||
            null,

          resourceType:
            cleanResourceType,

          resourceUrl:
            finalResourceUrl,

          semester:
            cleanSemester,

          uploadedBy:
            String(
              uploadedBy || ""
            ).trim() ||
            "Academic Office",

          resourceId,
        }
      );


      await connection.commit();


      /*
        Remove physical PDF only after the
        database successfully switches away
        from the local upload.
      */

      if (
        !hasFile &&
        isLocalResourceUrl(
          existingUrl
        ) &&
        !isLocalResourceUrl(
          finalResourceUrl
        )
      ) {
        try {
          await deleteResourcePdf(
            resourceId
          );
        } catch (
          fileError
        ) {
          console.error(
            "Old PDF cleanup error:",
            fileError
          );
        }
      }


      return res.json({
        message:
          hasFile
            ? "Resource updated and PDF re-indexed successfully."
            : "Resource updated successfully.",

        resourceId,

        resourceUrl:
          finalResourceUrl,

        ragReady:
          hasFile
            ? chunkCount >
              0
            : undefined,

        chunkCount,
      });

    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Update resource error:",
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
            "Unable to update resource",
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


// =====================================================
// DELETE RESOURCE
// DELETE /api/admin/resources/:id
// =====================================================

router.delete(
  "/:id",
  async (
    req,
    res
  ) => {
    let connection;


    try {
      const resourceId =
        Number(
          req.params.id
        );


      if (
        !Number.isInteger(
          resourceId
        ) ||
        resourceId <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid resource ID",
          });
      }


      connection =
        await getConnection();


      const existing =
        await connection.execute(
          `
            SELECT
              resource_id,
              resource_url
            FROM resources
            WHERE resource_id =
                  :resourceId
          `,
          {
            resourceId,
          },
          {
            outFormat:
              oracledb
                .OUT_FORMAT_OBJECT,
          }
        );


      if (
        existing.rows
          .length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Resource not found",
          });
      }


      const resourceUrl =
        existing.rows[0]
          .RESOURCE_URL ||
        "";


      /*
        RESOURCE_CHUNKS is automatically deleted
        because the FK uses ON DELETE CASCADE.
      */

      await connection.execute(
        `
          DELETE FROM resources
          WHERE resource_id =
                :resourceId
        `,
        {
          resourceId,
        }
      );


      await connection.commit();


      if (
        isLocalResourceUrl(
          resourceUrl
        )
      ) {
        try {
          await deleteResourcePdf(
            resourceId
          );
        } catch (
          fileError
        ) {
          console.error(
            "Resource PDF cleanup error:",
            fileError
          );
        }
      }


      return res.json({
        message:
          "Resource deleted successfully",
      });

    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Rollback error:",
            rollbackError
          );
        }
      }


      console.error(
        "Delete resource error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to delete resource",

          details:
            error.message,
        });

    } finally {
      await closeConnection(
        connection
      );
    }
  }
);


module.exports =
  router;