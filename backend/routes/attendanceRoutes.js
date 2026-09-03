const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();

const OUT_FORMAT = {
  outFormat: oracledb.OUT_FORMAT_OBJECT,
};

// =====================================================
// HELPERS
// =====================================================

function cleanText(value) {
  return String(value || "").trim();
}

async function closeConnection(
  connection,
  label = "Connection"
) {
  if (!connection) {
    return;
  }

  try {
    await connection.close();
  } catch (error) {
    console.error(
      `${label} close error:`,
      error
    );
  }
}

// =====================================================
// LOAD SESSION-LEVEL HISTORY
// =====================================================

async function getSessionHistoryRows(
  connection,
  studentRoll
) {
  const result =
    await connection.execute(
      `
      SELECT
        ar.record_id,
        ar.student_roll,
        ar.status,

        s.session_id,
        s.subject_code,
        s.section,
        s.session_type,
        s.session_date,

        sub.subject_name,

        ar.created_at

      FROM attendance_records ar

      JOIN attendance_sessions s
        ON ar.session_id =
           s.session_id

      LEFT JOIN subjects sub
        ON UPPER(s.subject_code) =
           UPPER(sub.subject_code)

      WHERE UPPER(ar.student_roll) =
            UPPER(:studentRoll)

      ORDER BY
        s.session_date DESC,
        s.session_id DESC
      `,
      {
        studentRoll,
      },
      OUT_FORMAT
    );

  return result.rows;
}

// =====================================================
// UPDATE OVERALL TREND SNAPSHOT
// =====================================================

async function updateOverallTrendSnapshot(
  connection,
  studentRoll
) {
  const overallResult =
    await connection.execute(
      `
      SELECT
        NVL(
          SUM(attended_classes),
          0
        ) AS attended_classes,

        NVL(
          SUM(total_classes),
          0
        ) AS total_classes

      FROM attendance

      WHERE UPPER(student_roll) =
            UPPER(:studentRoll)
      `,
      {
        studentRoll,
      },
      OUT_FORMAT
    );

  const attendedClasses =
    Number(
      overallResult.rows[0]
        ?.ATTENDED_CLASSES || 0
    );

  const totalClasses =
    Number(
      overallResult.rows[0]
        ?.TOTAL_CLASSES || 0
    );

  const attendancePercentage =
    totalClasses > 0
      ? Number(
          (
            (
              attendedClasses /
              totalClasses
            ) *
            100
          ).toFixed(2)
        )
      : 0;

  await connection.execute(
    `
    MERGE INTO attendance_trend_history h

    USING (
      SELECT
        :studentRoll
          AS student_roll,

        TRUNC(SYSDATE)
          AS snapshot_date,

        :attendedClasses
          AS attended_classes,

        :totalClasses
          AS total_classes,

        :attendancePercentage
          AS attendance_percentage

      FROM dual
    ) src

    ON (
      UPPER(h.student_roll) =
        UPPER(src.student_roll)

      AND

      h.snapshot_date =
        src.snapshot_date
    )

    WHEN MATCHED THEN
      UPDATE SET

        h.attended_classes =
          src.attended_classes,

        h.total_classes =
          src.total_classes,

        h.attendance_percentage =
          src.attendance_percentage

    WHEN NOT MATCHED THEN

      INSERT (
        student_roll,
        snapshot_date,
        attended_classes,
        total_classes,
        attendance_percentage
      )

      VALUES (
        src.student_roll,
        src.snapshot_date,
        src.attended_classes,
        src.total_classes,
        src.attendance_percentage
      )
    `,
    {
      studentRoll,

      attendedClasses,

      totalClasses,

      attendancePercentage,
    }
  );

  return {
    attendedClasses,
    totalClasses,
    attendancePercentage,
  };
}

// =====================================================
// CREATE LOW ATTENDANCE NOTIFICATION
// =====================================================

async function createLowAttendanceNotificationIfNeeded({
  connection,
  studentRoll,
  subjectName,
  attendanceId,
  attendedClasses,
  totalClasses,
}) {
  const percentage =
    totalClasses > 0
      ? (
          attendedClasses /
          totalClasses
        ) * 100
      : 0;

  if (percentage >= 75) {
    return false;
  }

  const existingResult =
    await connection.execute(
      `
      SELECT
        notification_id

      FROM notifications

      WHERE student_roll =
            :studentRoll

        AND notification_type =
            'ATTENDANCE'

        AND related_type =
            'ATTENDANCE'

        AND related_id =
            :attendanceId

        AND is_read = 0
      `,
      {
        studentRoll,
        attendanceId,
      },
      OUT_FORMAT
    );

  if (
    existingResult.rows.length > 0
  ) {
    return false;
  }

  const messageText =
    `Your ${subjectName} attendance is ` +
    `${percentage.toFixed(1)}% ` +
    `(${attendedClasses}/${totalClasses}). ` +
    `This is below the required 75% attendance.`;

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
      'ATTENDANCE',
      :title,
      :messageText,
      'ATTENDANCE',
      :relatedId,
      '/attendance',
      0
    )
    `,
    {
      studentRoll,

      title:
        "Low Attendance Alert",

      messageText,

      relatedId:
        attendanceId,
    }
  );

  return true;
}

// =====================================================
// GET ALL ATTENDANCE RECORDS
// GET /api/attendance
// =====================================================

router.get(
  "/",
  async (req, res) => {
    let connection;

    try {
      connection =
        await getConnection();

      const result =
        await connection.execute(
          `
          SELECT
            s.name,
            s.student_roll,

            sub.subject_code,
            sub.subject_name,

            a.attended_classes,
            a.total_classes

          FROM attendance a

          JOIN students s
            ON a.student_roll =
               s.student_roll

          JOIN subjects sub
            ON a.subject_code =
               sub.subject_code

          ORDER BY
            s.student_roll,
            sub.subject_code
          `,
          [],
          OUT_FORMAT
        );

      return res.json(
        result.rows
      );
    } catch (error) {
      console.error(
        "Attendance route error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load attendance",

        details:
          error.message,
      });
    } finally {
      await closeConnection(
        connection,
        "Attendance"
      );
    }
  }
);

// =====================================================
// GET SUBJECTS
// GET /api/attendance/subjects
// =====================================================

router.get(
  "/subjects",
  async (req, res) => {
    let connection;

    try {
      connection =
        await getConnection();

      const result =
        await connection.execute(
          `
          SELECT
            subject_code,
            subject_name

          FROM subjects

          ORDER BY
            subject_code
          `,
          [],
          OUT_FORMAT
        );

      return res.json(
        result.rows
      );
    } catch (error) {
      console.error(
        "Load subjects error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load subjects",

        details:
          error.message,
      });
    } finally {
      await closeConnection(
        connection,
        "Subjects"
      );
    }
  }
);

// =====================================================
// GET AVAILABLE SECTIONS
// GET /api/attendance/sections
// =====================================================

router.get(
  "/sections",
  async (req, res) => {
    let connection;

    try {
      connection =
        await getConnection();

      const result =
        await connection.execute(
          `
          SELECT DISTINCT
            section

          FROM students

          WHERE section
            IS NOT NULL

          ORDER BY
            section
          `,
          [],
          OUT_FORMAT
        );

      return res.json(
        result.rows
      );
    } catch (error) {
      console.error(
        "Load sections error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load sections",

        details:
          error.message,
      });
    } finally {
      await closeConnection(
        connection,
        "Sections"
      );
    }
  }
);

// =====================================================
// GET STUDENTS OF A SECTION
// GET /api/attendance/roster?section=A
// =====================================================

router.get(
  "/roster",
  async (req, res) => {
    let connection;

    try {
      const section =
        cleanText(
          req.query.section
        );

      if (!section) {
        return res
          .status(400)
          .json({
            error:
              "Section is required",
          });
      }

      connection =
        await getConnection();

      const result =
        await connection.execute(
          `
          SELECT
            student_id,
            name,
            student_roll,
            department,
            semester,
            section

          FROM students

          WHERE UPPER(section) =
                UPPER(:section)

          ORDER BY
            student_roll
          `,
          {
            section,
          },
          OUT_FORMAT
        );

      return res.json(
        result.rows
      );
    } catch (error) {
      console.error(
        "Load roster error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load student roster",

        details:
          error.message,
      });
    } finally {
      await closeConnection(
        connection,
        "Roster"
      );
    }
  }
);

// =====================================================
// GET SESSION-TRACKED ATTENDANCE
//
// GET:
// /api/attendance/sessions/:studentRoll
//
// IMPORTANT:
//
// This route reads:
// ATTENDANCE_SESSIONS
// ATTENDANCE_RECORDS
//
// It contains only attendance recorded through the
// newer session tracking system.
//
// It must NOT replace the ATTENDANCE aggregate because
// older historical attendance may exist only there.
// =====================================================

router.get(
  "/sessions/:studentRoll",
  async (req, res) => {
    let connection;

    try {
      const studentRoll =
        cleanText(
          req.params.studentRoll
        );

      if (!studentRoll) {
        return res
          .status(400)
          .json({
            error:
              "Student roll is required",
          });
      }

      connection =
        await getConnection();

      // -----------------------------------------------
      // VERIFY STUDENT
      // -----------------------------------------------

      const studentResult =
        await connection.execute(
          `
          SELECT
            student_roll,
            name

          FROM students

          WHERE UPPER(student_roll) =
                UPPER(:studentRoll)
          `,
          {
            studentRoll,
          },
          OUT_FORMAT
        );

      if (
        studentResult.rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Student not found",
          });
      }

      // -----------------------------------------------
      // LOAD SESSION HISTORY
      // -----------------------------------------------

      const rows =
        await getSessionHistoryRows(
          connection,
          studentRoll
        );

      let trackedFrom =
        null;

      if (rows.length > 0) {
        const oldestRecord =
          rows[
            rows.length - 1
          ];

        trackedFrom =
          oldestRecord
            .SESSION_DATE ||
          null;
      }

      return res.json({
        studentRoll:
          studentResult
            .rows[0]
            .STUDENT_ROLL,

        studentName:
          studentResult
            .rows[0]
            .NAME,

        trackingScope:
          "SESSION_TRACKED_ONLY",

        trackedFrom,

        message:
          "Theory/Lab breakdown includes only attendance recorded through session-level tracking.",

        sessions:
          rows,
      });
    } catch (error) {
      console.error(
        "Session attendance error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to load session attendance",

          details:
            error.message,
        });
    } finally {
      await closeConnection(
        connection,
        "Session attendance"
      );
    }
  }
);

// =====================================================
// MARK ATTENDANCE
//
// POST:
// /api/attendance/mark
//
// NEW SESSION:
//
// 1. Create ATTENDANCE_SESSIONS
// 2. Create ATTENDANCE_RECORDS
// 3. Update ATTENDANCE aggregate
// 4. Update ATTENDANCE_TREND_HISTORY
// 5. Create low-attendance notifications
//
// EXISTING OLD SESSION WITHOUT RECORD HISTORY:
//
// 1. Reuse SESSION_ID
// 2. Create ATTENDANCE_RECORDS
// 3. DO NOT increment ATTENDANCE again
//
// EXISTING SESSION WITH RECORD HISTORY:
//
// Return 409 duplicate.
// =====================================================

router.post(
  "/mark",
  async (req, res) => {
    let connection;

    try {
      const {
        subjectCode,
        section,
        sessionType,
        records,
      } =
        req.body || {};

      // =================================================
      // VALIDATION
      // =================================================

      if (
        !cleanText(
          subjectCode
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Subject code is required",
          });
      }

      if (
        !cleanText(section)
      ) {
        return res
          .status(400)
          .json({
            error:
              "Section is required",
          });
      }

      if (
        !cleanText(
          sessionType
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Session type is required",
          });
      }

      if (
        !Array.isArray(
          records
        ) ||
        records.length === 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "Attendance records are required",
          });
      }

      const cleanSubjectCode =
        cleanText(
          subjectCode
        ).toUpperCase();

      const cleanSection =
        cleanText(
          section
        );

      const cleanSessionType =
        cleanText(
          sessionType
        );

      // =================================================
      // VALIDATE EACH STUDENT RECORD
      // =================================================

      const seenRolls =
        new Set();

      for (
        const record
        of records
      ) {
        const studentRoll =
          cleanText(
            record
              ?.studentRoll
          );

        const status =
          cleanText(
            record?.status
          ).toLowerCase();

        if (
          !studentRoll ||
          ![
            "present",
            "absent",
          ].includes(
            status
          )
        ) {
          return res
            .status(400)
            .json({
              error:
                "Every record must contain a valid studentRoll and status",
            });
        }

        const rollKey =
          studentRoll
            .toUpperCase();

        if (
          seenRolls.has(
            rollKey
          )
        ) {
          return res
            .status(400)
            .json({
              error:
                `Duplicate attendance record for ${studentRoll}`,
            });
        }

        seenRolls.add(
          rollKey
        );
      }

      connection =
        await getConnection();

      // =================================================
      // CHECK SUBJECT
      // =================================================

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
          OUT_FORMAT
        );

      if (
        subjectResult
          .rows.length === 0
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

      // =================================================
      // CREATE OR REUSE SESSION
      // =================================================

      let sessionId =
        null;

      let isHistoryBackfill =
        false;

      try {
        // -----------------------------------------------
        // CREATE NEW SESSION
        // -----------------------------------------------

        const sessionResult =
          await connection.execute(
            `
            INSERT INTO attendance_sessions (
              subject_code,
              section,
              session_type,
              session_date
            )

            VALUES (
              :subjectCode,
              :section,
              :sessionType,
              TRUNC(SYSDATE)
            )

            RETURNING
              session_id

            INTO
              :sessionId
            `,
            {
              subjectCode:
                cleanSubjectCode,

              section:
                cleanSection,

              sessionType:
                cleanSessionType,

              sessionId: {
                dir:
                  oracledb
                    .BIND_OUT,

                type:
                  oracledb
                    .NUMBER,
              },
            }
          );

        sessionId =
          sessionResult
            .outBinds
            .sessionId[0];
      } catch (
        sessionError
      ) {
        // ===============================================
        // DUPLICATE SESSION
        //
        // Expected unique combination:
        //
        // subject
        // section
        // session type
        // date
        // ===============================================

        if (
          sessionError
            .errorNum !== 1
        ) {
          throw sessionError;
        }

        await connection.rollback();

        // -----------------------------------------------
        // FIND EXISTING SESSION
        // -----------------------------------------------

        const existingSessionResult =
          await connection.execute(
            `
            SELECT
              session_id,
              subject_code,
              section,
              session_type,
              session_date

            FROM attendance_sessions

            WHERE UPPER(subject_code) =
                  UPPER(:subjectCode)

              AND UPPER(section) =
                  UPPER(:section)

              AND UPPER(session_type) =
                  UPPER(:sessionType)

              AND TRUNC(session_date) =
                  TRUNC(SYSDATE)
            `,
            {
              subjectCode:
                cleanSubjectCode,

              section:
                cleanSection,

              sessionType:
                cleanSessionType,
            },
            OUT_FORMAT
          );

        if (
          existingSessionResult
            .rows.length === 0
        ) {
          throw new Error(
            "Existing attendance session could not be located."
          );
        }

        sessionId =
          existingSessionResult
            .rows[0]
            .SESSION_ID;

        // -----------------------------------------------
        // CHECK SESSION HISTORY
        // -----------------------------------------------

        const historyResult =
          await connection.execute(
            `
            SELECT
              COUNT(*)
                AS history_count

            FROM attendance_records

            WHERE session_id =
                  :sessionId
            `,
            {
              sessionId,
            },
            OUT_FORMAT
          );

        const historyCount =
          Number(
            historyResult
              .rows[0]
              ?.HISTORY_COUNT ||
              0
          );

        // -----------------------------------------------
        // TRUE DUPLICATE
        // -----------------------------------------------

        if (
          historyCount > 0
        ) {
          return res
            .status(409)
            .json({
              error:
                "Attendance for this subject, section and session has already been submitted today.",
            });
        }

        // -----------------------------------------------
        // OLD SESSION CREATED BEFORE ATTENDANCE_RECORDS
        //
        // Aggregate was already counted in old system.
        //
        // Only backfill history.
        // -----------------------------------------------

        isHistoryBackfill =
          true;
      }

      if (!sessionId) {
        throw new Error(
          "Attendance session ID could not be resolved."
        );
      }

      // =================================================
      // COUNTERS
      // =================================================

      let notificationsCreated =
        0;

      let historyRecordsCreated =
        0;

      let aggregateRecordsUpdated =
        0;

      // =================================================
      // PROCESS STUDENTS
      // =================================================

      for (
        const record
        of records
      ) {
        const studentRoll =
          cleanText(
            record
              .studentRoll
          );

        const status =
          cleanText(
            record.status
          ).toLowerCase();

        const presentIncrement =
          status ===
          "present"
            ? 1
            : 0;

        // ===============================================
        // SAVE SESSION HISTORY
        // ===============================================

        await connection.execute(
          `
          INSERT INTO attendance_records (
            session_id,
            student_roll,
            status
          )

          VALUES (
            :sessionId,
            :studentRoll,
            :status
          )
          `,
          {
            sessionId,

            studentRoll,

            status:
              status
                .toUpperCase(),
          }
        );

        historyRecordsCreated++;

        // ===============================================
        // HISTORY BACKFILL
        //
        // DO NOT increment aggregate again.
        // ===============================================

        if (
          isHistoryBackfill
        ) {
          continue;
        }

        // ===============================================
        // UPDATE SUBJECT AGGREGATE
        // ===============================================

        await connection.execute(
          `
          MERGE INTO attendance a

          USING (
            SELECT
              :studentRoll
                AS student_roll,

              :subjectCode
                AS subject_code

            FROM dual
          ) src

          ON (
            UPPER(a.student_roll) =
              UPPER(
                src.student_roll
              )

            AND

            UPPER(a.subject_code) =
              UPPER(
                src.subject_code
              )
          )

          WHEN MATCHED THEN

            UPDATE SET

              a.attended_classes =
                NVL(
                  a.attended_classes,
                  0
                )
                + :presentIncrement,

              a.total_classes =
                NVL(
                  a.total_classes,
                  0
                )
                + 1

          WHEN NOT MATCHED THEN

            INSERT (
              student_roll,
              subject_code,
              attended_classes,
              total_classes
            )

            VALUES (
              :studentRoll,
              :subjectCode,
              :presentIncrement,
              1
            )
          `,
          {
            studentRoll,

            subjectCode:
              cleanSubjectCode,

            presentIncrement,
          }
        );

        aggregateRecordsUpdated++;

        // ===============================================
        // UPDATE OVERALL TREND HISTORY
        // ===============================================

        await updateOverallTrendSnapshot(
          connection,
          studentRoll
        );

        // ===============================================
        // READ UPDATED SUBJECT ATTENDANCE
        // ===============================================

        const updatedAttendanceResult =
          await connection.execute(
            `
            SELECT
              id,
              attended_classes,
              total_classes

            FROM attendance

            WHERE UPPER(student_roll) =
                  UPPER(:studentRoll)

              AND UPPER(subject_code) =
                  UPPER(:subjectCode)
            `,
            {
              studentRoll,

              subjectCode:
                cleanSubjectCode,
            },
            OUT_FORMAT
          );

        if (
          updatedAttendanceResult
            .rows.length === 0
        ) {
          throw new Error(
            `Attendance record could not be loaded for ${studentRoll}`
          );
        }

        const attendanceRow =
          updatedAttendanceResult
            .rows[0];

        const attendanceId =
          attendanceRow.ID;

        const attendedClasses =
          Number(
            attendanceRow
              .ATTENDED_CLASSES ||
              0
          );

        const totalClasses =
          Number(
            attendanceRow
              .TOTAL_CLASSES ||
              0
          );

        // ===============================================
        // LOW ATTENDANCE NOTIFICATION
        // ===============================================

        const notificationCreated =
          await createLowAttendanceNotificationIfNeeded(
            {
              connection,

              studentRoll,

              subjectName,

              attendanceId,

              attendedClasses,

              totalClasses,
            }
          );

        if (
          notificationCreated
        ) {
          notificationsCreated++;
        }
      }

      // =================================================
      // COMMIT
      // =================================================

      await connection.commit();

      // =================================================
      // RESPONSE
      // =================================================

      return res.json({
        message:
          isHistoryBackfill
            ? "Attendance history backfilled successfully"
            : "Attendance saved successfully",

        sessionId,

        mode:
          isHistoryBackfill
            ? "HISTORY_BACKFILL"
            : "NEW_SESSION",

        subjectCode:
          cleanSubjectCode,

        section:
          cleanSection,

        sessionType:
          cleanSessionType,

        studentsProcessed:
          records.length,

        historyRecordsCreated,

        aggregateRecordsUpdated,

        notificationsCreated,
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Attendance rollback error:",
            rollbackError
          );
        }
      }

      console.error(
        "Mark attendance error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to save attendance",

          details:
            error.message,
        });
    } finally {
      await closeConnection(
        connection,
        "Mark attendance"
      );
    }
  }
);

// =====================================================
// GET REAL SESSION ATTENDANCE TREND
//
// GET:
// /api/attendance/:studentRoll/trend?weeks=8
//
// Uses only:
// ATTENDANCE_SESSIONS
// ATTENDANCE_RECORDS
//
// Older aggregate attendance is NOT invented.
// =====================================================

router.get(
  "/:studentRoll/trend",
  async (req, res) => {
    let connection;

    try {
      const studentRoll =
        cleanText(
          req.params
            .studentRoll
        );

      if (!studentRoll) {
        return res
          .status(400)
          .json({
            error:
              "Student roll is required",
          });
      }

      const requestedWeeks =
        Number.parseInt(
          req.query.weeks,
          10
        );

      const weeks =
        Number.isFinite(
          requestedWeeks
        )
          ? Math.min(
              52,
              Math.max(
                1,
                requestedWeeks
              )
            )
          : 8;

      connection =
        await getConnection();

      // -----------------------------------------------
      // VERIFY STUDENT
      // -----------------------------------------------

      const studentResult =
        await connection.execute(
          `
          SELECT
            student_roll,
            name

          FROM students

          WHERE UPPER(student_roll) =
                UPPER(:studentRoll)
          `,
          {
            studentRoll,
          },
          OUT_FORMAT
        );

      if (
        studentResult
          .rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Student not found",
          });
      }

      // -----------------------------------------------
      // WEEKLY SESSION HISTORY
      // -----------------------------------------------

      const result =
        await connection.execute(
          `
          WITH week_ranges AS (

            SELECT

              TRUNC(
                SYSDATE,
                'IW'
              )
              -
              (
                7 *
                (
                  LEVEL - 1
                )
              )
              AS week_start

            FROM dual

            CONNECT BY
              LEVEL <= :weeks
          )

          SELECT

            TO_CHAR(
              w.week_start,
              'YYYY-MM-DD'
            )
            AS week_start,

            TO_CHAR(
              w.week_start,
              'DD Mon',
              'NLS_DATE_LANGUAGE=English'
            )
            AS week_label,

            SUM(
              CASE

                WHEN UPPER(
                  ar.status
                ) =
                'PRESENT'

                THEN 1

                ELSE 0

              END
            )
            AS attended_classes,

            COUNT(
              ar.record_id
            )
            AS total_classes

          FROM week_ranges w

          LEFT JOIN attendance_sessions s

            ON s.session_date >=
               w.week_start

           AND s.session_date <
               w.week_start + 7

          LEFT JOIN attendance_records ar

            ON ar.session_id =
               s.session_id

           AND UPPER(
                 ar.student_roll
               ) =
               UPPER(
                 :studentRoll
               )

          GROUP BY
            w.week_start

          ORDER BY
            w.week_start
          `,
          {
            weeks,

            studentRoll,
          },
          OUT_FORMAT
        );

      // -----------------------------------------------
      // FORMAT RESPONSE
      // -----------------------------------------------

      const trendData =
        result.rows.map(
          (row) => {
            const attendedClasses =
              Number(
                row
                  .ATTENDED_CLASSES ||
                0
              );

            const totalClasses =
              Number(
                row
                  .TOTAL_CLASSES ||
                0
              );

            const percentage =
              totalClasses > 0
                ? Number(
                    (
                      (
                        attendedClasses /
                        totalClasses
                      ) *
                      100
                    ).toFixed(1)
                  )
                : null;

            return {
              weekStart:
                row.WEEK_START,

              weekLabel:
                row.WEEK_LABEL,

              attendedClasses,

              totalClasses,

              percentage,
            };
          }
        );

      const firstTrackedWeek =
        trendData.find(
          (week) =>
            week.totalClasses > 0
        );

      const trackedWeeks =
        trendData.filter(
          (week) =>
            week.totalClasses > 0
        ).length;

      return res.json({
        studentRoll:
          studentResult
            .rows[0]
            .STUDENT_ROLL,

        studentName:
          studentResult
            .rows[0]
            .NAME,

        weeksRequested:
          weeks,

        trackedWeeks,

        trackedFrom:
          firstTrackedWeek
            ? firstTrackedWeek
                .weekStart
            : null,

        data:
          trendData,
      });
    } catch (error) {
      console.error(
        "Attendance trend error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to load attendance trend",

          details:
            error.message,
        });
    } finally {
      await closeConnection(
        connection,
        "Attendance trend"
      );
    }
  }
);

// =====================================================
// GET INDIVIDUAL SESSION HISTORY
//
// GET:
// /api/attendance/:studentRoll/history
//
// This endpoint is kept for compatibility.
// It returns the raw session history array.
// =====================================================

router.get(
  "/:studentRoll/history",
  async (req, res) => {
    let connection;

    try {
      const studentRoll =
        cleanText(
          req.params
            .studentRoll
        );

      if (!studentRoll) {
        return res
          .status(400)
          .json({
            error:
              "Student roll is required",
          });
      }

      connection =
        await getConnection();

      const rows =
        await getSessionHistoryRows(
          connection,
          studentRoll
        );

      return res.json(
        rows
      );
    } catch (error) {
      console.error(
        "Attendance history error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to load attendance history",

          details:
            error.message,
        });
    } finally {
      await closeConnection(
        connection,
        "Attendance history"
      );
    }
  }
);

// =====================================================
// GET REAL OVERALL ATTENDANCE SNAPSHOT HISTORY
//
// GET:
// /api/attendance/:studentRoll/trend-history
//
// Uses:
// ATTENDANCE_TREND_HISTORY
//
// This represents the real aggregate snapshots and
// does not fabricate missing days/weeks.
// =====================================================

router.get(
  "/:studentRoll/trend-history",
  async (req, res) => {
    let connection;

    try {
      const studentRoll =
        cleanText(
          req.params
            .studentRoll
        );

      if (!studentRoll) {
        return res
          .status(400)
          .json({
            error:
              "Student roll is required",
          });
      }

      let weeks =
        null;

      // -----------------------------------------------
      // OPTIONAL WEEK FILTER
      // -----------------------------------------------

      if (
        req.query.weeks !==
          undefined &&
        req.query.weeks !==
          ""
      ) {
        const requestedWeeks =
          Number.parseInt(
            req.query.weeks,
            10
          );

        if (
          !Number.isFinite(
            requestedWeeks
          )
        ) {
          return res
            .status(400)
            .json({
              error:
                "Weeks must be a valid number",
            });
        }

        weeks =
          Math.min(
            52,
            Math.max(
              1,
              requestedWeeks
            )
          );
      }

      connection =
        await getConnection();

      const weeksFilter =
        weeks === null
          ? ""
          : `
            AND h.snapshot_date >=
                TRUNC(
                  SYSDATE,
                  'IW'
                )
                -
                (
                  7 *
                  (
                    :weeks - 1
                  )
                )
          `;

      const binds = {
        studentRoll,
      };

      if (
        weeks !== null
      ) {
        binds.weeks =
          weeks;
      }

      // -----------------------------------------------
      // LOAD REAL SNAPSHOTS
      // -----------------------------------------------

      const result =
        await connection.execute(
          `
          SELECT

            TO_CHAR(
              h.snapshot_date,
              'YYYY-MM-DD'
            )
            AS snapshot_date,

            TO_CHAR(
              h.snapshot_date,
              'DD Mon',
              'NLS_DATE_LANGUAGE=English'
            )
            AS snapshot_label,

            h.attended_classes,

            h.total_classes,

            h.attendance_percentage

          FROM attendance_trend_history h

          WHERE UPPER(
            h.student_roll
          ) =
          UPPER(
            :studentRoll
          )

          ${weeksFilter}

          ORDER BY
            h.snapshot_date ASC,
            h.trend_id ASC
          `,
          binds,
          OUT_FORMAT
        );

      const historyData =
        result.rows.map(
          (row) => ({
            date:
              row
                .SNAPSHOT_DATE,

            label:
              row
                .SNAPSHOT_LABEL,

            attendedClasses:
              Number(
                row
                  .ATTENDED_CLASSES ||
                0
              ),

            totalClasses:
              Number(
                row
                  .TOTAL_CLASSES ||
                0
              ),

            percentage:
              Number(
                row
                  .ATTENDANCE_PERCENTAGE ||
                0
              ),
          })
        );

      return res.json({
        studentRoll,

        data:
          historyData,
      });
    } catch (error) {
      console.error(
        "Attendance trend history error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to load attendance history",

          details:
            error.message,
        });
    } finally {
      await closeConnection(
        connection,
        "Attendance trend history"
      );
    }
  }
);

// =====================================================
// GET ATTENDANCE OF ONE STUDENT
//
// GET:
// /api/attendance/:studentRoll
//
// IMPORTANT:
//
// KEEP THIS ROUTE LAST.
//
// This reads ATTENDANCE, which is the complete
// historical subject aggregate.
//
// Example:
//
// CN302
// 34 attended
// 44 total
//
// This should remain the source for:
// - subject overall attendance
// - total historical attendance
// - 75% calculations
//
// Session history must NOT replace this.
// =====================================================

router.get(
  "/:studentRoll",
  async (req, res) => {
    let connection;

    try {
      const studentRoll =
        cleanText(
          req.params
            .studentRoll
        );

      if (!studentRoll) {
        return res
          .status(400)
          .json({
            error:
              "Student roll is required",
          });
      }

      connection =
        await getConnection();

      const result =
        await connection.execute(
          `
          SELECT

            s.name,

            s.student_roll,

            sub.subject_code,

            sub.subject_name,

            a.attended_classes,

            a.total_classes

          FROM attendance a

          JOIN students s

            ON a.student_roll =
               s.student_roll

          JOIN subjects sub

            ON a.subject_code =
               sub.subject_code

          WHERE UPPER(
            s.student_roll
          ) =
          UPPER(
            :studentRoll
          )

          ORDER BY
            sub.subject_code
          `,
          {
            studentRoll,
          },
          OUT_FORMAT
        );

      return res.json(
        result.rows
      );
    } catch (error) {
      console.error(
        "Student attendance error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to load student attendance",

          details:
            error.message,
        });
    } finally {
      await closeConnection(
        connection,
        "Student attendance"
      );
    }
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;