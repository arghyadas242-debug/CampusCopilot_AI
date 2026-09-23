const oracledb = require("oracledb");
const getConnection = require("../db");

// =====================================================
// VALIDATION
// =====================================================

function numeric(
  value,
  label,
  {
    nullable = false,
    integer = false,
    min = 0,
    max = Infinity,
  } = {}
) {
  if (nullable && value === null) {
    return null;
  }

  if (
    !["number", "string"].includes(typeof value) ||
    String(value).trim() === ""
  ) {
    throw new Error(`Missing or invalid ${label}.`);
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < min ||
    number > max ||
    (integer && !Number.isSafeInteger(number))
  ) {
    throw new Error(`Invalid ${label}.`);
  }

  return number;
}

function validateAssignmentCounts(row, aggregate = false) {
  row.TOTAL_ASSIGNMENTS = numeric(
    row.TOTAL_ASSIGNMENTS,
    "assignment total",
    { integer: true }
  );

  for (const key of [
    "COMPLETED_ASSIGNMENTS",
    "PENDING_ASSIGNMENTS",
    "DUE_SOON_ASSIGNMENTS",
  ]) {
    // SUM returns NULL when the aggregate contains no rows.
    const value =
      aggregate &&
      row.TOTAL_ASSIGNMENTS === 0 &&
      row[key] === null
        ? 0
        : row[key];

    row[key] = numeric(value, key, {
      integer: true,
      max: row.TOTAL_ASSIGNMENTS,
    });
  }

  if (
    row.COMPLETED_ASSIGNMENTS + row.PENDING_ASSIGNMENTS !==
      row.TOTAL_ASSIGNMENTS ||
    row.DUE_SOON_ASSIGNMENTS > row.PENDING_ASSIGNMENTS
  ) {
    throw new Error("Inconsistent assignment totals.");
  }
}

// =====================================================
// CALCULATION HELPERS
// =====================================================

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function calculateWeightedScore(parts) {
  const usableParts = parts.filter(
    (part) =>
      part.value !== null &&
      part.value !== undefined &&
      Number.isFinite(Number(part.value))
  );

  if (usableParts.length === 0) {
    return null;
  }

  const totalWeight = usableParts.reduce(
    (sum, part) => sum + part.weight,
    0
  );

  if (totalWeight === 0) {
    return null;
  }

  const weightedTotal = usableParts.reduce(
    (sum, part) =>
      sum + Number(part.value) * part.weight,
    0
  );

  return Math.round(weightedTotal / totalWeight);
}

function getReadinessStatus(score) {
  if (score === null) return "No Data";
  if (score >= 85) return "Strong";
  if (score >= 75) return "Stable";
  if (score >= 65) return "Needs Attention";
  return "High Priority";
}

function getRiskLevel(score) {
  if (score === null) return "UNKNOWN";
  if (score >= 85) return "LOW";
  if (score >= 70) return "MODERATE";
  return "HIGH";
}

// =====================================================
// STUDENT PROFILE
// =====================================================

async function loadStudent(connection, studentRoll) {
  const result = await connection.execute(
    `
      SELECT
        student_roll,
        name,
        email,
        department,
        semester,
        section
      FROM students
      WHERE UPPER(student_roll) = UPPER(:studentRoll)
    `,
    { studentRoll },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows.length === 0) {
    const error = new Error("Student record not found.");
    error.statusCode = 404;
    throw error;
  }

  if (result.rows.length !== 1) {
    throw new Error("Ambiguous student profile.");
  }

  const row = result.rows[0];

  return {
    studentRoll: row.STUDENT_ROLL,
    name: row.NAME,
    email: row.EMAIL,
    department: row.DEPARTMENT,
    semester: row.SEMESTER,
    section: row.SECTION,
  };
}

// =====================================================
// SUBJECT ANALYTICS
// =====================================================

async function loadSubjectAnalytics(connection, studentRoll) {
  const result = await connection.execute(
    `
      WITH student_subjects AS (
        SELECT subject_code
        FROM attendance
        WHERE UPPER(student_roll) = UPPER(:studentRoll)

        UNION

        SELECT subject_code
        FROM assignments
        WHERE UPPER(student_roll) = UPPER(:studentRoll)

        UNION

        SELECT subject_code
        FROM exams
        WHERE UPPER(student_roll) = UPPER(:studentRoll)

        UNION

        SELECT subject_code
        FROM timetable
        WHERE UPPER(student_roll) = UPPER(:studentRoll)

        UNION

        SELECT subject_code
        FROM exam_results
        WHERE UPPER(student_roll) = UPPER(:studentRoll)

        UNION

        SELECT subject_code
        FROM study_sessions
        WHERE UPPER(student_roll) = UPPER(:studentRoll)
          AND subject_code IS NOT NULL
      ),

      assignment_stats AS (
        SELECT
          subject_code,
          COUNT(*) AS total_assignments,

          SUM(
            CASE
              WHEN LOWER(NVL(status, 'pending'))
                IN ('completed', 'done', 'submitted')
              THEN 1
              ELSE 0
            END
          ) AS completed_assignments,

          SUM(
            CASE
              WHEN LOWER(NVL(status, 'pending'))
                NOT IN ('completed', 'done', 'submitted')
              THEN 1
              ELSE 0
            END
          ) AS pending_assignments,

          SUM(
            CASE
              WHEN LOWER(NVL(status, 'pending'))
                NOT IN ('completed', 'done', 'submitted')
                AND due_date IS NOT NULL
                AND TRUNC(due_date)
                  BETWEEN TRUNC(SYSDATE)
                  AND TRUNC(SYSDATE) + 7
              THEN 1
              ELSE 0
            END
          ) AS due_soon_assignments

        FROM assignments
        WHERE UPPER(student_roll) = UPPER(:studentRoll)
        GROUP BY subject_code
      ),

      upcoming_exams AS (
        SELECT
          subject_code,
          exam_date,
          start_time,
          exam_type,
          room,

          ROW_NUMBER() OVER (
            PARTITION BY subject_code
            ORDER BY exam_date, start_time
          ) AS rn

        FROM exams
        WHERE UPPER(student_roll) = UPPER(:studentRoll)
          AND exam_date >= TRUNC(SYSDATE)
      )

      SELECT
        s.subject_code,
        s.subject_name,
        s.faculty_name,
        a.attended_classes,
        a.total_classes,

        NVL(ast.total_assignments, 0)
          AS total_assignments,

        NVL(ast.completed_assignments, 0)
          AS completed_assignments,

        NVL(ast.pending_assignments, 0)
          AS pending_assignments,

        NVL(ast.due_soon_assignments, 0)
          AS due_soon_assignments,

        ue.exam_date AS next_exam_date,
        ue.start_time AS next_exam_start_time,
        ue.exam_type AS next_exam_type,
        ue.room AS next_exam_room,

        CASE
          WHEN ue.exam_date IS NOT NULL
          THEN TRUNC(ue.exam_date) - TRUNC(SYSDATE)
          ELSE NULL
        END AS days_until_exam

      FROM student_subjects ss

      JOIN subjects s
        ON s.subject_code = ss.subject_code

      LEFT JOIN attendance a
        ON a.subject_code = ss.subject_code
        AND UPPER(a.student_roll) = UPPER(:studentRoll)

      LEFT JOIN assignment_stats ast
        ON ast.subject_code = ss.subject_code

      LEFT JOIN upcoming_exams ue
        ON ue.subject_code = ss.subject_code
        AND ue.rn = 1

      ORDER BY s.subject_name
    `,
    { studentRoll },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  for (const row of result.rows) {
    row.ATTENDED_CLASSES = numeric(
      row.ATTENDED_CLASSES,
      "attended classes",
      { nullable: true, integer: true }
    );

    row.TOTAL_CLASSES = numeric(
      row.TOTAL_CLASSES,
      "total classes",
      { nullable: true, integer: true }
    );

    if (
      (row.ATTENDED_CLASSES === null) !==
        (row.TOTAL_CLASSES === null) ||
      (
        row.ATTENDED_CLASSES !== null &&
        row.ATTENDED_CLASSES > row.TOTAL_CLASSES
      )
    ) {
      throw new Error("Inconsistent attendance counts.");
    }

    validateAssignmentCounts(row);

    row.DAYS_UNTIL_EXAM = numeric(
      row.DAYS_UNTIL_EXAM,
      "exam days",
      { nullable: true, integer: true }
    );
  }

  return result.rows.map((row) => {
    const attended = row.ATTENDED_CLASSES;
    const total = row.TOTAL_CLASSES;

    const attendancePercentage =
      attended !== null && total !== null && total > 0
        ? round((attended / total) * 100)
        : null;

    const totalAssignments = row.TOTAL_ASSIGNMENTS;
    const completedAssignments = row.COMPLETED_ASSIGNMENTS;
    const pendingAssignments = row.PENDING_ASSIGNMENTS;
    const dueSoonAssignments = row.DUE_SOON_ASSIGNMENTS;

    const assignmentCompletion =
      totalAssignments > 0
        ? round(
            (completedAssignments / totalAssignments) * 100
          )
        : null;

    // Existing subject readiness weights remain unchanged.
    const readinessScore = calculateWeightedScore([
      { value: attendancePercentage, weight: 0.6 },
      { value: assignmentCompletion, weight: 0.4 },
    ]);

    return {
      subjectCode: row.SUBJECT_CODE,
      subjectName: row.SUBJECT_NAME,
      facultyName: row.FACULTY_NAME,

      attendance: {
        attendedClasses: attended,
        totalClasses: total,
        percentage: attendancePercentage,
      },

      assignments: {
        total: totalAssignments,
        completed: completedAssignments,
        pending: pendingAssignments,
        dueSoon: dueSoonAssignments,
        completionPercentage: assignmentCompletion,
      },

      nextExam: row.NEXT_EXAM_DATE
        ? {
            date:
              row.NEXT_EXAM_DATE instanceof Date
                ? row.NEXT_EXAM_DATE.toISOString()
                : row.NEXT_EXAM_DATE,

            startTime: row.NEXT_EXAM_START_TIME,
            type: row.NEXT_EXAM_TYPE,
            room: row.NEXT_EXAM_ROOM,
            daysUntil: row.DAYS_UNTIL_EXAM,
          }
        : null,

      readinessScore,
      status: getReadinessStatus(readinessScore),
    };
  });
}

// =====================================================
// ASSIGNMENT OVERVIEW
// =====================================================

async function loadAssignmentOverview(connection, studentRoll) {
  const result = await connection.execute(
    `
      SELECT
        COUNT(*) AS total_assignments,

        SUM(
          CASE
            WHEN LOWER(NVL(status, 'pending'))
              IN ('completed', 'done', 'submitted')
            THEN 1
            ELSE 0
          END
        ) AS completed_assignments,

        SUM(
          CASE
            WHEN LOWER(NVL(status, 'pending'))
              NOT IN ('completed', 'done', 'submitted')
            THEN 1
            ELSE 0
          END
        ) AS pending_assignments,

        SUM(
          CASE
            WHEN LOWER(NVL(status, 'pending'))
              NOT IN ('completed', 'done', 'submitted')
              AND due_date IS NOT NULL
              AND TRUNC(due_date)
                BETWEEN TRUNC(SYSDATE)
                AND TRUNC(SYSDATE) + 7
            THEN 1
            ELSE 0
          END
        ) AS due_soon_assignments

      FROM assignments
      WHERE UPPER(student_roll) = UPPER(:studentRoll)
    `,
    { studentRoll },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows.length !== 1) {
    throw new Error("Missing assignment totals.");
  }

  const row = result.rows[0];

  validateAssignmentCounts(row, true);

  const total = row.TOTAL_ASSIGNMENTS;
  const completed = row.COMPLETED_ASSIGNMENTS;
  const pending = row.PENDING_ASSIGNMENTS;
  const dueSoon = row.DUE_SOON_ASSIGNMENTS;

  return {
    total,
    completed,
    pending,
    dueSoon,

    completionPercentage:
      total > 0
        ? round((completed / total) * 100)
        : null,
  };
}

// =====================================================
// UPCOMING EXAMS
// =====================================================

async function loadExamOverview(connection, studentRoll) {
  const result = await connection.execute(
    `
      SELECT
        e.id,
        e.subject_code,
        s.subject_name,
        e.exam_date,
        e.start_time,
        e.end_time,
        e.room,
        e.exam_type,

        TRUNC(e.exam_date) - TRUNC(SYSDATE)
          AS days_until

      FROM exams e

      LEFT JOIN subjects s
        ON s.subject_code = e.subject_code

      WHERE UPPER(e.student_roll) = UPPER(:studentRoll)
        AND e.exam_date >= TRUNC(SYSDATE)

      ORDER BY e.exam_date, e.start_time
    `,
    { studentRoll },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  for (const row of result.rows) {
    row.DAYS_UNTIL = numeric(
      row.DAYS_UNTIL,
      "exam days",
      { nullable: true, integer: true }
    );
  }

  const exams = result.rows.map((row) => ({
    examId: row.ID,
    subjectCode: row.SUBJECT_CODE,
    subjectName: row.SUBJECT_NAME,

    examDate:
      row.EXAM_DATE instanceof Date
        ? row.EXAM_DATE.toISOString()
        : row.EXAM_DATE,

    startTime: row.START_TIME,
    endTime: row.END_TIME,
    room: row.ROOM,
    examType: row.EXAM_TYPE,
    daysUntil: row.DAYS_UNTIL,
  }));

  return {
    count: exams.length,
    nextExam: exams[0] || null,
    exams,
  };
}

// =====================================================
// EXAM RESULT ANALYTICS
// =====================================================

async function loadExamResultAnalytics(connection, studentRoll) {
  const result = await connection.execute(
    `
      SELECT
        er.result_id,
        er.student_roll,
        er.subject_code,
        s.subject_name,
        er.exam_type,
        er.marks_obtained,
        er.max_marks,
        er.exam_date,
        er.created_at,

        ROUND(
          (
            er.marks_obtained /
            NULLIF(er.max_marks, 0)
          ) * 100,
          1
        ) AS percentage,

        (
          SELECT
            ROUND(
              AVG(
                (
                  er2.marks_obtained /
                  NULLIF(er2.max_marks, 0)
                ) * 100
              ),
              1
            )

          FROM exam_results er2

          WHERE UPPER(er2.subject_code) =
                UPPER(er.subject_code)

            AND UPPER(NVL(er2.exam_type, 'UNKNOWN')) =
                UPPER(NVL(er.exam_type, 'UNKNOWN'))

            AND (
              (
                er2.exam_date IS NULL
                AND er.exam_date IS NULL
              )
              OR TRUNC(er2.exam_date) = TRUNC(er.exam_date)
            )
        ) AS class_average_percentage

      FROM exam_results er

      JOIN subjects s
        ON s.subject_code = er.subject_code

      WHERE UPPER(er.student_roll) = UPPER(:studentRoll)

      ORDER BY
        er.exam_date ASC NULLS LAST,
        er.created_at ASC,
        er.result_id ASC
    `,
    { studentRoll },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  for (const row of result.rows) {
    row.MAX_MARKS = numeric(
      row.MAX_MARKS,
      "maximum marks"
    );

    if (row.MAX_MARKS <= 0) {
      throw new Error("Maximum marks must be positive.");
    }

    row.MARKS_OBTAINED = numeric(
      row.MARKS_OBTAINED,
      "marks obtained",
      { max: row.MAX_MARKS }
    );

    row.PERCENTAGE = numeric(
      row.PERCENTAGE,
      "assessment percentage",
      { max: 100 }
    );

    row.CLASS_AVERAGE_PERCENTAGE = numeric(
      row.CLASS_AVERAGE_PERCENTAGE,
      "class average",
      { nullable: true, max: 100 }
    );
  }

  const rows = result.rows;

  if (rows.length === 0) {
    return {
      totalAssessments: 0,
      totalMarksObtained: 0,
      totalMaxMarks: 0,
      overallPercentage: null,
      classAveragePercentage: null,
      bestSubject: null,
      weakestSubject: null,
      subjects: [],
      trend: [],
    };
  }

  let totalMarksObtained = 0;
  let totalMaxMarks = 0;

  rows.forEach((row) => {
    totalMarksObtained += row.MARKS_OBTAINED;
    totalMaxMarks += row.MAX_MARKS;
  });

  const overallPercentage =
    totalMaxMarks > 0
      ? round((totalMarksObtained / totalMaxMarks) * 100)
      : null;

  const classAverageValues = rows
    .map((row) => row.CLASS_AVERAGE_PERCENTAGE)
    .filter(
      (value) =>
        value !== null &&
        Number.isFinite(value)
    );

  const classAveragePercentage =
    classAverageValues.length > 0
      ? round(
          classAverageValues.reduce(
            (total, value) => total + value,
            0
          ) / classAverageValues.length
        )
      : null;

  const subjectMap = new Map();

  rows.forEach((row) => {
    const subjectCode = row.SUBJECT_CODE;

    if (!subjectMap.has(subjectCode)) {
      subjectMap.set(subjectCode, {
        subjectCode,
        subjectName: row.SUBJECT_NAME,
        totalAssessments: 0,
        marksObtained: 0,
        maxMarks: 0,
        classAverages: [],
      });
    }

    const subject = subjectMap.get(subjectCode);

    subject.totalAssessments += 1;
    subject.marksObtained += row.MARKS_OBTAINED;
    subject.maxMarks += row.MAX_MARKS;

    if (row.CLASS_AVERAGE_PERCENTAGE !== null) {
      subject.classAverages.push(
        row.CLASS_AVERAGE_PERCENTAGE
      );
    }
  });

  const subjects = Array.from(subjectMap.values()).map(
    (subject) => {
      const percentage =
        subject.maxMarks > 0
          ? round(
              (subject.marksObtained / subject.maxMarks) * 100
            )
          : null;

      const subjectClassAverage =
        subject.classAverages.length > 0
          ? round(
              subject.classAverages.reduce(
                (total, value) => total + value,
                0
              ) / subject.classAverages.length
            )
          : null;

      return {
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        totalAssessments: subject.totalAssessments,
        marksObtained: round(subject.marksObtained, 2),
        maxMarks: round(subject.maxMarks, 2),
        percentage,
        classAveragePercentage: subjectClassAverage,
      };
    }
  );

  const comparableSubjects = subjects
    .filter((subject) => subject.percentage !== null)
    .sort((a, b) => b.percentage - a.percentage);

  const bestSubject =
    comparableSubjects.length > 0
      ? comparableSubjects[0]
      : null;

  const weakestSubject =
    comparableSubjects.length > 0
      ? comparableSubjects[comparableSubjects.length - 1]
      : null;

  const trend = rows.map((row) => ({
    resultId: row.RESULT_ID,
    subjectCode: row.SUBJECT_CODE,
    subjectName: row.SUBJECT_NAME,
    examType: row.EXAM_TYPE,
    marksObtained: row.MARKS_OBTAINED,
    maxMarks: row.MAX_MARKS,
    percentage: row.PERCENTAGE,
    classAveragePercentage: row.CLASS_AVERAGE_PERCENTAGE,

    examDate:
      row.EXAM_DATE instanceof Date
        ? row.EXAM_DATE.toISOString()
        : row.EXAM_DATE,

    createdAt:
      row.CREATED_AT instanceof Date
        ? row.CREATED_AT.toISOString()
        : row.CREATED_AT,
  }));

  return {
    totalAssessments: rows.length,
    totalMarksObtained: round(totalMarksObtained, 2),
    totalMaxMarks: round(totalMaxMarks, 2),
    overallPercentage,
    classAveragePercentage,
    bestSubject,
    weakestSubject,
    subjects,
    trend,
  };
}

// =====================================================
// STUDY SESSION ANALYTICS
// =====================================================

async function loadStudySessionAnalytics(connection, studentRoll) {
  const result = await connection.execute(
    `
      SELECT
        ss.study_session_id,
        ss.subject_code,
        s.subject_name,
        ss.start_time,
        ss.end_time,
        ss.created_at,

        TO_CHAR(ss.start_time, 'YYYY-MM-DD') AS study_date,

        TRUNC(SYSDATE) -
        TRUNC(CAST(ss.start_time AS DATE)) AS days_ago,

        CASE
          WHEN ss.end_time IS NOT NULL
            AND ss.end_time >= ss.start_time
          THEN ROUND(
            (
              CAST(ss.end_time AS DATE) -
              CAST(ss.start_time AS DATE)
            ) * 24 * 60,
            2
          )
          ELSE NULL
        END AS duration_minutes,

        CASE
          WHEN TRUNC(CAST(ss.start_time AS DATE)) =
               TRUNC(SYSDATE)
          THEN 1
          ELSE 0
        END AS is_today,

        CASE
          WHEN TRUNC(CAST(ss.start_time AS DATE), 'IW') =
               TRUNC(SYSDATE, 'IW')
          THEN 1
          ELSE 0
        END AS is_this_week

      FROM study_sessions ss

      LEFT JOIN subjects s
        ON s.subject_code = ss.subject_code

      WHERE UPPER(ss.student_roll) = UPPER(:studentRoll)

      ORDER BY ss.start_time DESC
    `,
    { studentRoll },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  for (const row of result.rows) {
    row.DURATION_MINUTES = numeric(
      row.DURATION_MINUTES,
      "session duration",
      { nullable: true }
    );

    if (
      !row.START_TIME ||
      row.END_TIME === undefined ||
      (
        row.END_TIME !== null &&
        row.DURATION_MINUTES === null
      )
    ) {
      throw new Error("Invalid study session times.");
    }

    row.DAYS_AGO = numeric(
      row.DAYS_AGO,
      "study date offset",
      { integer: true, min: -Infinity }
    );

    row.IS_TODAY = numeric(
      row.IS_TODAY,
      "today flag",
      { integer: true, max: 1 }
    );

    row.IS_THIS_WEEK = numeric(
      row.IS_THIS_WEEK,
      "week flag",
      { integer: true, max: 1 }
    );
  }

  const rows = result.rows;

  if (rows.length === 0) {
    return {
      totalSessions: 0,
      completedSessions: 0,
      activeSessions: 0,
      totalMinutes: 0,
      totalHours: 0,
      todayMinutes: 0,
      todayHours: 0,
      weekMinutes: 0,
      weekHours: 0,
      currentStreak: 0,
      subjects: [],
      recentSessions: [],
    };
  }

  const completedRows = rows.filter(
    (row) =>
      row.END_TIME !== null &&
      row.DURATION_MINUTES !== null
  );

  const activeSessions = rows.filter(
    (row) => row.END_TIME === null
  ).length;

  const totalMinutes = completedRows.reduce(
    (total, row) => total + row.DURATION_MINUTES,
    0
  );

  const todayMinutes = completedRows
    .filter((row) => row.IS_TODAY === 1)
    .reduce(
      (total, row) => total + row.DURATION_MINUTES,
      0
    );

  const weekMinutes = completedRows
    .filter((row) => row.IS_THIS_WEEK === 1)
    .reduce(
      (total, row) => total + row.DURATION_MINUTES,
      0
    );

  // Existing rule: a streak starts with a completed session today.
  const studyDays = new Set(
    completedRows
      .map((row) => row.DAYS_AGO)
      .filter(
        (daysAgo) =>
          Number.isInteger(daysAgo) &&
          daysAgo >= 0
      )
  );

  let currentStreak = 0;

  while (studyDays.has(currentStreak)) {
    currentStreak += 1;
  }

  const subjectMap = new Map();

  completedRows.forEach((row) => {
    const subjectCode = row.SUBJECT_CODE || "GENERAL";

    if (!subjectMap.has(subjectCode)) {
      subjectMap.set(subjectCode, {
        subjectCode,
        subjectName: row.SUBJECT_NAME || "General Study",
        sessionCount: 0,
        totalMinutes: 0,
      });
    }

    const subject = subjectMap.get(subjectCode);

    subject.sessionCount += 1;
    subject.totalMinutes += row.DURATION_MINUTES;
  });

  const subjects = Array.from(subjectMap.values())
    .map((subject) => ({
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      sessionCount: subject.sessionCount,
      totalMinutes: round(subject.totalMinutes, 1),
      totalHours: round(subject.totalMinutes / 60, 1),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  const recentSessions = rows.slice(0, 10).map((row) => ({
    studySessionId: row.STUDY_SESSION_ID,
    subjectCode: row.SUBJECT_CODE,
    subjectName: row.SUBJECT_NAME,

    startTime:
      row.START_TIME instanceof Date
        ? row.START_TIME.toISOString()
        : row.START_TIME,

    endTime:
      row.END_TIME instanceof Date
        ? row.END_TIME.toISOString()
        : row.END_TIME,

    durationMinutes: row.DURATION_MINUTES,
    active: row.END_TIME === null,
  }));

  return {
    totalSessions: rows.length,
    completedSessions: completedRows.length,
    activeSessions,
    totalMinutes: round(totalMinutes, 1),
    totalHours: round(totalMinutes / 60, 1),
    todayMinutes: round(todayMinutes, 1),
    todayHours: round(todayMinutes / 60, 1),
    weekMinutes: round(weekMinutes, 1),
    weekHours: round(weekMinutes / 60, 1),
    currentStreak,
    subjects,
    recentSessions,
  };
}

// =====================================================
// TIMETABLE OVERVIEW
// =====================================================

async function loadTimetableOverview(connection, studentRoll) {
  const result = await connection.execute(
    `
      SELECT
        COUNT(*) AS weekly_classes,

        SUM(
          CASE
            WHEN LOWER(TRIM(day_of_week)) =
              LOWER(
                TRIM(
                  TO_CHAR(
                    SYSDATE,
                    'FMDay',
                    'NLS_DATE_LANGUAGE=ENGLISH'
                  )
                )
              )
            THEN 1
            ELSE 0
          END
        ) AS today_classes

      FROM timetable
      WHERE UPPER(student_roll) = UPPER(:studentRoll)
    `,
    { studentRoll },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows.length !== 1) {
    throw new Error("Missing timetable totals.");
  }

  const row = result.rows[0];

  row.WEEKLY_CLASSES = numeric(
    row.WEEKLY_CLASSES,
    "weekly classes",
    { integer: true }
  );

  row.TODAY_CLASSES = numeric(
    row.WEEKLY_CLASSES === 0 && row.TODAY_CLASSES === null
      ? 0
      : row.TODAY_CLASSES,
    "today classes",
    {
      integer: true,
      max: row.WEEKLY_CLASSES,
    }
  );

  return {
    weeklyClasses: row.WEEKLY_CLASSES,
    todayClasses: row.TODAY_CLASSES,
  };
}

// =====================================================
// OVERALL ATTENDANCE
// =====================================================

function calculateAttendanceOverview(subjects) {
  let attended = 0;
  let total = 0;

  subjects.forEach((subject) => {
    if (
      subject.attendance.attendedClasses !== null &&
      subject.attendance.totalClasses !== null
    ) {
      attended += subject.attendance.attendedClasses;
      total += subject.attendance.totalClasses;
    }
  });

  const percentage =
    total > 0
      ? round((attended / total) * 100)
      : null;

  const nearThreshold = subjects.filter(
    (subject) =>
      subject.attendance.percentage !== null &&
      subject.attendance.percentage >= 75 &&
      subject.attendance.percentage < 80
  );

  const belowThreshold = subjects.filter(
    (subject) =>
      subject.attendance.percentage !== null &&
      subject.attendance.percentage < 75
  );

  return {
    attendedClasses: attended,
    totalClasses: total,
    percentage,
    requiredPercentage: 75,
    nearThresholdCount: nearThreshold.length,
    belowThresholdCount: belowThreshold.length,
  };
}

// =====================================================
// WORKLOAD HEALTH
// =====================================================

function calculateWorkloadHealth(assignments, exams) {
  let score = 100;

  score -= Math.min(assignments.dueSoon * 15, 45);

  const examsWithin7Days = exams.exams.filter(
    (exam) =>
      exam.daysUntil !== null &&
      exam.daysUntil >= 0 &&
      exam.daysUntil <= 7
  ).length;

  score -= Math.min(examsWithin7Days * 15, 30);

  if (assignments.pending > 3) {
    score -= Math.min(
      (assignments.pending - 3) * 5,
      20
    );
  }

  return clamp(score);
}

// =====================================================
// DETERMINISTIC INSIGHTS
// =====================================================

function buildDeterministicInsights(analytics) {
  const insights = [];

  const subjects = [...analytics.subjects].sort(
    (a, b) =>
      (a.readinessScore ?? 101) -
      (b.readinessScore ?? 101)
  );

  const prioritySubject = subjects.find(
    (subject) => subject.readinessScore !== null
  );

  if (
    prioritySubject &&
    prioritySubject.readinessScore < 80
  ) {
    const parts = [];

    if (prioritySubject.attendance.percentage !== null) {
      parts.push(
        `attendance is ${prioritySubject.attendance.percentage}%`
      );
    }

    if (prioritySubject.assignments.pending > 0) {
      parts.push(
        `${prioritySubject.assignments.pending} assignment(s) remain pending`
      );
    }

    insights.push({
      type: "HIGH_IMPACT",
      title: `Prioritize ${prioritySubject.subjectName}`,

      description:
        parts.length > 0
          ? `${parts.join(" and ")}. This currently gives it the lowest readiness index among your tracked subjects.`
          : "This subject currently has the lowest readiness index among your tracked subjects.",
    });
  }

  if (analytics.assignments.pending > 0) {
    insights.push({
      type: "WORKLOAD",
      title: `${analytics.assignments.pending} assignment(s) pending`,

      description:
        analytics.assignments.dueSoon > 0
          ? `${analytics.assignments.dueSoon} pending assignment(s) are due within the next 7 days. Clear those first to reduce near-term workload pressure.`
          : `You currently have ${analytics.assignments.pending} pending assignment(s). Finishing them will improve your assignment-completion component.`,
    });
  }

  if (analytics.exams.nextExam) {
    const exam = analytics.exams.nextExam;

    insights.push({
      type: "EXAM",
      title: `Next exam: ${exam.subjectName}`,

      description:
        `${exam.examType || "Exam"} is scheduled in ${exam.daysUntil} day(s). Use your remaining time alongside attendance and assignment obligations for this subject.`,
    });
  }

  if (
    analytics.attendance.percentage !== null &&
    analytics.attendance.percentage >= 80 &&
    analytics.attendance.belowThresholdCount === 0
  ) {
    insights.push({
      type: "CONSISTENCY",
      title: "Attendance currently stable",

      description:
        `Your overall attendance is ${analytics.attendance.percentage}% and no tracked subject is currently below the 75% requirement.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "CONSISTENCY",

      title:
        analytics.readiness.score === null
          ? "Readiness data is unavailable"
          : "No immediate priority detected",

      description:
        analytics.readiness.score === null
          ? "There are no usable attendance, assignment or upcoming-exam records to calculate readiness. This does not establish academic performance."
          : "No immediate attendance, assignment, or exam-pressure issue was detected from the available CampusCopilot records.",
    });
  }

  return insights.slice(0, 3);
}

// =====================================================
// MAIN ANALYTICS BUILDER
// =====================================================

// The calling route must authenticate the user and authorize
// access to this studentRoll before invoking this service.

async function getStudentAnalytics(studentRoll) {
  if (
    !["string", "number"].includes(typeof studentRoll) ||
    (
      typeof studentRoll === "number" &&
      (
        !Number.isSafeInteger(studentRoll) ||
        studentRoll <= 0
      )
    ) ||
    !String(studentRoll).trim() ||
    String(studentRoll).trim().length > 100 ||
    /[\u0000-\u001f\u007f]/.test(String(studentRoll))
  ) {
    const error = new Error("Invalid student roll number.");
    error.statusCode = 400;
    throw error;
  }

  studentRoll = String(studentRoll).trim();

  let connection;

  try {
    connection = await getConnection();

    const student = await loadStudent(
      connection,
      studentRoll
    );

    studentRoll = String(student.studentRoll).trim();

    const subjects = await loadSubjectAnalytics(
      connection,
      studentRoll
    );

    const assignments = await loadAssignmentOverview(
      connection,
      studentRoll
    );

    const exams = await loadExamOverview(
      connection,
      studentRoll
    );

    const timetable = await loadTimetableOverview(
      connection,
      studentRoll
    );

    const examResults = await loadExamResultAnalytics(
      connection,
      studentRoll
    );

    const studyActivity = await loadStudySessionAnalytics(
      connection,
      studentRoll
    );

    const attendance = calculateAttendanceOverview(subjects);

    const workloadHealth =
      attendance.percentage === null &&
      assignments.total === 0 &&
      exams.count === 0
        ? null
        : calculateWorkloadHealth(assignments, exams);

    // Preserve existing weights.
    // Exam results and study activity remain separate analytics.
    const readinessScore = calculateWeightedScore([
      {
        value: attendance.percentage,
        weight: 0.5,
      },
      {
        value: assignments.completionPercentage,
        weight: 0.35,
      },
      {
        value: workloadHealth,
        weight: 0.15,
      },
    ]);

    const analytics = {
      calculatedAt: new Date().toISOString(),
      student,

      readiness: {
        score: readinessScore,
        status: getReadinessStatus(readinessScore),
        riskLevel: getRiskLevel(readinessScore),

        methodology: {
          attendanceWeight: 50,
          assignmentWeight: 35,
          workloadWeight: 15,

          note:
            "This is a CampusCopilot readiness index, not a GPA or academic grade.",
        },
      },

      attendance,
      assignments,
      exams,
      examResults,
      studyActivity,
      timetable,

      workload: {
        healthScore: workloadHealth,
      },

      subjects,
    };

    analytics.deterministicInsights =
      buildDeterministicInsights(analytics);

    return analytics;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error(
          "Analytics DB connection close error:",
          error
        );
      }
    }
  }
}

module.exports = {
  getStudentAnalytics,
  buildDeterministicInsights,
};