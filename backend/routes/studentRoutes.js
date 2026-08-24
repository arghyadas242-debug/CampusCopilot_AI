const express = require("express");
const getConnection = require("../db");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// List all students
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT u.id, u.name, u.email, s.roll_number, s.department, s.semester, s.section, s.phone, s.status
       FROM STUDENTS s
       JOIN USERS u ON s.user_id = u.id
       ORDER BY s.roll_number ASC`,
      [],
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    const students = result.rows.map((row) => ({
      id: row.ID,
      name: row.NAME,
      email: row.EMAIL,
      rollNumber: row.ROLL_NUMBER,
      department: row.DEPARTMENT,
      semester: row.SEMESTER,
      section: row.SECTION,
      phone: row.PHONE,
      status: row.STATUS,
    }));

    res.json({ students });
  } catch (err) {
    console.error("Fetch Students Error:", err);
    res.status(500).json({ error: "Failed to fetch student directory. " + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

// Update student record
router.put("/:rollNumber", authenticateToken, requireAdmin, async (req, res) => {
  const { rollNumber } = req.params;
  const { fullName, email, department, semester, section, phone, status } = req.body;

  let connection;
  try {
    connection = await getConnection();

    // Update students table
    await connection.execute(
      `UPDATE STUDENTS
       SET department = :dept, semester = :sem, section = :sec, phone = :phone, status = :status
       WHERE roll_number = :roll`,
      {
        dept: department,
        sem: semester,
        sec: section,
        phone: phone || "",
        status: status || "Active",
        roll: rollNumber,
      },
      { autoCommit: false }
    );

    // Update users table name and email
    if (fullName || email) {
      await connection.execute(
        `UPDATE USERS
         SET name = NVL(:name, name), email = NVL(:email, email)
         WHERE id = (SELECT user_id FROM STUDENTS WHERE roll_number = :roll)`,
        {
          name: fullName || null,
          email: email || null,
          roll: rollNumber,
        },
        { autoCommit: false }
      );
    }

    await connection.commit();
    res.json({ message: "Student record updated successfully!" });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Update Student Error:", err);
    res.status(500).json({ error: "Failed to update student record. " + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
});

module.exports = router;
