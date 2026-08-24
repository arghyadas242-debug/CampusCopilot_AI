const express = require("express");
const getConnection = require("../db");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Get attendance for a student
router.get("/:rollNumber", async (req, res) => {
  const { rollNumber } = req.params;
  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT subject_code, subject_name, attended_classes, total_classes, faculty_name
       FROM ATTENDANCE
       WHERE student_roll = :roll`,
      [rollNumber],
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    let totalAttended = 0;
    let totalClasses = 0;

    const subjects = result.rows.map((row) => {
      const att = Number(row.ATTENDED_CLASSES) || 0;
      const tot = Number(row.TOTAL_CLASSES) || 0;
      totalAttended += att;
      totalClasses += tot;
      const percentage = tot > 0 ? Math.round((att / tot) * 100) : 100;
      return {
        code: row.SUBJECT_CODE,
        name: row.SUBJECT_NAME,
        attended: att,
        total: tot,
        faculty: row.FACULTY_NAME,
        percentage,
      };
    });

    const overallPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 85;

    res.json({
      studentRoll: rollNumber,
      overallPercentage,
      totalAttended,
      totalClasses,
      subjects,
    });
  } catch (err) {
    console.error("Fetch Attendance Error:", err);
    res.status(500).json({ error: "Failed to fetch attendance. " + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

// Admin: Batch Update Attendance
router.post("/update", authenticateToken, requireAdmin, async (req, res) => {
  const { records } = req.body; // Array of { studentRoll, subjectCode, status: 'present'|'absent' }

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Records array is required." });
  }

  let connection;
  try {
    connection = await getConnection();

    for (const rec of records) {
      if (rec.status === "present") {
        await connection.execute(
          `UPDATE ATTENDANCE
           SET attended_classes = attended_classes + 1, total_classes = total_classes + 1
           WHERE student_roll = :roll AND subject_code = :code`,
          [rec.studentRoll, rec.subjectCode],
          { autoCommit: false }
        );
      } else {
        await connection.execute(
          `UPDATE ATTENDANCE
           SET total_classes = total_classes + 1
           WHERE student_roll = :roll AND subject_code = :code`,
          [rec.studentRoll, rec.subjectCode],
          { autoCommit: false }
        );
      }
    }

    await connection.commit();
    res.json({ message: "Attendance roster updated successfully!" });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Update Attendance Error:", err);
    res.status(500).json({ error: "Failed to update attendance. " + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

module.exports = router;
