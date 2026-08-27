const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();


// =====================================================
// GET ALL EXAMS
// GET /api/admin/exams
// =====================================================

router.get("/", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        e.id,
        e.student_roll,
        s.name AS student_name,
        e.subject_code,
        sub.subject_name,
        e.exam_date,
        e.start_time,
        e.end_time,
        e.room,
        e.exam_type
      FROM exams e

      LEFT JOIN students s
        ON e.student_roll = s.student_roll

      LEFT JOIN subjects sub
        ON e.subject_code = sub.subject_code

      ORDER BY
        e.exam_date ASC,
        e.start_time ASC,
        e.id ASC
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows);

  } catch (error) {

    console.error(
      "Admin exams load error:",
      error
    );

    return res.status(500).json({
      error: "Unable to load exams",
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


// =====================================================
// ADD EXAM
// POST /api/admin/exams
// =====================================================

router.post("/", async (req, res) => {
  let connection;

  try {
    const {
      studentRoll,
      subjectCode,
      examDate,
      startTime,
      endTime,
      room,
      examType,
    } = req.body;


    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (
      !studentRoll?.trim() ||
      !subjectCode?.trim() ||
      !examDate ||
      !startTime?.trim() ||
      !endTime?.trim() ||
      !examType?.trim()
    ) {
      return res.status(400).json({
        error:
          "Student, subject, exam date, start time, end time and exam type are required",
      });
    }


    const cleanStudentRoll =
      studentRoll.trim();

    const cleanSubjectCode =
      subjectCode.trim().toUpperCase();

    const cleanStartTime =
      startTime.trim();

    const cleanEndTime =
      endTime.trim();

    const cleanRoom =
      room?.trim() || null;

    const cleanExamType =
      examType.trim();


    // -------------------------------------------------
    // DATABASE CONNECTION
    // -------------------------------------------------

    connection = await getConnection();


    // -------------------------------------------------
    // CHECK STUDENT EXISTS
    // -------------------------------------------------

    const studentResult =
      await connection.execute(
        `
        SELECT student_roll
        FROM students
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          studentRoll:
            cleanStudentRoll,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      studentResult.rows.length === 0
    ) {
      return res.status(404).json({
        error: "Student not found",
      });
    }


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
        error: "Subject not found",
      });
    }


    const subjectName =
      subjectResult.rows[0]
        .SUBJECT_NAME ||
      cleanSubjectCode;


    // -------------------------------------------------
    // INSERT EXAM
    // RETURN GENERATED EXAM ID
    // -------------------------------------------------

    const examResult =
      await connection.execute(
        `
        INSERT INTO exams (
          student_roll,
          subject_code,
          exam_date,
          start_time,
          end_time,
          room,
          exam_type
        )
        VALUES (
          :studentRoll,
          :subjectCode,
          TO_DATE(:examDate, 'YYYY-MM-DD'),
          :startTime,
          :endTime,
          :room,
          :examType
        )
        RETURNING id
        INTO :examId
        `,
        {
          studentRoll:
            cleanStudentRoll,

          subjectCode:
            cleanSubjectCode,

          examDate,

          startTime:
            cleanStartTime,

          endTime:
            cleanEndTime,

          room:
            cleanRoom,

          examType:
            cleanExamType,

          examId: {
            dir: oracledb.BIND_OUT,
            type: oracledb.NUMBER,
          },
        }
      );


    // -------------------------------------------------
    // GET GENERATED EXAM ID
    // -------------------------------------------------

    const examId =
      examResult.outBinds.examId[0];


    // -------------------------------------------------
    // BUILD NOTIFICATION MESSAGE
    // -------------------------------------------------

    let notificationMessage =
      `${cleanExamType} for ${subjectName} is scheduled on ${examDate} from ${cleanStartTime} to ${cleanEndTime}`;

    if (cleanRoom) {
      notificationMessage +=
        ` in ${cleanRoom}`;
    }

    notificationMessage += ".";


    // -------------------------------------------------
    // CREATE EXAM NOTIFICATION
    // -------------------------------------------------

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
      VALUES (
        :studentRoll,
        'EXAM',
        :notificationTitle,
        :messageText,
        'EXAM',
        :relatedId,
        '/exams',
        0
      )
      `,
      {
        studentRoll:
          cleanStudentRoll,

        notificationTitle:
          "New Exam Scheduled",

        messageText:
          notificationMessage,

        relatedId:
          examId,
      }
    );


    // -------------------------------------------------
    // COMMIT EXAM + NOTIFICATION TOGETHER
    // -------------------------------------------------

    await connection.commit();


    return res.status(201).json({
      message:
        "Exam created successfully",

      examId,

      notificationCreated: true,
    });

  } catch (error) {

    // -------------------------------------------------
    // ROLLBACK BOTH IF ANYTHING FAILS
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
      "Create exam error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to create exam",

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
// UPDATE EXAM
// PUT /api/admin/exams/:id
// =====================================================

router.put("/:id", async (req, res) => {
  let connection;

  try {
    const examId =
      Number(req.params.id);


    if (
      !Number.isInteger(examId) ||
      examId <= 0
    ) {
      return res.status(400).json({
        error: "Invalid exam ID",
      });
    }


    const {
      studentRoll,
      subjectCode,
      examDate,
      startTime,
      endTime,
      room,
      examType,
    } = req.body;


    if (
      !studentRoll?.trim() ||
      !subjectCode?.trim() ||
      !examDate ||
      !startTime?.trim() ||
      !endTime?.trim() ||
      !examType?.trim()
    ) {
      return res.status(400).json({
        error:
          "Student, subject, exam date, start time, end time and exam type are required",
      });
    }


    connection = await getConnection();


    // -------------------------------------------------
    // CHECK EXAM EXISTS
    // -------------------------------------------------

    const existing =
      await connection.execute(
        `
        SELECT id
        FROM exams
        WHERE id = :id
        `,
        {
          id: examId,
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
        error: "Exam not found",
      });
    }


    // -------------------------------------------------
    // CHECK STUDENT
    // -------------------------------------------------

    const studentResult =
      await connection.execute(
        `
        SELECT student_roll
        FROM students
        WHERE LOWER(student_roll) =
              LOWER(:studentRoll)
        `,
        {
          studentRoll:
            studentRoll.trim(),
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      studentResult.rows.length === 0
    ) {
      return res.status(404).json({
        error: "Student not found",
      });
    }


    // -------------------------------------------------
    // CHECK SUBJECT
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
            subjectCode.trim(),
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
        error: "Subject not found",
      });
    }


    // -------------------------------------------------
    // UPDATE EXAM
    // -------------------------------------------------

    await connection.execute(
      `
      UPDATE exams
      SET
        student_roll = :studentRoll,
        subject_code = :subjectCode,
        exam_date =
          TO_DATE(:examDate, 'YYYY-MM-DD'),
        start_time = :startTime,
        end_time = :endTime,
        room = :room,
        exam_type = :examType
      WHERE id = :id
      `,
      {
        studentRoll:
          studentRoll.trim(),

        subjectCode:
          subjectCode
            .trim()
            .toUpperCase(),

        examDate,

        startTime:
          startTime.trim(),

        endTime:
          endTime.trim(),

        room:
          room?.trim() || null,

        examType:
          examType.trim(),

        id:
          examId,
      }
    );


    await connection.commit();


    return res.json({
      message:
        "Exam updated successfully",
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
      "Update exam error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to update exam",

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
// DELETE EXAM
// DELETE /api/admin/exams/:id
// =====================================================

router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const examId =
      Number(req.params.id);


    if (
      !Number.isInteger(examId) ||
      examId <= 0
    ) {
      return res.status(400).json({
        error: "Invalid exam ID",
      });
    }


    connection = await getConnection();


    const result =
      await connection.execute(
        `
        DELETE FROM exams
        WHERE id = :id
        `,
        {
          id: examId,
        }
      );


    if (
      result.rowsAffected === 0
    ) {
      await connection.rollback();

      return res.status(404).json({
        error: "Exam not found",
      });
    }


    await connection.commit();


    return res.json({
      message:
        "Exam deleted successfully",
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
      "Delete exam error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to delete exam",

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