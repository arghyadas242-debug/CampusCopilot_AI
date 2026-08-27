const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

// =====================================================
// GET STUDENT RESOURCES
// GET /api/resources
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
        s.subject_name,
        r.created_at DESC,
        r.resource_id DESC
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(
      "Student resources load error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load resources",
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

module.exports = router;