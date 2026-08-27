const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();


const VALID_RESOURCE_TYPES = [
  "PDF",
  "Notes",
  "Question Paper",
  "Video",
  "Link",
  "Other",
];


// =====================================================
// GET ALL RESOURCES
// GET /api/admin/resources
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
        r.created_at
      FROM resources r

      LEFT JOIN subjects s
        ON r.subject_code = s.subject_code

      ORDER BY
        r.created_at DESC,
        r.resource_id DESC
      `,
      [],
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);

  } catch (error) {

    console.error(
      "Admin resources load error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to load resources",

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
// ADD RESOURCE
// POST /api/admin/resources
// =====================================================

router.post("/", async (req, res) => {
  let connection;

  try {
    const {
      subjectCode,
      title,
      description,
      resourceType,
      resourceUrl,
      semester,
      uploadedBy,
    } = req.body;


    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    if (
      !subjectCode?.trim() ||
      !title?.trim() ||
      !resourceType?.trim() ||
      !resourceUrl?.trim()
    ) {
      return res.status(400).json({
        error:
          "Subject, title, resource type and resource URL are required",
      });
    }


    const cleanSubjectCode =
      subjectCode.trim().toUpperCase();

    const cleanTitle =
      title.trim();

    const cleanDescription =
      description?.trim() || null;

    const cleanResourceType =
      resourceType.trim();

    const cleanResourceUrl =
      resourceUrl.trim();

    const cleanUploadedBy =
      uploadedBy?.trim() ||
      "Academic Office";


    // -------------------------------------------------
    // RESOURCE TYPE VALIDATION
    // -------------------------------------------------

    if (
      !VALID_RESOURCE_TYPES.includes(
        cleanResourceType
      )
    ) {
      return res.status(400).json({
        error:
          "Invalid resource type",
      });
    }


    // -------------------------------------------------
    // SEMESTER VALIDATION
    // -------------------------------------------------

    let cleanSemester = null;

    if (
      semester !== undefined &&
      semester !== null &&
      semester !== ""
    ) {
      cleanSemester =
        Number(semester);

      if (
        !Number.isInteger(
          cleanSemester
        ) ||
        cleanSemester < 1 ||
        cleanSemester > 8
      ) {
        return res.status(400).json({
          error:
            "Semester must be between 1 and 8",
        });
      }
    }


    // -------------------------------------------------
    // DATABASE CONNECTION
    // -------------------------------------------------

    connection = await getConnection();


    // -------------------------------------------------
    // CHECK SUBJECT EXISTS
    // ALSO GET SUBJECT NAME FOR NOTIFICATION
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
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      subjectResult.rows.length === 0
    ) {
      return res.status(404).json({
        error:
          "Subject not found",
      });
    }


    const subjectName =
      subjectResult.rows[0]
        .SUBJECT_NAME ||
      cleanSubjectCode;


    // -------------------------------------------------
    // INSERT RESOURCE
    // GET GENERATED RESOURCE ID
    // -------------------------------------------------

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
            cleanResourceUrl,

          semester:
            cleanSemester,

          uploadedBy:
            cleanUploadedBy,

          resourceId: {
            dir:
              oracledb.BIND_OUT,
            type:
              oracledb.NUMBER,
          },
        }
      );


    // -------------------------------------------------
    // GET GENERATED RESOURCE ID
    // -------------------------------------------------

    const resourceId =
      resourceResult.outBinds
        .resourceId[0];


    // -------------------------------------------------
    // BUILD NOTIFICATION MESSAGE
    // -------------------------------------------------

    let notificationMessage =
      `${cleanResourceType}: ${cleanTitle} has been added for ${subjectName}.`;


    if (cleanSemester) {
      notificationMessage =
        `${cleanResourceType}: ${cleanTitle} has been added for ${subjectName}, Semester ${cleanSemester}.`;
    }


    // -------------------------------------------------
    // CREATE RESOURCE NOTIFICATIONS
    //
    // If SEMESTER is selected:
    // Only students from that semester receive it.
    //
    // If SEMESTER is NULL:
    // All students receive it.
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
          OR s.semester = :semester
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
    // COMMIT RESOURCE + NOTIFICATIONS TOGETHER
    // -------------------------------------------------

    await connection.commit();


    return res.status(201).json({
      message:
        "Resource added successfully",

      resourceId,

      notificationsCreated:
        notificationResult
          .rowsAffected || 0,
    });

  } catch (error) {

    // -------------------------------------------------
    // ROLLBACK RESOURCE + NOTIFICATIONS
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
      "Create resource error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to add resource",

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
// UPDATE RESOURCE
// PUT /api/admin/resources/:id
// =====================================================

router.put("/:id", async (req, res) => {
  let connection;

  try {
    const resourceId =
      Number(req.params.id);


    if (
      !Number.isInteger(
        resourceId
      ) ||
      resourceId <= 0
    ) {
      return res.status(400).json({
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
    } = req.body;


    if (
      !subjectCode?.trim() ||
      !title?.trim() ||
      !resourceType?.trim() ||
      !resourceUrl?.trim()
    ) {
      return res.status(400).json({
        error:
          "Subject, title, resource type and resource URL are required",
      });
    }


    const cleanSubjectCode =
      subjectCode
        .trim()
        .toUpperCase();


    const cleanResourceType =
      resourceType.trim();


    if (
      !VALID_RESOURCE_TYPES.includes(
        cleanResourceType
      )
    ) {
      return res.status(400).json({
        error:
          "Invalid resource type",
      });
    }


    // -------------------------------------------------
    // SEMESTER VALIDATION
    // -------------------------------------------------

    let cleanSemester = null;


    if (
      semester !== undefined &&
      semester !== null &&
      semester !== ""
    ) {

      cleanSemester =
        Number(semester);


      if (
        !Number.isInteger(
          cleanSemester
        ) ||
        cleanSemester < 1 ||
        cleanSemester > 8
      ) {

        return res.status(400).json({
          error:
            "Semester must be between 1 and 8",
        });
      }
    }


    connection = await getConnection();


    // -------------------------------------------------
    // CHECK RESOURCE EXISTS
    // -------------------------------------------------

    const existing =
      await connection.execute(
        `
        SELECT resource_id
        FROM resources
        WHERE resource_id = :id
        `,
        {
          id:
            resourceId,
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
        error:
          "Resource not found",
      });
    }


    // -------------------------------------------------
    // CHECK SUBJECT EXISTS
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
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      subjectResult.rows.length === 0
    ) {
      return res.status(404).json({
        error:
          "Subject not found",
      });
    }


    // -------------------------------------------------
    // UPDATE RESOURCE
    // -------------------------------------------------

    await connection.execute(
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
      WHERE resource_id = :id
      `,
      {
        subjectCode:
          cleanSubjectCode,

        title:
          title.trim(),

        description:
          description?.trim() ||
          null,

        resourceType:
          cleanResourceType,

        resourceUrl:
          resourceUrl.trim(),

        semester:
          cleanSemester,

        uploadedBy:
          uploadedBy?.trim() ||
          "Academic Office",

        id:
          resourceId,
      }
    );


    await connection.commit();


    return res.json({
      message:
        "Resource updated successfully",
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
      "Update resource error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to update resource",

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
// DELETE RESOURCE
// DELETE /api/admin/resources/:id
// =====================================================

router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const resourceId =
      Number(req.params.id);


    if (
      !Number.isInteger(
        resourceId
      ) ||
      resourceId <= 0
    ) {
      return res.status(400).json({
        error:
          "Invalid resource ID",
      });
    }


    connection = await getConnection();


    const result =
      await connection.execute(
        `
        DELETE FROM resources
        WHERE resource_id = :id
        `,
        {
          id:
            resourceId,
        }
      );


    if (
      result.rowsAffected === 0
    ) {

      await connection.rollback();


      return res.status(404).json({
        error:
          "Resource not found",
      });
    }


    await connection.commit();


    return res.json({
      message:
        "Resource deleted successfully",
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
      "Delete resource error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to delete resource",

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