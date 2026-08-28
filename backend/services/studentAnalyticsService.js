const oracledb = require("oracledb");
const getConnection = require("../db");


// =====================================================
// HELPERS
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
  if (score === null) {
    return "No Data";
  }

  if (score >= 85) {
    return "Strong";
  }

  if (score >= 75) {
    return "Stable";
  }

  if (score >= 65) {
    return "Needs Attention";
  }

  return "High Priority";
}

function getRiskLevel(score) {
  if (score === null) {
    return "UNKNOWN";
  }

  if (score >= 85) {
    return "LOW";
  }

  if (score >= 70) {
    return "MODERATE";
  }

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
    {
      studentRoll,
    },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    }
  );

  if (result.rows.length === 0) {
    const error = new Error("Student record not found.");
    error.statusCode = 404;
    throw error;
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
    {
      studentRoll,
    },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    }
  );

  return result.rows.map((row) => {
    const attended =
      row.ATTENDED_CLASSES === null
        ? null
        : Number(row.ATTENDED_CLASSES);

    const total =
      row.TOTAL_CLASSES === null
        ? null
        : Number(row.TOTAL_CLASSES);

    const attendancePercentage =
      attended !== null &&
      total !== null &&
      total > 0
        ? round((attended / total) * 100)
        : null;

    const totalAssignments =
      Number(row.TOTAL_ASSIGNMENTS || 0);

    const completedAssignments =
      Number(row.COMPLETED_ASSIGNMENTS || 0);

    const pendingAssignments =
      Number(row.PENDING_ASSIGNMENTS || 0);

    const dueSoonAssignments =
      Number(row.DUE_SOON_ASSIGNMENTS || 0);

    const assignmentCompletion =
      totalAssignments > 0
        ? round(
            (completedAssignments / totalAssignments) *
              100
          )
        : null;

    /*
      Subject Readiness Index:

      Attendance             60%
      Assignment completion  40%

      If one component does not exist,
      the available component is re-weighted automatically.

      This is NOT an exam mark or grade.
    */

    const readinessScore = calculateWeightedScore([
      {
        value: attendancePercentage,
        weight: 0.6,
      },
      {
        value: assignmentCompletion,
        weight: 0.4,
      },
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

            startTime:
              row.NEXT_EXAM_START_TIME,

            type:
              row.NEXT_EXAM_TYPE,

            room:
              row.NEXT_EXAM_ROOM,

            daysUntil:
              row.DAYS_UNTIL_EXAM === null
                ? null
                : Number(row.DAYS_UNTIL_EXAM),
          }
        : null,

      readinessScore,

      status:
        getReadinessStatus(readinessScore),
    };
  });
}


// =====================================================
// ASSIGNMENT OVERVIEW
// =====================================================

async function loadAssignmentOverview(
  connection,
  studentRoll
) {
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
    {
      studentRoll,
    },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    }
  );

  const row = result.rows[0] || {};

  const total =
    Number(row.TOTAL_ASSIGNMENTS || 0);

  const completed =
    Number(row.COMPLETED_ASSIGNMENTS || 0);

  const pending =
    Number(row.PENDING_ASSIGNMENTS || 0);

  const dueSoon =
    Number(row.DUE_SOON_ASSIGNMENTS || 0);

  const completionPercentage =
    total > 0
      ? round((completed / total) * 100)
      : null;

  return {
    total,
    completed,
    pending,
    dueSoon,
    completionPercentage,
  };
}


// =====================================================
// UPCOMING EXAMS
// =====================================================

async function loadExamOverview(
  connection,
  studentRoll
) {
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

      JOIN subjects s
        ON s.subject_code = e.subject_code

      WHERE UPPER(e.student_roll) =
            UPPER(:studentRoll)

        AND e.exam_date >= TRUNC(SYSDATE)

      ORDER BY
        e.exam_date,
        e.start_time
    `,
    {
      studentRoll,
    },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    }
  );

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

    daysUntil:
      row.DAYS_UNTIL === null
        ? null
        : Number(row.DAYS_UNTIL),
  }));

  return {
    count: exams.length,
    nextExam: exams[0] || null,
    exams,
  };
}


// =====================================================
// TIMETABLE OVERVIEW
// =====================================================

async function loadTimetableOverview(
  connection,
  studentRoll
) {
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

      WHERE UPPER(student_roll) =
            UPPER(:studentRoll)
    `,
    {
      studentRoll,
    },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    }
  );

  const row = result.rows[0] || {};

  return {
    weeklyClasses:
      Number(row.WEEKLY_CLASSES || 0),

    todayClasses:
      Number(row.TODAY_CLASSES || 0),
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
      attended +=
        subject.attendance.attendedClasses;

      total +=
        subject.attendance.totalClasses;
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

    nearThresholdCount:
      nearThreshold.length,

    belowThresholdCount:
      belowThreshold.length,
  };
}


// =====================================================
// WORKLOAD HEALTH
// =====================================================

function calculateWorkloadHealth(
  assignments,
  exams
) {
  let score = 100;

  /*
    Deterministic workload penalties.

    These do NOT estimate grades.
  */

  score -=
    Math.min(assignments.dueSoon * 15, 45);

  const examsWithin7Days =
    exams.exams.filter(
      (exam) =>
        exam.daysUntil !== null &&
        exam.daysUntil >= 0 &&
        exam.daysUntil <= 7
    ).length;

  score -=
    Math.min(examsWithin7Days * 15, 30);

  if (assignments.pending > 3) {
    score -=
      Math.min(
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

  const subjects =
    [...analytics.subjects].sort(
      (a, b) =>
        (a.readinessScore ?? 101) -
        (b.readinessScore ?? 101)
    );

  const prioritySubject =
    subjects.find(
      (subject) =>
        subject.readinessScore !== null
    );

  if (
    prioritySubject &&
    prioritySubject.readinessScore < 80
  ) {
    const parts = [];

    if (
      prioritySubject.attendance.percentage !==
      null
    ) {
      parts.push(
        `attendance is ${prioritySubject.attendance.percentage}%`
      );
    }

    if (
      prioritySubject.assignments.pending > 0
    ) {
      parts.push(
        `${prioritySubject.assignments.pending} assignment(s) remain pending`
      );
    }

    insights.push({
      type: "HIGH_IMPACT",

      title:
        `Prioritize ${prioritySubject.subjectName}`,

      description:
        parts.length > 0
          ? `${parts.join(
              " and "
            )}. This currently gives it the lowest readiness index among your tracked subjects.`
          : `This subject currently has the lowest readiness index among your tracked subjects.`,
    });
  }


  if (
    analytics.assignments.pending > 0
  ) {
    insights.push({
      type: "WORKLOAD",

      title:
        `${analytics.assignments.pending} assignment(s) pending`,

      description:
        analytics.assignments.dueSoon > 0
          ? `${analytics.assignments.dueSoon} pending assignment(s) are due within the next 7 days. Clear those first to reduce near-term workload pressure.`
          : `You currently have ${analytics.assignments.pending} pending assignment(s). Finishing them will improve your assignment-completion component.`,
    });
  }


  if (analytics.exams.nextExam) {
    const exam =
      analytics.exams.nextExam;

    insights.push({
      type: "EXAM",

      title:
        `Next exam: ${exam.subjectName}`,

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

      title:
        "Attendance currently stable",

      description:
        `Your overall attendance is ${analytics.attendance.percentage}% and no tracked subject is currently below the 75% requirement.`,
    });
  }


  if (insights.length === 0) {
    insights.push({
      type: "CONSISTENCY",

      title:
        "Academic data is currently stable",

      description:
        "No immediate attendance, assignment, or exam-pressure issue was detected from the available CampusCopilot records.",
    });
  }


  return insights.slice(0, 3);
}


// =====================================================
// MAIN ANALYTICS BUILDER
// =====================================================

async function getStudentAnalytics(studentRoll) {
  let connection;

  try {
    connection =
      await getConnection();


    const student =
      await loadStudent(
        connection,
        studentRoll
      );


    const subjects =
      await loadSubjectAnalytics(
        connection,
        studentRoll
      );


    const assignments =
      await loadAssignmentOverview(
        connection,
        studentRoll
      );


    const exams =
      await loadExamOverview(
        connection,
        studentRoll
      );


    const timetable =
      await loadTimetableOverview(
        connection,
        studentRoll
      );


    const attendance =
      calculateAttendanceOverview(
        subjects
      );


    const workloadHealth =
      calculateWorkloadHealth(
        assignments,
        exams
      );


    /*
      Overall Academic Readiness Index

      Attendance health       50%
      Assignment completion   35%
      Workload balance        15%

      Missing components are automatically
      re-weighted.

      This is NOT a GPA, mark or university grade.
    */

    const readinessScore =
      calculateWeightedScore([
        {
          value:
            attendance.percentage,

          weight:
            0.5,
        },

        {
          value:
            assignments
              .completionPercentage,

          weight:
            0.35,
        },

        {
          value:
            workloadHealth,

          weight:
            0.15,
        },
      ]);


    const analytics = {
      calculatedAt:
        new Date().toISOString(),

      student,

      readiness: {
        score:
          readinessScore,

        status:
          getReadinessStatus(
            readinessScore
          ),

        riskLevel:
          getRiskLevel(
            readinessScore
          ),

        methodology: {
          attendanceWeight:
            50,

          assignmentWeight:
            35,

          workloadWeight:
            15,

          note:
            "This is a CampusCopilot readiness index, not a GPA or academic grade.",
        },
      },

      attendance,

      assignments,

      exams,

      timetable,

      workload: {
        healthScore:
          workloadHealth,
      },

      subjects,
    };


    analytics.deterministicInsights =
      buildDeterministicInsights(
        analytics
      );


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