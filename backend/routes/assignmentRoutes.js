const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const {
  authenticateToken,
  requireStudent,
} = require("../middleware/authMiddleware");

const router = express.Router();

const normalizeRoll = (value) =>
  String(value ?? "").trim().toUpperCase();

function ownershipError() {
  const error = new Error(
    "Unable to establish student ownership."
  );

  error.ownershipDenied = true;
  return error;
}

// Resolve identity from authenticated JWT claims and database records.
// URL parameters and request bodies are never used as student identity.
async function resolveStudentRoll(connection, user) {
  const email =
    typeof user?.email === "string"
      ? user.email.trim().toLowerCase()
      : "";

  const signedRolls = [
    user?.rollNumber,
    user?.studentRoll,
  ]
    .filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
    .map((value) => {
      if (
        typeof value !== "string" &&
        typeof value !== "number"
      ) {
        throw ownershipError();
      }

      const roll = normalizeRoll(value);

      if (!roll || roll.length > 100) {
        throw ownershipError();
      }

      return roll;
    });

  if (new Set(signedRolls).size > 1) {
    throw ownershipError();
  }

  const signedRoll = signedRolls[0] || "";

  async function findStudent(sql, binds) {
    const result = await connection.execute(
      sql,
      binds,
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    if (result.rows.length > 1) {
      throw ownershipError();
    }

    return result.rows[0] || null;
  }

  function checkedRoll(student) {
    const roll = normalizeRoll(student?.STUDENT_ROLL);

    if (!roll || (signedRoll && roll !== signedRoll)) {
      throw ownershipError();
    }

    if (
      email &&
      String(student.EMAIL || "").trim().toLowerCase() !==
        email
    ) {
      throw ownershipError();
    }

    return roll;
  }

  // 1. Resolve through the authenticated email.
  if (email) {
    const student = await findStudent(
      `
        SELECT STUDENT_ROLL, EMAIL
        FROM STUDENTS
        WHERE LOWER(TRIM(EMAIL)) = :email
        FETCH FIRST 2 ROWS ONLY
      `,
      { email }
    );

    if (student) {
      return checkedRoll(student);
    }
  }

  // 2. Fall back to the signed JWT roll.
  if (signedRoll) {
    const student = await findStudent(
      `
        SELECT STUDENT_ROLL, EMAIL
        FROM STUDENTS
        WHERE UPPER(TRIM(STUDENT_ROLL)) = :studentRoll
        FETCH FIRST 2 ROWS ONLY
      `,
      {
        studentRoll: signedRoll,
      }
    );

    if (student) {
      return checkedRoll(student);
    }
  }

  // 3. Fall back to USERS -> STUDENTS through email.
  const userId = Number(user?.id);

  if (Number.isSafeInteger(userId) && userId > 0) {
    const student = await findStudent(
      `
        SELECT s.STUDENT_ROLL, s.EMAIL
        FROM USERS u
        JOIN STUDENTS s
          ON LOWER(TRIM(s.EMAIL)) =
             LOWER(TRIM(u.EMAIL))
        WHERE u.ID = :userId
        FETCH FIRST 2 ROWS ONLY
      `,
      { userId }
    );

    if (student) {
      return checkedRoll(student);
    }
  }

  throw ownershipError();
}

async function closeConnection(connection) {
  if (!connection) {
    return;
  }

  try {
    await connection.close();
  } catch (error) {
    console.error(
      "Assignment connection close error:",
      error
    );
  }
}

// =====================================================
// UPDATE OWN ASSIGNMENT STATUS
// PATCH /api/assignments/:id/status
// =====================================================

router.patch(
  "/:id/status",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    let connection;

    try {
      const assignmentId = Number(req.params.id);

      if (
        !Number.isSafeInteger(assignmentId) ||
        assignmentId <= 0
      ) {
        return res.status(400).json({
          error: "Invalid assignment ID",
        });
      }

      const status = String(req.body?.status || "")
        .trim()
        .toLowerCase();

      if (
        !["pending", "completed", "submitted"].includes(
          status
        )
      ) {
        return res.status(400).json({
          error: "Invalid assignment status",
        });
      }

      connection = await getConnection();

      const studentRoll = await resolveStudentRoll(
        connection,
        req.user
      );

      // Ownership is enforced in the UPDATE itself.
      const result = await connection.execute(
        `
          UPDATE assignments
          SET status = :status
          WHERE id = :assignmentId
            AND UPPER(student_roll) =
                UPPER(:studentRoll)
        `,
        {
          status,
          assignmentId,
          studentRoll,
        },
        {
          autoCommit: false,
        }
      );

      if (result.rowsAffected !== 1) {
        await connection.rollback();

        // Missing and foreign IDs receive the same response.
        return res.status(403).json({
          error: "You cannot update this assignment.",
          code: "ASSIGNMENT_ACCESS_DENIED",
        });
      }

      await connection.commit();

      return res.json({
        message: "Assignment status updated successfully",
        assignmentId,
        status,
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error(
            "Assignment rollback error:",
            rollbackError
          );
        }
      }

      if (error.ownershipDenied) {
        return res.status(403).json({
          error: "Unable to verify your student account.",
          code: "STUDENT_OWNERSHIP_REQUIRED",
        });
      }

      console.error(
        "Update assignment status error:",
        error
      );

      return res.status(500).json({
        error: "Unable to update assignment status",
      });
    } finally {
      await closeConnection(connection);
    }
  }
);

// =====================================================
// GET ASSIGNMENTS FOR ONE STUDENT
// GET /api/assignments/:studentRoll
//
// Students: own assignments only.
// Admins: any student's assignments.
// Keep this dynamic GET route last.
// =====================================================

router.get(
  "/:studentRoll",
  authenticateToken,
  async (req, res) => {
    let connection;

    try {
      const studentRoll = String(
        req.params.studentRoll || ""
      ).trim();

      if (!studentRoll) {
        return res.status(400).json({
          error: "Student roll number is required",
        });
      }

      const role = String(req.user?.role || "")
        .trim()
        .toLowerCase();

      if (role !== "student" && role !== "admin") {
        return res.status(403).json({
          error: "Access denied.",
        });
      }

      connection = await getConnection();

      if (role !== "admin") {
        const authenticatedRoll = await resolveStudentRoll(
          connection,
          req.user
        );

        if (
          authenticatedRoll !== normalizeRoll(studentRoll)
        ) {
          return res.status(403).json({
            error: "You can only access your own assignments.",
            code: "ASSIGNMENT_ACCESS_DENIED",
          });
        }
      }

      const result = await connection.execute(
        `
          SELECT
            a.id,
            a.student_roll,
            a.subject_code,
            s.subject_name,
            a.title,
            a.description,
            a.due_date,
            a.priority,
            a.status

          FROM assignments a

          LEFT JOIN subjects s
            ON UPPER(a.subject_code) =
               UPPER(s.subject_code)

          WHERE UPPER(a.student_roll) =
                UPPER(:studentRoll)

          ORDER BY
            CASE
              WHEN LOWER(a.status) = 'pending'
              THEN 0
              ELSE 1
            END,
            a.due_date,
            a.id
        `,
        {
          studentRoll,
        },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      return res.json(result.rows);
    } catch (error) {
      if (error.ownershipDenied) {
        return res.status(403).json({
          error: "Unable to verify your student account.",
          code: "STUDENT_OWNERSHIP_REQUIRED",
        });
      }

      console.error(
        "Student assignments error:",
        error
      );

      return res.status(500).json({
        error: "Unable to load assignments",
      });
    } finally {
      await closeConnection(connection);
    }
  }
);

module.exports = router;