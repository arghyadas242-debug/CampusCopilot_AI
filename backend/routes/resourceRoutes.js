const express =
  require("express");

const oracledb =
  require("oracledb");

const fs =
  require("fs/promises");

const getConnection =
  require("../db");

const {
  getResourcePdfPath,
} = require(
  "../services/resourceRagService"
);


const router =
  express.Router();


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
// GET STUDENT RESOURCES
// GET /api/resources
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
              s.subject_name,
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
        "Student resources load error:",
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
// OPEN LOCALLY-UPLOADED PDF
// GET /api/resources/:id/file
// =====================================================

router.get(
  "/:id/file",
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


      const result =
        await connection.execute(
          `
            SELECT
              resource_id,
              title,
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
        result.rows
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


      const resource =
        result.rows[0];


      const expectedUrl =
        `/api/resources/${resourceId}/file`;


      if (
        resource
          .RESOURCE_URL !==
        expectedUrl
      ) {
        return res
          .status(404)
          .json({
            error:
              "This resource is not a locally uploaded PDF.",
          });
      }


      const filePath =
        getResourcePdfPath(
          resourceId
        );


      try {
        await fs.access(
          filePath
        );
      } catch {
        return res
          .status(404)
          .json({
            error:
              "The PDF file could not be found.",
          });
      }


      const safeFileName =
        String(
          resource.TITLE ||
          `resource-${resourceId}`
        )
          .replace(
            /[^a-zA-Z0-9 _.-]/g,
            ""
          )
          .trim() ||
        `resource-${resourceId}`;


      res.setHeader(
        "Content-Type",
        "application/pdf"
      );


      res.setHeader(
        "Content-Disposition",
        `inline; filename="${safeFileName}.pdf"`
      );


      return res.sendFile(
        filePath
      );

    } catch (error) {
      console.error(
        "Open resource PDF error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Unable to open this resource.",
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