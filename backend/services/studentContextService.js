const oracledb = require("oracledb");
const getConnection = require("../db");

const CAMPUS_TIME_ZONE =
  process.env.CAMPUS_TIME_ZONE ||
  "Asia/Kolkata";


// =====================================================
// HELPERS
// =====================================================

function numberValue(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}


function isoValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}


function getCampusDay() {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      timeZone: CAMPUS_TIME_ZONE,
    }
  ).format(new Date());
}


function getCampusDate() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: CAMPUS_TIME_ZONE,
    }
  ).format(new Date());
}


// =====================================================
// DETECT WHAT DATABASE CONTEXT IS NEEDED
// =====================================================

function detectContextTypes(message = "") {
  const text =
    String(message)
      .trim()
      .toLowerCase();

  const types =
    new Set();


  // ---------------------------------------------------
  // ATTENDANCE
  // ---------------------------------------------------

  if (
    /\battendance\b/.test(text) ||
    /\battend\b/.test(text) ||
    /\babsent\b/.test(text) ||
    /\bpresent\b/.test(text) ||
    /\bbunk\b/.test(text) ||
    /\bskip\b/.test(text) ||
    /\bmiss (a |my |the )?class\b/.test(text)
  ) {
    types.add("attendance");
  }


  // ---------------------------------------------------
  // TIMETABLE
  // ---------------------------------------------------

  if (
    /\btimetable\b/.test(text) ||
    /\bschedule\b/.test(text) ||
    /\bclass\b/.test(text) ||
    /\bclasses\b/.test(text) ||
    /\blecture\b/.test(text) ||
    /\btoday\b/.test(text) ||
    /\btomorrow\b/.test(text)
  ) {
    types.add("timetable");
  }


  // ---------------------------------------------------
  // ASSIGNMENTS
  // ---------------------------------------------------

  if (
    /\bassignment\b/.test(text) ||
    /\bassignments\b/.test(text) ||
    /\btask\b/.test(text) ||
    /\btasks\b/.test(text) ||
    /\bhomework\b/.test(text) ||
    /\bsubmission\b/.test(text) ||
    /\bdue\b/.test(text)
  ) {
    types.add("assignments");
  }


  // ---------------------------------------------------
  // EXAMS
  // ---------------------------------------------------

  if (
    /\bexam\b/.test(text) ||
    /\bexams\b/.test(text) ||
    /\bmidterm\b/.test(text) ||
    /\bmid-sem\b/.test(text) ||
    /\bsemester exam\b/.test(text) ||
    /\bfinal\b/.test(text) ||
    /\btest\b/.test(text)
  ) {
    types.add("exams");
  }


  // ---------------------------------------------------
  // NOTICES
  // ---------------------------------------------------

  if (
    /\bnotice\b/.test(text) ||
    /\bnotices\b/.test(text) ||
    /\bannouncement\b/.test(text) ||
    /\bannouncements\b/.test(text) ||
    /\bcircular\b/.test(text)
  ) {
    types.add("notices");
  }


  // ---------------------------------------------------
  // RESOURCES
  // ---------------------------------------------------

  if (
    /\bresource\b/.test(text) ||
    /\bresources\b/.test(text) ||
    /\bnotes\b/.test(text) ||
    /\bpdf\b/.test(text) ||
    /\bstudy material\b/.test(text) ||
    /\bquestion paper\b/.test(text) ||
    /\bprevious year\b/.test(text) ||
    /\bvideo\b/.test(text)
  ) {
    types.add("resources");
  }


  // ---------------------------------------------------
  // BROAD ACADEMIC OVERVIEW
  // ---------------------------------------------------

  if (
    /\bacademic overview\b/.test(text) ||
    /\bmy academics\b/.test(text) ||
    /\bmy academic status\b/.test(text) ||
    /\bwhat should i do\b/.test(text) ||
    /\bwhat do i need to do\b/.test(text) ||
    /\bwhat is pending\b/.test(text) ||
    /\bwhat's pending\b/.test(text) ||
    /\beverything\b/.test(text)
  ) {
    types.add("attendance");
    types.add("timetable");
    types.add("assignments");
    types.add("exams");
    types.add("notices");
  }


  // ---------------------------------------------------
  // "CAN I SKIP CLASS?"
  // Needs attendance + timetable together
  // ---------------------------------------------------

  if (
    text.includes("skip") ||
    text.includes("miss class") ||
    text.includes("miss my class") ||
    text.includes("bunk")
  ) {
    types.add("attendance");
    types.add("timetable");
  }


  return Array.from(types);
}


// =====================================================
// LOAD STUDENT PROFILE
// =====================================================

async function loadStudentProfile(
  connection,
  studentRoll
) {
  const result =
    await connection.execute(
      `
      SELECT
        student_roll,
        name,
        email,
        department,
        semester,
        section
      FROM students
      WHERE UPPER(student_roll) =
            UPPER(:studentRoll)
      `,
      {
        studentRoll,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );


  if (
    result.rows.length === 0
  ) {
    const error =
      new Error(
        "Student record not found."
      );

    error.statusCode = 404;

    throw error;
  }


  const row =
    result.rows[0];


  return {
    studentRoll:
      row.STUDENT_ROLL,

    name:
      row.NAME,

    email:
      row.EMAIL,

    department:
      row.DEPARTMENT,

    semester:
      row.SEMESTER,

    section:
      row.SECTION,
  };
}


// =====================================================
// ATTENDANCE
// =====================================================

async function loadAttendance(
  connection,
  studentRoll
) {
  const result =
    await connection.execute(
      `
      SELECT
        a.id,
        a.subject_code,
        s.subject_name,
        a.attended_classes,
        a.total_classes
      FROM attendance a

      JOIN subjects s
        ON a.subject_code =
           s.subject_code

      WHERE UPPER(a.student_roll) =
            UPPER(:studentRoll)

      ORDER BY
        s.subject_name
      `,
      {
        studentRoll,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );


  const subjects =
    result.rows.map((row) => {

      const attended =
        numberValue(
          row.ATTENDED_CLASSES
        );

      const total =
        numberValue(
          row.TOTAL_CLASSES
        );


      const currentPercentage =
        total > 0
          ? Number(
              (
                (attended / total) *
                100
              ).toFixed(1)
            )
          : 0;


      const ifMissNextPercentage =
        Number(
          (
            (attended /
              (total + 1)) *
            100
          ).toFixed(1)
        );


      const ifAttendNextPercentage =
        Number(
          (
            ((attended + 1) /
              (total + 1)) *
            100
          ).toFixed(1)
        );


      const classesNeededFor75 =
        currentPercentage >= 75
          ? 0
          : Math.max(
              0,
              Math.ceil(
                (
                  75 * total -
                  100 * attended
                ) / 25
              )
            );


      return {
        attendanceId:
          row.ID,

        subjectCode:
          row.SUBJECT_CODE,

        subjectName:
          row.SUBJECT_NAME,

        attendedClasses:
          attended,

        totalClasses:
          total,

        percentage:
          currentPercentage,

        ifMissNextPercentage,

        ifAttendNextPercentage,

        canMissNextAndRemainAt75:
          ifMissNextPercentage >=
          75,

        consecutiveClassesNeededFor75:
          classesNeededFor75,
      };
    });


  const totalAttended =
    subjects.reduce(
      (sum, subject) =>
        sum +
        subject.attendedClasses,
      0
    );


  const totalClasses =
    subjects.reduce(
      (sum, subject) =>
        sum +
        subject.totalClasses,
      0
    );


  const overallPercentage =
    totalClasses > 0
      ? Number(
          (
            (totalAttended /
              totalClasses) *
            100
          ).toFixed(1)
        )
      : null;


  return {
    requiredPercentage: 75,

    overallPercentage,

    totalAttended,

    totalClasses,

    subjects,
  };
}


// =====================================================
// TIMETABLE
// =====================================================

async function loadTimetable(
  connection,
  studentRoll
) {
  const result =
    await connection.execute(
      `
      SELECT
        t.id,
        t.subject_code,
        s.subject_name,
        s.faculty_name,
        t.day_of_week,
        t.start_time,
        t.end_time,
        t.room
      FROM timetable t

      JOIN subjects s
        ON t.subject_code =
           s.subject_code

      WHERE UPPER(t.student_roll) =
            UPPER(:studentRoll)

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
        t.start_time
      `,
      {
        studentRoll,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );


  const campusDay =
    getCampusDay();


  const weeklySchedule =
    result.rows.map(
      (row) => ({
        timetableId:
          row.ID,

        subjectCode:
          row.SUBJECT_CODE,

        subjectName:
          row.SUBJECT_NAME,

        facultyName:
          row.FACULTY_NAME,

        dayOfWeek:
          row.DAY_OF_WEEK,

        startTime:
          row.START_TIME,

        endTime:
          row.END_TIME,

        room:
          row.ROOM,
      })
    );


  const todayClasses =
    weeklySchedule.filter(
      (item) =>
        String(
          item.dayOfWeek || ""
        ).toLowerCase() ===
        campusDay.toLowerCase()
    );


  return {
    campusTimeZone:
      CAMPUS_TIME_ZONE,

    campusDay,

    campusDate:
      getCampusDate(),

    todayClasses,

    weeklySchedule,
  };
}


// =====================================================
// ASSIGNMENTS
// =====================================================

async function loadAssignments(
  connection,
  studentRoll
) {
  const result =
    await connection.execute(
      `
      SELECT
        a.id,
        a.subject_code,
        s.subject_name,
        a.title,
        a.description,
        a.due_date,
        a.priority,
        a.status
      FROM assignments a

      JOIN subjects s
        ON a.subject_code =
           s.subject_code

      WHERE UPPER(a.student_roll) =
            UPPER(:studentRoll)

      ORDER BY
        CASE
          WHEN LOWER(
            NVL(a.status, 'pending')
          ) = 'pending'
          THEN 0
          ELSE 1
        END,
        a.due_date NULLS LAST,
        a.id DESC
      `,
      {
        studentRoll,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );


  const assignments =
    result.rows.map(
      (row) => ({
        assignmentId:
          row.ID,

        subjectCode:
          row.SUBJECT_CODE,

        subjectName:
          row.SUBJECT_NAME,

        title:
          row.TITLE,

        description:
          row.DESCRIPTION,

        dueDate:
          isoValue(
            row.DUE_DATE
          ),

        priority:
          row.PRIORITY,

        status:
          row.STATUS,
      })
    );


  const pending =
    assignments.filter(
      (assignment) =>
        String(
          assignment.status ||
            "pending"
        ).toLowerCase() ===
        "pending"
    );


  return {
    total:
      assignments.length,

    pendingCount:
      pending.length,

    pending,

    assignments,
  };
}


// =====================================================
// EXAMS
// =====================================================

async function loadExams(
  connection,
  studentRoll
) {
  const result =
    await connection.execute(
      `
      SELECT
        e.id,
        e.subject_code,
        s.subject_name,
        e.exam_date,
        e.start_time,
        e.end_time,
        e.room,
        e.exam_type
      FROM exams e

      JOIN subjects s
        ON e.subject_code =
           s.subject_code

      WHERE UPPER(e.student_roll) =
            UPPER(:studentRoll)

        AND e.exam_date >=
            TRUNC(SYSDATE)

      ORDER BY
        e.exam_date,
        e.start_time
      `,
      {
        studentRoll,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );


  const exams =
    result.rows.map(
      (row) => ({
        examId:
          row.ID,

        subjectCode:
          row.SUBJECT_CODE,

        subjectName:
          row.SUBJECT_NAME,

        examDate:
          isoValue(
            row.EXAM_DATE
          ),

        startTime:
          row.START_TIME,

        endTime:
          row.END_TIME,

        room:
          row.ROOM,

        examType:
          row.EXAM_TYPE,
      })
    );


  return {
    upcomingCount:
      exams.length,

    nextExam:
      exams[0] || null,

    upcoming:
      exams,
  };
}


// =====================================================
// NOTICES
// =====================================================

async function loadNotices(
  connection
) {
  const result =
    await connection.execute(
      `
      SELECT
        id,
        title,
        author,
        tag,
        category,

        DBMS_LOB.SUBSTR(
          content,
          1500,
          1
        ) AS content_excerpt,

        DBMS_LOB.SUBSTR(
          ai_summary,
          1000,
          1
        ) AS ai_summary,

        created_at
      FROM notices

      ORDER BY
        created_at DESC,
        id DESC

      FETCH FIRST 10 ROWS ONLY
      `,
      [],
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );


  return result.rows.map(
    (row) => ({
      noticeId:
        row.ID,

      title:
        row.TITLE,

      author:
        row.AUTHOR,

      tag:
        row.TAG,

      category:
        row.CATEGORY,

      content:
        row.CONTENT_EXCERPT,

      aiSummary:
        row.AI_SUMMARY,

      createdAt:
        isoValue(
          row.CREATED_AT
        ),
    })
  );
}


// =====================================================
// RESOURCES
// =====================================================

async function loadResources(
  connection,
  semester
) {
  const result =
    await connection.execute(
      `
      SELECT
        r.resource_id,
        r.subject_code,
        s.subject_name,
        r.title,
        r.description,
        r.resource_type,
        r.resource_url,
        r.semester,
        r.uploaded_by,
        r.created_at
      FROM resources r

      JOIN subjects s
        ON r.subject_code =
           s.subject_code

      WHERE
        :semester IS NULL
        OR r.semester IS NULL
        OR r.semester = :semester

      ORDER BY
        r.created_at DESC,
        r.resource_id DESC
      `,
      {
        semester:
          semester === null ||
          semester === undefined
            ? null
            : Number(semester),
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );


  return result.rows.map(
    (row) => ({
      resourceId:
        row.RESOURCE_ID,

      subjectCode:
        row.SUBJECT_CODE,

      subjectName:
        row.SUBJECT_NAME,

      title:
        row.TITLE,

      description:
        row.DESCRIPTION,

      resourceType:
        row.RESOURCE_TYPE,

      resourceUrl:
        row.RESOURCE_URL,

      semester:
        row.SEMESTER,

      uploadedBy:
        row.UPLOADED_BY,

      createdAt:
        isoValue(
          row.CREATED_AT
        ),
    })
  );
}


// =====================================================
// MAIN CONTEXT BUILDER
// =====================================================

async function getStudentContext(
  studentRoll,
  message
) {
  let connection;

  try {
    connection =
      await getConnection();


    // Student identity is always fetched
    // from Oracle.

    const student =
      await loadStudentProfile(
        connection,
        studentRoll
      );


    const contextTypes =
      detectContextTypes(
        message
      );


    const context = {
      generatedAt:
        new Date().toISOString(),

      campusDate:
        getCampusDate(),

      campusDay:
        getCampusDay(),

      campusTimeZone:
        CAMPUS_TIME_ZONE,

      student,

      retrievedContextTypes:
        contextTypes,
    };


    // ---------------------------------------------
    // ATTENDANCE
    // ---------------------------------------------

    if (
      contextTypes.includes(
        "attendance"
      )
    ) {
      context.attendance =
        await loadAttendance(
          connection,
          studentRoll
        );
    }


    // ---------------------------------------------
    // TIMETABLE
    // ---------------------------------------------

    if (
      contextTypes.includes(
        "timetable"
      )
    ) {
      context.timetable =
        await loadTimetable(
          connection,
          studentRoll
        );
    }


    // ---------------------------------------------
    // ASSIGNMENTS
    // ---------------------------------------------

    if (
      contextTypes.includes(
        "assignments"
      )
    ) {
      context.assignments =
        await loadAssignments(
          connection,
          studentRoll
        );
    }


    // ---------------------------------------------
    // EXAMS
    // ---------------------------------------------

    if (
      contextTypes.includes(
        "exams"
      )
    ) {
      context.exams =
        await loadExams(
          connection,
          studentRoll
        );
    }


    // ---------------------------------------------
    // NOTICES
    // ---------------------------------------------

    if (
      contextTypes.includes(
        "notices"
      )
    ) {
      context.notices =
        await loadNotices(
          connection
        );
    }


    // ---------------------------------------------
    // RESOURCES
    // ---------------------------------------------

    if (
      contextTypes.includes(
        "resources"
      )
    ) {
      context.resources =
        await loadResources(
          connection,
          student.semester
        );
    }


    return context;

  } finally {

    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          "Student context connection close error:",
          closeError
        );
      }
    }
  }
}


module.exports = {
  detectContextTypes,
  getStudentContext,
};