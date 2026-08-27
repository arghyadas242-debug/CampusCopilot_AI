const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();


const VALID_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];


// =====================================================
// GET ALL TIMETABLE RECORDS
// GET /api/admin/timetable
// =====================================================

router.get("/", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        t.id,
        t.student_roll,
        s.name AS student_name,
        s.section,
        t.subject_code,
        sub.subject_name,
        sub.faculty_name,
        t.day_of_week,
        t.start_time,
        t.end_time,
        t.room
      FROM timetable t

      LEFT JOIN students s
        ON t.student_roll = s.student_roll

      LEFT JOIN subjects sub
        ON t.subject_code = sub.subject_code

      ORDER BY
        CASE t.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
          ELSE 8
        END,
        t.start_time,
        t.id
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
      "Admin timetable load error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to load timetable",

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
// ADD TIMETABLE RECORD
// POST /api/admin/timetable
// =====================================================

router.post("/", async (req, res) => {
  let connection;

  try {
    const {
      studentRoll,
      subjectCode,
      dayOfWeek,
      startTime,
      endTime,
      room,
    } = req.body;


    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    if (
      !studentRoll?.trim() ||
      !subjectCode?.trim() ||
      !dayOfWeek?.trim() ||
      !startTime?.trim() ||
      !endTime?.trim()
    ) {
      return res.status(400).json({
        error:
          "Student, subject, day, start time and end time are required",
      });
    }


    const cleanStudentRoll =
      studentRoll.trim();

    const cleanSubjectCode =
      subjectCode
        .trim()
        .toUpperCase();

    const cleanDay =
      dayOfWeek.trim();

    const cleanStartTime =
      startTime.trim();

    const cleanEndTime =
      endTime.trim();

    const cleanRoom =
      room?.trim() || null;


    // -------------------------------------------------
    // VALIDATE DAY
    // -------------------------------------------------

    if (
      !VALID_DAYS.includes(
        cleanDay
      )
    ) {
      return res.status(400).json({
        error:
          "Invalid day of week",
      });
    }


    // -------------------------------------------------
    // VALIDATE TIME
    // -------------------------------------------------

    if (
      cleanEndTime <=
      cleanStartTime
    ) {
      return res.status(400).json({
        error:
          "End time must be later than start time",
      });
    }


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
        error:
          "Student not found",
      });
    }


    // -------------------------------------------------
    // CHECK SUBJECT EXISTS
    // ALSO GET SUBJECT NAME
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
    // CHECK FOR TIME CONFLICT
    // -------------------------------------------------

    const conflictResult =
      await connection.execute(
        `
        SELECT id
        FROM timetable
        WHERE student_roll = :studentRoll
          AND day_of_week = :dayOfWeek
          AND :startTime < end_time
          AND :endTime > start_time
        `,
        {
          studentRoll:
            cleanStudentRoll,

          dayOfWeek:
            cleanDay,

          startTime:
            cleanStartTime,

          endTime:
            cleanEndTime,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      conflictResult.rows.length > 0
    ) {
      return res.status(409).json({
        error:
          "This student already has a class during the selected time",
      });
    }


    // -------------------------------------------------
    // INSERT TIMETABLE ENTRY
    // GET GENERATED ID
    // -------------------------------------------------

    const timetableResult =
      await connection.execute(
        `
        INSERT INTO timetable (
          student_roll,
          subject_code,
          day_of_week,
          start_time,
          end_time,
          room
        )
        VALUES (
          :studentRoll,
          :subjectCode,
          :dayOfWeek,
          :startTime,
          :endTime,
          :room
        )
        RETURNING id
        INTO :timetableId
        `,
        {
          studentRoll:
            cleanStudentRoll,

          subjectCode:
            cleanSubjectCode,

          dayOfWeek:
            cleanDay,

          startTime:
            cleanStartTime,

          endTime:
            cleanEndTime,

          room:
            cleanRoom,

          timetableId: {
            dir:
              oracledb.BIND_OUT,
            type:
              oracledb.NUMBER,
          },
        }
      );


    const timetableId =
      timetableResult.outBinds
        .timetableId[0];


    // -------------------------------------------------
    // BUILD NOTIFICATION MESSAGE
    // -------------------------------------------------

    let notificationMessage =
      `${subjectName} has been scheduled on ${cleanDay} from ${cleanStartTime} to ${cleanEndTime}`;


    if (cleanRoom) {
      notificationMessage +=
        ` in ${cleanRoom}`;
    }


    notificationMessage += ".";


    // -------------------------------------------------
    // CREATE TIMETABLE NOTIFICATION
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
        'TIMETABLE',
        :notificationTitle,
        :messageText,
        'TIMETABLE',
        :relatedId,
        '/timetable',
        0
      )
      `,
      {
        studentRoll:
          cleanStudentRoll,

        notificationTitle:
          "New Timetable Entry",

        messageText:
          notificationMessage,

        relatedId:
          timetableId,
      }
    );


    // -------------------------------------------------
    // COMMIT TIMETABLE + NOTIFICATION
    // -------------------------------------------------

    await connection.commit();


    return res.status(201).json({
      message:
        "Timetable entry created successfully",

      timetableId,

      notificationCreated:
        true,
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
      "Create timetable error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to create timetable entry",

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
// UPDATE TIMETABLE RECORD
// PUT /api/admin/timetable/:id
// =====================================================

router.put("/:id", async (req, res) => {
  let connection;

  try {
    const timetableId =
      Number(req.params.id);


    if (
      !Number.isInteger(
        timetableId
      ) ||
      timetableId <= 0
    ) {
      return res.status(400).json({
        error:
          "Invalid timetable ID",
      });
    }


    const {
      studentRoll,
      subjectCode,
      dayOfWeek,
      startTime,
      endTime,
      room,
    } = req.body;


    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    if (
      !studentRoll?.trim() ||
      !subjectCode?.trim() ||
      !dayOfWeek?.trim() ||
      !startTime?.trim() ||
      !endTime?.trim()
    ) {
      return res.status(400).json({
        error:
          "Student, subject, day, start time and end time are required",
      });
    }


    const cleanStudentRoll =
      studentRoll.trim();

    const cleanSubjectCode =
      subjectCode
        .trim()
        .toUpperCase();

    const cleanDay =
      dayOfWeek.trim();

    const cleanStartTime =
      startTime.trim();

    const cleanEndTime =
      endTime.trim();

    const cleanRoom =
      room?.trim() || null;


    // -------------------------------------------------
    // VALIDATE DAY
    // -------------------------------------------------

    if (
      !VALID_DAYS.includes(
        cleanDay
      )
    ) {
      return res.status(400).json({
        error:
          "Invalid day of week",
      });
    }


    // -------------------------------------------------
    // VALIDATE TIME
    // -------------------------------------------------

    if (
      cleanEndTime <=
      cleanStartTime
    ) {
      return res.status(400).json({
        error:
          "End time must be later than start time",
      });
    }


    connection = await getConnection();


    // -------------------------------------------------
    // CHECK ENTRY EXISTS
    // -------------------------------------------------

    const existingResult =
      await connection.execute(
        `
        SELECT id
        FROM timetable
        WHERE id = :id
        `,
        {
          id:
            timetableId,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      existingResult.rows.length === 0
    ) {
      return res.status(404).json({
        error:
          "Timetable entry not found",
      });
    }


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
        error:
          "Student not found",
      });
    }


    // -------------------------------------------------
    // CHECK SUBJECT EXISTS
    // ALSO GET SUBJECT NAME
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
    // CHECK TIME CONFLICT
    //
    // Ignore current timetable row
    // -------------------------------------------------

    const conflictResult =
      await connection.execute(
        `
        SELECT id
        FROM timetable
        WHERE student_roll = :studentRoll
          AND day_of_week = :dayOfWeek
          AND id <> :id
          AND :startTime < end_time
          AND :endTime > start_time
        `,
        {
          studentRoll:
            cleanStudentRoll,

          dayOfWeek:
            cleanDay,

          id:
            timetableId,

          startTime:
            cleanStartTime,

          endTime:
            cleanEndTime,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );


    if (
      conflictResult.rows.length > 0
    ) {
      return res.status(409).json({
        error:
          "This student already has a class during the selected time",
      });
    }


    // -------------------------------------------------
    // UPDATE TIMETABLE ENTRY
    // -------------------------------------------------

    await connection.execute(
      `
      UPDATE timetable
      SET
        student_roll = :studentRoll,
        subject_code = :subjectCode,
        day_of_week = :dayOfWeek,
        start_time = :startTime,
        end_time = :endTime,
        room = :room
      WHERE id = :id
      `,
      {
        studentRoll:
          cleanStudentRoll,

        subjectCode:
          cleanSubjectCode,

        dayOfWeek:
          cleanDay,

        startTime:
          cleanStartTime,

        endTime:
          cleanEndTime,

        room:
          cleanRoom,

        id:
          timetableId,
      }
    );


    // -------------------------------------------------
    // BUILD UPDATE NOTIFICATION
    // -------------------------------------------------

    let notificationMessage =
      `${subjectName} timetable has been updated to ${cleanDay} from ${cleanStartTime} to ${cleanEndTime}`;


    if (cleanRoom) {
      notificationMessage +=
        ` in ${cleanRoom}`;
    }


    notificationMessage += ".";


    // -------------------------------------------------
    // CREATE UPDATE NOTIFICATION
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
        'TIMETABLE',
        :notificationTitle,
        :messageText,
        'TIMETABLE',
        :relatedId,
        '/timetable',
        0
      )
      `,
      {
        studentRoll:
          cleanStudentRoll,

        notificationTitle:
          "Timetable Updated",

        messageText:
          notificationMessage,

        relatedId:
          timetableId,
      }
    );


    // -------------------------------------------------
    // COMMIT UPDATE + NOTIFICATION
    // -------------------------------------------------

    await connection.commit();


    return res.json({
      message:
        "Timetable entry updated successfully",

      notificationCreated:
        true,
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
      "Update timetable error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to update timetable entry",

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
// DELETE TIMETABLE RECORD
// DELETE /api/admin/timetable/:id
// =====================================================

router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const timetableId =
      Number(req.params.id);


    if (
      !Number.isInteger(
        timetableId
      ) ||
      timetableId <= 0
    ) {
      return res.status(400).json({
        error:
          "Invalid timetable ID",
      });
    }


    connection = await getConnection();


    const result =
      await connection.execute(
        `
        DELETE FROM timetable
        WHERE id = :id
        `,
        {
          id:
            timetableId,
        }
      );


    if (
      result.rowsAffected === 0
    ) {

      await connection.rollback();


      return res.status(404).json({
        error:
          "Timetable entry not found",
      });
    }


    await connection.commit();


    return res.json({
      message:
        "Timetable entry deleted successfully",
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
      "Delete timetable error:",
      error
    );


    return res.status(500).json({
      error:
        "Unable to delete timetable entry",

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