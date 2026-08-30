import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import {
  authService,
} from "../../services/api";

import StudentNotificationBell from "./StudentNotificationBell";

const API_URL =
  "http://localhost:5000";

const CAMPUS_TIME_ZONE =
  "Asia/Kolkata";

// =====================================================
// NAVIGATION
// =====================================================

const NAV_ITEMS = [
  {
    label: "Home",
    path: "/dashboard",
    icon: "dashboard",
  },
  {
    label: "Timetable",
    path: "/timetable",
    icon: "calendar_month",
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: "analytics",
  },
  {
    label: "Assignments",
    path: "/assignments",
    icon: "assignment",
  },
  {
    label: "Exams",
    path: "/exams",
    icon: "description",
  },
  {
    label: "Notices",
    path: "/notices",
    icon: "campaign",
  },
  {
    label: "AI Analytics",
    path: "/ai-analytics",
    icon: "insights",
  },
  {
    label: "Resources",
    path: "/resources",
    icon: "folder_open",
  },
  {
    label: "Digital ID",
    path: "/student-id",
    icon: "badge",
  },
];

// =====================================================
// AUTH
// =====================================================

function getAuthToken() {
  try {
    if (
      typeof authService.getToken ===
      "function"
    ) {
      const token =
        authService.getToken();

      if (token) {
        return token;
      }
    }
  } catch {
    // Continue to localStorage.
  }

  return (
    localStorage.getItem(
      "campus_token"
    ) ||
    localStorage.getItem(
      "token"
    ) ||
    ""
  );
}

function getAuthHeaders() {
  const token =
    getAuthToken();

  if (!token) {
    return {};
  }

  return {
    Authorization:
      `Bearer ${token}`,
  };
}

// =====================================================
// PROFILE
// =====================================================

function getInitials(name) {
  const parts =
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "ST";
  }

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase()
    )
    .join("");
}

// =====================================================
// CAMPUS DATE
// =====================================================

function getCampusToday() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          CAMPUS_TIME_ZONE,

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(
      new Date()
    );

  const values = {};

  parts.forEach(
    (part) => {
      if (
        part.type !==
        "literal"
      ) {
        values[
          part.type
        ] =
          part.value;
      }
    }
  );

  return new Date(
    Number(
      values.year
    ),
    Number(
      values.month
    ) - 1,
    Number(
      values.day
    )
  );
}

// =====================================================
// EXAM DATE PARSER
// =====================================================

function parseExamDate(value) {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date
  ) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  const text =
    String(value).trim();

  // -----------------------------------------------
  // YYYY-MM-DD
  // also supports:
  // YYYY-MM-DDTHH:mm:ss...
  // -----------------------------------------------

  let match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  // -----------------------------------------------
  // DD-MM-YYYY
  // -----------------------------------------------

  match =
    text.match(
      /^(\d{2})-(\d{2})-(\d{4})$/
    );

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    );
  }

  // -----------------------------------------------
  // DD-MON-YY / DD-MON-YYYY
  // -----------------------------------------------

  match =
    text.match(
      /^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/
    );

  if (match) {
    const monthMap = {
      JAN: 0,
      FEB: 1,
      MAR: 2,
      APR: 3,
      MAY: 4,
      JUN: 5,
      JUL: 6,
      AUG: 7,
      SEP: 8,
      OCT: 9,
      NOV: 10,
      DEC: 11,
    };

    const month =
      monthMap[
        match[2]
          .toUpperCase()
      ];

    if (
      month !== undefined
    ) {
      let year =
        Number(
          match[3]
        );

      if (year < 100) {
        year += 2000;
      }

      return new Date(
        year,
        month,
        Number(
          match[1]
        )
      );
    }
  }

  // -----------------------------------------------
  // FALLBACK
  // -----------------------------------------------

  const parsed =
    new Date(text);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
}

// =====================================================
// DATE KEY
// =====================================================

function dateKeyFromDate(
  date
) {
  if (!date) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

// =====================================================
// FORMAT DATE
// =====================================================

function formatExamDate(date) {
  if (!date) {
    return "Date not available";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatCalendarDate(
  date
) {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatMonthYear(
  date
) {
  return date.toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );
}

// =====================================================
// TIME
// =====================================================

function formatTime(time) {
  if (!time) {
    return "TBA";
  }

  const text =
    String(time).trim();

  // Already formatted AM/PM.

  if (
    /AM|PM/i.test(text)
  ) {
    return text;
  }

  const parts =
    text.split(":");

  let hour =
    Number(parts[0]);

  const minute =
    String(
      parts[1] ||
        "00"
    ).padStart(
      2,
      "0"
    );

  if (
    Number.isNaN(hour)
  ) {
    return text;
  }

  const period =
    hour >= 12
      ? "PM"
      : "AM";

  hour =
    hour % 12;

  if (
    hour === 0
  ) {
    hour = 12;
  }

  return `${String(
    hour
  ).padStart(
    2,
    "0"
  )}:${minute} ${period}`;
}

// =====================================================
// DAYS LEFT
// =====================================================

function calculateDaysLeft(
  date
) {
  if (!date) {
    return null;
  }

  const today =
    getCampusToday();

  const todayUTC =
    Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const examUTC =
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  return Math.round(
    (
      examUTC -
      todayUTC
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
}

// =====================================================
// BADGE
// =====================================================

function getBadgeColor(type) {
  const value =
    String(
      type || ""
    ).toLowerCase();

  if (
    value.includes(
      "practical"
    ) ||
    value.includes(
      "viva"
    ) ||
    value.includes(
      "lab"
    )
  ) {
    return "bg-tertiary-container text-on-tertiary";
  }

  if (
    value.includes(
      "semester"
    ) ||
    value.includes(
      "final"
    )
  ) {
    return "bg-error-container text-on-error-container";
  }

  return "bg-secondary-container text-on-secondary-container";
}

// =====================================================
// CALENDAR CELLS
// Monday → Sunday
// =====================================================

function buildCalendarCells(
  monthDate
) {
  const year =
    monthDate.getFullYear();

  const month =
    monthDate.getMonth();

  const firstDay =
    new Date(
      year,
      month,
      1
    );

  // JS:
  // Sun 0
  // Mon 1
  //
  // We want:
  // Mon 0 ... Sun 6

  const leadingDays =
    (
      firstDay.getDay() +
      6
    ) % 7;

  const cells = [];

  for (
    let index = 0;
    index < 42;
    index += 1
  ) {
    cells.push(
      new Date(
        year,
        month,
        1 -
          leadingDays +
          index
      )
    );
  }

  return cells;
}

// =====================================================
// EXAMS PAGE
// =====================================================

export default function ExamsPage() {
  const navigate =
    useNavigate();

  const currentUser =
    authService.getCurrentUser();

  const studentRoll =
    String(
      currentUser?.rollNumber ||
        currentUser?.studentRoll ||
        currentUser?.roll_number ||
        ""
    ).trim();

  // =====================================================
  // MAIN STATE
  // =====================================================

  const [
    exams,
    setExams,
  ] =
    useState([]);

  const [
    profile,
    setProfile,
  ] =
    useState(null);

  const [
    attendancePercentage,
    setAttendancePercentage,
  ] =
    useState(null);

  const [
    pendingTasks,
    setPendingTasks,
  ] =
    useState(null);

  const [
    classesToday,
    setClassesToday,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  // =====================================================
  // CALENDAR STATE
  // =====================================================

  const [
    calendarMonth,
    setCalendarMonth,
  ] =
    useState(() => {
      const today =
        getCampusToday();

      return new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
    });

  const [
    selectedDateKey,
    setSelectedDateKey,
  ] =
    useState("");

  // =====================================================
  // PROFILE
  // =====================================================

  const displayName =
    profile?.NAME ||
    currentUser?.name ||
    currentUser?.fullName ||
    "Student";

  const displayDepartment =
    profile?.DEPARTMENT ||
    currentUser?.department ||
    "Department unavailable";

  const displayRoll =
    profile?.STUDENT_ROLL ||
    studentRoll;

  // =====================================================
  // FETCH HELPER
  // =====================================================

  async function requestJson(
    url
  ) {
    const response =
      await fetch(
        url,
        {
          headers:
            getAuthHeaders(),
        }
      );

    if (!response.ok) {
      let message =
        `Request failed with status ${response.status}`;

      try {
        const body =
          await response.json();

        if (
          body?.error
        ) {
          message =
            body.error;
        }
      } catch {
        // Keep fallback.
      }

      throw new Error(
        message
      );
    }

    return response.json();
  }

  // =====================================================
  // LOAD REAL DATA
  // =====================================================

  useEffect(() => {
    if (!studentRoll) {
      setError(
        "Student roll number was not found. Please log in again."
      );

      setLoading(
        false
      );

      return;
    }

    async function loadPage() {
      try {
        setLoading(
          true
        );

        setError(
          ""
        );

        const results =
          await Promise.allSettled(
            [
              requestJson(
                `${API_URL}/api/exams/${encodeURIComponent(
                  studentRoll
                )}`
              ),

              requestJson(
                `${API_URL}/api/students/${encodeURIComponent(
                  studentRoll
                )}`
              ),

              requestJson(
                `${API_URL}/api/attendance/${encodeURIComponent(
                  studentRoll
                )}`
              ),

              requestJson(
                `${API_URL}/api/assignments/${encodeURIComponent(
                  studentRoll
                )}`
              ),

              requestJson(
                `${API_URL}/api/timetable/${encodeURIComponent(
                  studentRoll
                )}`
              ),
            ]
          );

        // =============================================
        // EXAMS — REQUIRED
        // =============================================

        const examResult =
          results[0];

        if (
          examResult.status !==
          "fulfilled"
        ) {
          throw new Error(
            "Failed to load exams."
          );
        }

        if (
          !Array.isArray(
            examResult.value
          )
        ) {
          throw new Error(
            "Invalid exam data received."
          );
        }

        const formatted =
          examResult.value
            .map(
              (item) => {
                const dateObject =
                  parseExamDate(
                    item.EXAM_DATE ??
                      item.exam_date
                  );

                const daysLeft =
                  calculateDaysLeft(
                    dateObject
                  );

                const startTime =
                  formatTime(
                    item.START_TIME ??
                      item.start_time
                  );

                const endTime =
                  formatTime(
                    item.END_TIME ??
                      item.end_time
                  );

                const rawRoom =
                  String(
                    item.ROOM ??
                      item.room ??
                      ""
                  ).trim();

                const syllabusValue =
                  String(
                    item.SYLLABUS_SCOPE ??
                      item.SYLLABUS ??
                      item.syllabus_scope ??
                      item.syllabus ??
                      ""
                  ).trim();

                const examType =
                  String(
                    item.EXAM_TYPE ??
                      item.exam_type ??
                      "Examination"
                  ).trim();

                return {
                  id:
                    item.ID ??
                    item.id,

                  course:
                    item.SUBJECT_NAME ??
                    item.subject_name ??
                    item.SUBJECT_CODE ??
                    item.subject_code ??
                    "Unknown Subject",

                  code:
                    item.SUBJECT_CODE ??
                    item.subject_code ??
                    "",

                  faculty:
                    item.FACULTY_NAME ??
                    item.faculty_name ??
                    "Faculty not assigned",

                  dateObject,

                  dateKey:
                    dateKeyFromDate(
                      dateObject
                    ),

                  date:
                    formatExamDate(
                      dateObject
                    ),

                  startTime,

                  endTime,

                  time:
                    `${startTime} – ${endTime}`,

                  room:
                    rawRoom ||
                    "Room not assigned",

                  roomAssigned:
                    Boolean(
                      rawRoom
                    ),

                  type:
                    examType,

                  syllabus:
                    syllabusValue ||
                    "Syllabus scope not added yet.",

                  daysLeft,

                  status:
                    daysLeft !==
                      null &&
                    daysLeft >=
                      0
                      ? "Upcoming"
                      : "Completed",

                  countdown:
                    daysLeft ===
                      null
                      ? "Date unavailable"
                      : daysLeft ===
                        0
                      ? "Today"
                      : daysLeft ===
                        1
                      ? "in 1 day"
                      : daysLeft >
                        1
                      ? `in ${daysLeft} days`
                      : "Completed",

                  badgeColor:
                    getBadgeColor(
                      examType
                    ),
                };
              }
            )
            .sort(
              (
                a,
                b
              ) => {
                const aUpcoming =
                  a.daysLeft !==
                    null &&
                  a.daysLeft >=
                    0;

                const bUpcoming =
                  b.daysLeft !==
                    null &&
                  b.daysLeft >=
                    0;

                if (
                  aUpcoming &&
                  !bUpcoming
                ) {
                  return -1;
                }

                if (
                  !aUpcoming &&
                  bUpcoming
                ) {
                  return 1;
                }

                if (
                  !a.dateObject
                ) {
                  return 1;
                }

                if (
                  !b.dateObject
                ) {
                  return -1;
                }

                if (
                  aUpcoming
                ) {
                  return (
                    a.dateObject -
                    b.dateObject
                  );
                }

                return (
                  b.dateObject -
                  a.dateObject
                );
              }
            );

        setExams(
          formatted
        );

        const firstUpcoming =
          formatted.find(
            (exam) =>
              exam.status ===
              "Upcoming"
          );

        if (
          firstUpcoming
            ?.dateObject
        ) {
          setCalendarMonth(
            new Date(
              firstUpcoming
                .dateObject
                .getFullYear(),

              firstUpcoming
                .dateObject
                .getMonth(),

              1
            )
          );

          setSelectedDateKey(
            firstUpcoming
              .dateKey
          );
        }

        // =============================================
        // PROFILE
        // =============================================

        if (
          results[1].status ===
          "fulfilled"
        ) {
          setProfile(
            results[1].value
          );
        }

        // =============================================
        // ATTENDANCE
        // =============================================

        if (
          results[2].status ===
            "fulfilled" &&
          Array.isArray(
            results[2].value
          )
        ) {
          let attended = 0;
          let total = 0;

          results[2].value.forEach(
            (row) => {
              attended +=
                Number(
                  row.ATTENDED_CLASSES ??
                    row.attended_classes
                ) || 0;

              total +=
                Number(
                  row.TOTAL_CLASSES ??
                    row.total_classes
                ) || 0;
            }
          );

          if (
            total > 0
          ) {
            setAttendancePercentage(
              Number(
                (
                  (
                    attended /
                    total
                  ) *
                  100
                ).toFixed(
                  1
                )
              )
            );
          }
        }

        // =============================================
        // ASSIGNMENTS
        // =============================================

        if (
          results[3].status ===
            "fulfilled" &&
          Array.isArray(
            results[3].value
          )
        ) {
          const pending =
            results[3].value.filter(
              (assignment) => {
                const status =
                  String(
                    assignment.STATUS ??
                      assignment.status ??
                      "pending"
                  )
                    .trim()
                    .toLowerCase();

                return (
                  status ===
                  "pending"
                );
              }
            ).length;

          setPendingTasks(
            pending
          );
        }

        // =============================================
        // CLASSES TODAY
        // =============================================

        if (
          results[4].status ===
            "fulfilled" &&
          Array.isArray(
            results[4].value
          )
        ) {
          const today =
            getCampusToday();

          const weekday =
            today
              .toLocaleDateString(
                "en-US",
                {
                  weekday:
                    "long",
                }
              )
              .toLowerCase();

          const count =
            results[4].value.filter(
              (row) =>
                String(
                  row.DAY_OF_WEEK ??
                    row.day_of_week ??
                    ""
                )
                  .trim()
                  .toLowerCase() ===
                weekday
            ).length;

          setClassesToday(
            count
          );
        }
      } catch (err) {
        console.error(
          "Exam page loading error:",
          err
        );

        setError(
          err.message ||
            "Unable to load examination schedule."
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    loadPage();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    studentRoll,
  ]);

  // =====================================================
  // UPCOMING EXAMS
  // =====================================================

  const upcomingExams =
    useMemo(
      () =>
        exams.filter(
          (exam) =>
            exam.status ===
            "Upcoming"
        ),
      [exams]
    );

  const nextExam =
    upcomingExams[0] ||
    null;

  // =====================================================
  // REAL HERO METRICS
  // =====================================================

  const uniqueRooms =
    useMemo(() => {
      return new Set(
        upcomingExams
          .filter(
            (exam) =>
              exam.roomAssigned
          )
          .map(
            (exam) =>
              exam.room
          )
      ).size;
    }, [
      upcomingExams,
    ]);

  const uniqueSubjects =
    useMemo(() => {
      return new Set(
        upcomingExams
          .map(
            (exam) =>
              exam.code ||
              exam.course
          )
          .filter(Boolean)
      ).size;
    }, [
      upcomingExams,
    ]);

  // =====================================================
  // GROUP EXAMS BY DATE
  // =====================================================

  const examsByDate =
    useMemo(() => {
      const grouped = {};

      exams.forEach(
        (exam) => {
          if (
            !exam.dateKey
          ) {
            return;
          }

          if (
            !grouped[
              exam.dateKey
            ]
          ) {
            grouped[
              exam.dateKey
            ] = [];
          }

          grouped[
            exam.dateKey
          ].push(
            exam
          );
        }
      );

      return grouped;
    }, [
      exams,
    ]);

  // =====================================================
  // CALENDAR
  // =====================================================

  const calendarCells =
    useMemo(
      () =>
        buildCalendarCells(
          calendarMonth
        ),
      [
        calendarMonth,
      ]
    );

  const selectedExams =
    selectedDateKey
      ? examsByDate[
          selectedDateKey
        ] || []
      : [];

  const selectedDate =
    selectedDateKey
      ? parseExamDate(
          selectedDateKey
        )
      : null;

  const today =
    getCampusToday();

  const todayKey =
    dateKeyFromDate(
      today
    );

  // =====================================================
  // CALENDAR NAVIGATION
  // =====================================================

  function goPreviousMonth() {
    setCalendarMonth(
      (previous) =>
        new Date(
          previous.getFullYear(),
          previous.getMonth() -
            1,
          1
        )
    );

    setSelectedDateKey(
      ""
    );
  }

  function goNextMonth() {
    setCalendarMonth(
      (previous) =>
        new Date(
          previous.getFullYear(),
          previous.getMonth() +
            1,
          1
        )
    );

    setSelectedDateKey(
      ""
    );
  }

  function goToday() {
    const campusToday =
      getCampusToday();

    setCalendarMonth(
      new Date(
        campusToday.getFullYear(),
        campusToday.getMonth(),
        1
      )
    );

    setSelectedDateKey(
      dateKeyFromDate(
        campusToday
      )
    );
  }

  function handleDateClick(
    date
  ) {
    const key =
      dateKeyFromDate(
        date
      );

    if (
      date.getMonth() !==
        calendarMonth.getMonth() ||
      date.getFullYear() !==
        calendarMonth.getFullYear()
    ) {
      setCalendarMonth(
        new Date(
          date.getFullYear(),
          date.getMonth(),
          1
        )
      );
    }

    setSelectedDateKey(
      key
    );
  }

  function scrollToExam(
    examId
  ) {
    const element =
      document.getElementById(
        `exam-${examId}`
      );

    if (element) {
      element.scrollIntoView(
        {
          behavior:
            "smooth",

          block:
            "center",
        }
      );
    }
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  function handleLogout() {
    authService.logout();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">

        <div className="text-center">

          <span className="material-symbols-outlined text-5xl text-primary animate-pulse">
            event_note
          </span>

          <p className="mt-3 text-on-surface-variant">
            Loading examination schedule...
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">

        <div className="text-center max-w-md">

          <span className="material-symbols-outlined text-5xl text-error">
            error
          </span>

          <h2 className="text-xl font-bold text-error mt-3">
            Unable to Load Exams
          </h2>

          <p className="text-on-surface-variant mt-2">
            {error}
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="min-h-screen bg-background text-on-background flex font-body-md">

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      <aside className="hidden lg:flex w-[280px] shrink-0 h-screen sticky top-0 bg-surface border-r border-outline-variant flex-col">

        {/* BRAND */}

        <div className="px-md pt-md pb-sm">

          <div className="flex items-center gap-2 text-primary">

            <span className="material-symbols-outlined text-[28px]">
              school
            </span>

            <span className="font-headline-lg-mobile font-bold">
              CampusCopilot
            </span>

          </div>

        </div>

        {/* PROFILE */}

        <Link
          to="/profile"
          className="px-md py-md hover:bg-surface-container-low transition-colors"
        >

          <div className="flex items-center gap-sm">

            <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0">

              {getInitials(
                displayName
              )}

            </div>

            <div className="min-w-0">

              <div className="font-title-md font-semibold text-on-surface">
                {displayName}
              </div>

              <div className="font-body-sm text-on-surface-variant leading-5">
                {displayDepartment}
              </div>

              <div className="font-label-caps text-outline mt-0.5">
                ID: {displayRoll}
              </div>

            </div>

          </div>

        </Link>

        {/* NAVIGATION */}

        <nav className="px-2 flex flex-col gap-1">

          {NAV_ITEMS.map(
            (item) => {
              const active =
                item.path ===
                "/exams";

              return (
                <Link
                  key={
                    item.path
                  }
                  to={
                    item.path
                  }
                  className={
                    active
                      ? "bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-semibold flex items-center gap-sm"
                      : "text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
                  }
                >

                  <span
                    className="material-symbols-outlined"
                    style={
                      active
                        ? {
                            fontVariationSettings:
                              "'FILL' 1",
                          }
                        : undefined
                    }
                  >
                    {item.icon}
                  </span>

                  {item.label}

                </Link>
              );
            }
          )}

        </nav>

        {/* =================================================
            TODAY SUMMARY
        ================================================= */}

        <div className="mx-4 mt-md rounded-xl border border-outline-variant bg-surface-container-lowest p-sm">

          <div className="font-label-caps text-outline mb-sm">
            TODAY SUMMARY
          </div>

          <div className="space-y-3">

            {/* ATTENDANCE */}

            <Link
              to="/attendance"
              className="flex items-center justify-between gap-2"
            >

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-secondary-container text-secondary flex items-center justify-center">

                  <span className="material-symbols-outlined text-[16px]">
                    monitoring
                  </span>

                </div>

                <span className="font-body-sm text-on-surface">
                  Attendance
                </span>

              </div>

              <span className="font-body-sm font-bold text-secondary">

                {attendancePercentage !==
                null
                  ? `${attendancePercentage}%`
                  : "--"}

              </span>

            </Link>

            {/* TASKS */}

            <Link
              to="/assignments"
              className="flex items-center justify-between gap-2"
            >

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">

                  <span className="material-symbols-outlined text-[16px]">
                    assignment
                  </span>

                </div>

                <span className="font-body-sm text-on-surface">
                  Pending Tasks
                </span>

              </div>

              <span className="font-body-sm font-bold text-error">

                {pendingTasks !==
                null
                  ? pendingTasks
                  : "--"}

              </span>

            </Link>

            {/* CLASSES */}

            <Link
              to="/timetable"
              className="flex items-center justify-between gap-2"
            >

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                  <span className="material-symbols-outlined text-[16px]">
                    school
                  </span>

                </div>

                <span className="font-body-sm text-on-surface">
                  Classes Today
                </span>

              </div>

              <span className="font-body-sm font-bold text-primary">

                {classesToday !==
                null
                  ? classesToday
                  : "--"}

              </span>

            </Link>

          </div>

        </div>

        <div className="flex-1" />

        {/* PROFILE + LOGOUT */}

        <div className="mx-2 px-2 py-sm border-t border-outline-variant">

          <Link
            to="/profile"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm"
          >

            <span className="material-symbols-outlined">
              account_circle
            </span>

            Profile

          </Link>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="w-full text-error px-4 py-2.5 rounded-xl hover:bg-error-container/20 flex items-center gap-sm text-left"
          >

            <span className="material-symbols-outlined">
              logout
            </span>

            Logout

          </button>

        </div>

      </aside>

      {/* =================================================
          MAIN AREA
      ================================================= */}

      <div className="flex-1 min-w-0">

        {/* MOBILE HEADER */}

        <header className="lg:hidden sticky top-0 z-50 h-[64px] bg-surface border-b border-outline-variant px-margin-mobile flex items-center justify-between">

          <div className="flex items-center gap-sm">

            <Link
              to="/profile"
              className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold"
            >

              {getInitials(
                displayName
              )}

            </Link>

            <span className="font-headline-lg-mobile font-bold text-primary">
              CampusCopilot
            </span>

          </div>

          <StudentNotificationBell />

        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="w-full px-margin-mobile md:px-lg py-md pb-[90px] lg:pb-lg">

          {/* =================================================
              HERO
          ================================================= */}

          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary-container to-secondary text-white min-h-[270px] px-6 md:px-8 lg:px-10 py-7 mb-lg">

            {/* DECORATION */}

            <div className="absolute -right-16 -top-24 w-[260px] h-[260px] rounded-full border-[38px] border-white/5 pointer-events-none" />

            <div className="absolute right-20 top-14 w-[150px] h-[150px] rounded-full bg-white/5 pointer-events-none" />

            <div className="absolute right-[20%] top-[42%] w-[300px] h-[300px] rounded-full border border-white/5 pointer-events-none" />

            <div className="absolute right-[15%] top-[47%] w-[240px] h-[240px] rounded-full border border-white/5 pointer-events-none" />

            {/* DOTS */}

            <div className="hidden md:grid absolute right-[17%] top-[48%] grid-cols-6 gap-2 opacity-30">

              {Array.from({
                length: 24,
              }).map(
                (
                  _,
                  index
                ) => (
                  <span
                    key={
                      index
                    }
                    className="w-1 h-1 rounded-full bg-white"
                  />
                )
              )}

            </div>

            {/* BELL */}

            <div className="hidden lg:block absolute top-5 right-5 z-20">

              <StudentNotificationBell />

            </div>

            <div className="relative z-10">

              {/* LABEL */}

              <span className="inline-flex px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wide">
                Examination Schedule
              </span>

              {/* TITLE */}

              <h1 className="mt-4 text-2xl md:text-3xl font-bold">
                Examination Schedule
              </h1>

              <p className="mt-1 text-sm md:text-base text-white/85 max-w-[700px]">
                Seating allocation, dates, syllabus scopes, and preparation guides.
              </p>

              {/* =================================================
                  HERO METRICS
              ================================================= */}

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:max-w-[850px]">

                {/* UPCOMING */}

                <div className="flex items-start gap-3">

                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">

                    <span className="material-symbols-outlined">
                      event_upcoming
                    </span>

                  </div>

                  <div>

                    <div className="text-[10px] uppercase tracking-wide text-white/70 font-semibold">
                      Upcoming Exams
                    </div>

                    <div className="text-xl font-bold mt-0.5">
                      {upcomingExams.length}
                    </div>

                    <div className="text-xs text-white/75">
                      Scheduled
                    </div>

                  </div>

                </div>

                {/* NEXT DATE */}

                <div className="flex items-start gap-3 md:border-l md:border-white/20 md:pl-5">

                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">

                    <span className="material-symbols-outlined">
                      calendar_month
                    </span>

                  </div>

                  <div>

                    <div className="text-[10px] uppercase tracking-wide text-white/70 font-semibold">
                      Next Exam Date
                    </div>

                    <div className="text-lg font-bold mt-0.5">
                      {nextExam
                        ? nextExam.date
                        : "--"}
                    </div>

                    <div className="text-xs text-white/75">
                      {nextExam
                        ? nextExam.startTime
                        : "No upcoming exam"}
                    </div>

                  </div>

                </div>

                {/* ROOMS */}

                <div className="flex items-start gap-3 md:border-l md:border-white/20 md:pl-5">

                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">

                    <span className="material-symbols-outlined">
                      location_on
                    </span>

                  </div>

                  <div>

                    <div className="text-[10px] uppercase tracking-wide text-white/70 font-semibold">
                      Exam Rooms
                    </div>

                    <div className="text-xl font-bold mt-0.5">
                      {uniqueRooms}
                    </div>

                    <div className="text-xs text-white/75">
                      Assigned
                    </div>

                  </div>

                </div>

                {/* SUBJECTS */}

                <div className="flex items-start gap-3 md:border-l md:border-white/20 md:pl-5">

                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">

                    <span className="material-symbols-outlined">
                      menu_book
                    </span>

                  </div>

                  <div>

                    <div className="text-[10px] uppercase tracking-wide text-white/70 font-semibold">
                      Subjects Scheduled
                    </div>

                    <div className="text-xl font-bold mt-0.5">
                      {uniqueSubjects}
                    </div>

                    <div className="text-xs text-white/75">
                      Subjects
                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* DAYS LEFT */}

            {nextExam && (
              <div className="absolute right-6 md:right-10 bottom-6 md:bottom-8 hidden md:flex w-[105px] h-[105px] rounded-xl bg-white/10 border border-white/25 backdrop-blur-sm flex-col items-center justify-center">

                <div className="text-3xl font-extrabold">

                  {nextExam.daysLeft ===
                  0
                    ? "0"
                    : nextExam.daysLeft}

                </div>

                <div className="text-[10px] font-bold uppercase text-white/85">

                  {nextExam.daysLeft ===
                  0
                    ? "Today"
                    : nextExam.daysLeft ===
                      1
                    ? "Day Left"
                    : "Days Left"}

                </div>

              </div>
            )}

          </section>

          {/* =================================================
              SECTION TITLE
          ================================================= */}

          <div className="mb-md">

            <h2 className="text-xl font-bold text-on-surface">
              Your Examination Schedule
            </h2>

            <p className="text-sm text-on-surface-variant mt-1">
              Review your exam details, syllabus scope, and generate study plans.
            </p>

          </div>

          {/* =================================================
              EXAMS + CALENDAR
          ================================================= */}

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.8fr)] gap-lg items-start">

            {/* =================================================
                EXAM LIST
            ================================================= */}

            <section className="space-y-md min-w-0">

              {/* NO EXAMS */}

              {exams.length ===
                0 && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">

                  <span className="material-symbols-outlined text-5xl text-outline">
                    event_available
                  </span>

                  <h3 className="font-bold text-lg text-on-surface mt-3">
                    No Exams Scheduled
                  </h3>

                  <p className="text-sm text-on-surface-variant mt-1">
                    No examination records are currently available.
                  </p>

                </div>
              )}

              {/* EXAM CARDS */}

              {exams.map(
                (exam) => {
                  const upcoming =
                    exam.status ===
                    "Upcoming";

                  return (
                    <article
                      id={`exam-${exam.id}`}
                      key={
                        exam.id
                      }
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm hover:shadow-md transition-shadow"
                    >

                      <div className="flex flex-col md:flex-row gap-md">

                        {/* DAYS LEFT BLOCK */}

                        <div
                          className={`w-full md:w-[90px] min-h-[112px] rounded-xl flex md:flex-col items-center justify-center gap-2 md:gap-0 shrink-0 text-white ${
                            upcoming
                              ? "bg-gradient-to-br from-primary to-secondary"
                              : "bg-outline"
                          }`}
                        >

                          {upcoming ? (
                            <>
                              <div className="text-3xl font-extrabold">

                                {exam.daysLeft ===
                                0
                                  ? "0"
                                  : exam.daysLeft}

                              </div>

                              <div className="text-[10px] font-bold uppercase text-white/90 md:mt-1">

                                {exam.daysLeft ===
                                0
                                  ? "Today"
                                  : exam.daysLeft ===
                                    1
                                  ? "Day Left"
                                  : "Days Left"}

                              </div>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-3xl">
                                check_circle
                              </span>

                              <div className="text-[10px] font-bold uppercase">
                                Past Exam
                              </div>
                            </>
                          )}

                        </div>

                        {/* CONTENT */}

                        <div className="flex-1 min-w-0">

                          {/* BADGES */}

                          <div className="flex flex-wrap items-center gap-2">

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${exam.badgeColor}`}
                            >
                              {exam.type}
                            </span>

                            {exam.code && (
                              <span className="text-xs text-outline font-medium">
                                {exam.code}
                              </span>
                            )}

                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                upcoming
                                  ? "bg-primary/10 text-primary"
                                  : "bg-surface-container-high text-on-surface-variant"
                              }`}
                            >
                              {exam.countdown}
                            </span>

                          </div>

                          {/* TITLE */}

                          <h3 className="mt-2 text-lg md:text-xl font-bold text-on-surface">
                            {exam.course}
                          </h3>

                          {/* DETAILS */}

                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm text-on-surface-variant">

                            {/* DATE */}

                            <div className="flex items-center gap-2">

                              <span className="material-symbols-outlined text-[19px] text-secondary">
                                calendar_month
                              </span>

                              <span>
                                {exam.date}
                              </span>

                            </div>

                            {/* TIME */}

                            <div className="flex items-center gap-2">

                              <span className="material-symbols-outlined text-[19px] text-primary">
                                schedule
                              </span>

                              <span>
                                {exam.time}
                              </span>

                            </div>

                            {/* ROOM */}

                            <div className="flex items-center gap-2">

                              <span className="material-symbols-outlined text-[19px] text-primary">
                                location_on
                              </span>

                              <span>
                                {exam.room}
                              </span>

                            </div>

                            {/* FACULTY */}

                            <div className="flex items-center gap-2">

                              <span className="material-symbols-outlined text-[19px]">
                                person
                              </span>

                              <span>
                                {exam.faculty}
                              </span>

                            </div>

                          </div>

                          {/* SYLLABUS */}

                          <div className="mt-4 rounded-lg bg-surface-container-low border border-outline-variant px-4 py-3 text-sm">

                            <div className="flex items-start gap-2">

                              <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">
                                description
                              </span>

                              <div>

                                <span className="font-semibold text-on-surface">
                                  Syllabus Scope:{" "}
                                </span>

                                <span className="text-on-surface-variant">
                                  {exam.syllabus}
                                </span>

                              </div>

                            </div>

                          </div>

                        </div>

                        {/* STUDY PLAN */}

                        <div className="md:self-start shrink-0">

                          <Link
                            to={`/ai-chat?subject=${encodeURIComponent(
                              exam.course
                            )}`}
                            className="h-10 px-4 rounded-lg bg-tertiary text-on-tertiary font-semibold text-xs inline-flex items-center justify-center gap-2 hover:bg-tertiary-container transition-colors"
                          >

                            <span className="material-symbols-outlined text-[18px]">
                              smart_toy
                            </span>

                            Generate Study Plan

                          </Link>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </section>

            {/* =================================================
                EXAM CALENDAR
            ================================================= */}

            <aside className="xl:sticky xl:top-md">

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">

                {/* HEADER */}

                <div className="flex items-center justify-between gap-3">

                  <div className="flex items-center gap-2">

                    <span className="material-symbols-outlined text-primary">
                      calendar_month
                    </span>

                    <h3 className="font-title-md font-bold text-on-surface">
                      Exam Calendar
                    </h3>

                  </div>

                  <button
                    type="button"
                    onClick={
                      goToday
                    }
                    className="text-xs font-semibold text-primary border border-outline-variant rounded-lg px-3 py-2 hover:bg-primary/5"
                  >
                    Today
                  </button>

                </div>

                {/* MONTH CONTROL */}

                <div className="mt-md flex items-center justify-between">

                  <button
                    type="button"
                    onClick={
                      goPreviousMonth
                    }
                    aria-label="Previous month"
                    className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container-low"
                  >

                    <span className="material-symbols-outlined text-[20px]">
                      chevron_left
                    </span>

                  </button>

                  <div className="font-title-md font-semibold text-on-surface">
                    {formatMonthYear(
                      calendarMonth
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={
                      goNextMonth
                    }
                    aria-label="Next month"
                    className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container-low"
                  >

                    <span className="material-symbols-outlined text-[20px]">
                      chevron_right
                    </span>

                  </button>

                </div>

                {/* WEEKDAY LABELS */}

                <div className="grid grid-cols-7 mt-md">

                  {[
                    "MON",
                    "TUE",
                    "WED",
                    "THU",
                    "FRI",
                    "SAT",
                    "SUN",
                  ].map(
                    (day) => (
                      <div
                        key={
                          day
                        }
                        className="text-center text-[10px] font-bold text-outline py-2"
                      >
                        {day}
                      </div>
                    )
                  )}

                </div>

                {/* =================================================
                    CALENDAR GRID
                ================================================= */}

                <div className="grid grid-cols-7 gap-y-1">

                  {calendarCells.map(
                    (
                      date,
                      index
                    ) => {
                      const key =
                        dateKeyFromDate(
                          date
                        );

                      const dayExams =
                        examsByDate[
                          key
                        ] || [];

                      const hasExam =
                        dayExams.length >
                        0;

                      const selected =
                        selectedDateKey ===
                        key;

                      const isToday =
                        todayKey ===
                        key;

                      const currentMonth =
                        date.getMonth() ===
                          calendarMonth.getMonth() &&
                        date.getFullYear() ===
                          calendarMonth.getFullYear();

                      const examNames =
                        dayExams
                          .map(
                            (
                              exam
                            ) =>
                              exam.course
                          )
                          .join(", ");

                      const ariaLabel =
                        `${formatCalendarDate(
                          date
                        )}, ${
                          hasExam
                            ? `${examNames} exam`
                            : "no exam"
                        }`;

                      let circleClass =
                        "text-on-surface hover:bg-surface-container-low";

                      if (
                        !currentMonth
                      ) {
                        circleClass =
                          "text-outline/50 hover:bg-surface-container-low";
                      }

                      if (
                        hasExam &&
                        !selected
                      ) {
                        circleClass =
                          "bg-primary text-white font-bold shadow-sm";
                      }

                      if (
                        selected
                      ) {
                        circleClass =
                          "bg-secondary text-white font-bold shadow-sm ring-2 ring-secondary/20";
                      }

                      if (
                        isToday &&
                        !hasExam &&
                        !selected
                      ) {
                        circleClass =
                          "text-primary font-bold ring-1 ring-primary";
                      }

                      return (
                        <button
                          key={`${key}-${index}`}
                          type="button"
                          aria-label={
                            ariaLabel
                          }
                          onClick={() =>
                            handleDateClick(
                              date
                            )
                          }
                          className="relative min-h-[46px] flex flex-col items-center justify-center"
                        >

                          <span
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${circleClass}`}
                          >
                            {date.getDate()}
                          </span>

                          {/* EXAM INDICATOR */}

                          {hasExam && (
                            <span className="absolute bottom-0 flex gap-[2px]">

                              {dayExams
                                .slice(
                                  0,
                                  3
                                )
                                .map(
                                  (
                                    exam
                                  ) => (
                                    <span
                                      key={
                                        exam.id
                                      }
                                      className={`w-1 h-1 rounded-full ${
                                        selected
                                          ? "bg-secondary"
                                          : "bg-primary"
                                      }`}
                                    />
                                  )
                                )}

                            </span>
                          )}

                        </button>
                      );
                    }
                  )}

                </div>

                {/* =================================================
                    SELECTED DATE POPUP
                ================================================= */}

                {selectedDateKey && (
                  <div className="relative mt-md">

                    {/* POINTER */}

                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-surface-container-lowest border-l border-t border-outline-variant rotate-45" />

                    <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl p-sm shadow-md">

                      <div className="text-xs font-semibold text-outline mb-2">

                        {selectedDate
                          ? formatCalendarDate(
                              selectedDate
                            )
                          : selectedDateKey}

                      </div>

                      {/* NO EXAMS */}

                      {selectedExams.length ===
                        0 && (
                        <div className="py-3 text-center">

                          <span className="material-symbols-outlined text-3xl text-outline">
                            event_busy
                          </span>

                          <p className="text-sm text-on-surface-variant mt-1">
                            No exams scheduled for this date.
                          </p>

                        </div>
                      )}

                      {/* EXAMS */}

                      <div className="space-y-3">

                        {selectedExams.map(
                          (
                            exam
                          ) => (
                            <div
                              key={
                                exam.id
                              }
                              className="rounded-lg bg-surface-container-low p-3"
                            >

                              <div className="flex items-center gap-2 flex-wrap">

                                <span className="w-2 h-2 rounded-full bg-primary" />

                                <span className="font-title-md text-sm font-bold text-on-surface">
                                  {exam.course}
                                </span>

                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2">

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${exam.badgeColor}`}
                                >
                                  {exam.type}
                                </span>

                                {exam.code && (
                                  <span className="text-[11px] text-outline font-medium">
                                    {exam.code}
                                  </span>
                                )}

                              </div>

                              <div className="mt-3 space-y-2 text-xs text-on-surface-variant">

                                <div className="flex items-center gap-2">

                                  <span className="material-symbols-outlined text-[17px]">
                                    schedule
                                  </span>

                                  {exam.time}

                                </div>

                                <div className="flex items-center gap-2">

                                  <span className="material-symbols-outlined text-[17px]">
                                    location_on
                                  </span>

                                  {exam.room}

                                </div>

                                <div className="flex items-center gap-2">

                                  <span className="material-symbols-outlined text-[17px]">
                                    person
                                  </span>

                                  {exam.faculty}

                                </div>

                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  scrollToExam(
                                    exam.id
                                  )
                                }
                                className="mt-3 w-full h-9 rounded-lg bg-primary/10 text-primary font-semibold text-xs hover:bg-primary/15"
                              >
                                View Details
                              </button>

                            </div>
                          )
                        )}

                      </div>

                    </div>

                  </div>
                )}

                {/* =================================================
                    CALENDAR LEGEND
                ================================================= */}

                <div className="mt-md pt-sm border-t border-outline-variant flex flex-wrap gap-4">

                  <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">

                    <span className="w-2 h-2 rounded-full bg-primary" />

                    Exam Date

                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">

                    <span className="w-2 h-2 rounded-full bg-secondary" />

                    Selected

                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">

                    <span className="w-3 h-3 rounded-full border border-primary" />

                    Today

                  </div>

                </div>

              </div>

            </aside>

          </div>

        </main>

      </div>

      {/* =================================================
          MOBILE BOTTOM NAVIGATION
      ================================================= */}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-[64px] bg-surface border-t border-outline-variant">

        <div className="h-full flex items-center justify-around">

          <Link
            to="/dashboard"
            className="flex flex-col items-center text-on-surface-variant"
          >

            <span className="material-symbols-outlined">
              dashboard
            </span>

            <span className="text-[10px]">
              Home
            </span>

          </Link>

          <Link
            to="/timetable"
            className="flex flex-col items-center text-on-surface-variant"
          >

            <span className="material-symbols-outlined">
              calendar_month
            </span>

            <span className="text-[10px]">
              Timetable
            </span>

          </Link>

          <Link
            to="/attendance"
            className="flex flex-col items-center text-on-surface-variant"
          >

            <span className="material-symbols-outlined">
              analytics
            </span>

            <span className="text-[10px]">
              Attendance
            </span>

          </Link>

          <Link
            to="/exams"
            className="flex flex-col items-center text-primary font-semibold"
          >

            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              description
            </span>

            <span className="text-[10px]">
              Exams
            </span>

          </Link>

          <Link
            to="/profile"
            className="flex flex-col items-center text-on-surface-variant"
          >

            <span className="material-symbols-outlined">
              account_circle
            </span>

            <span className="text-[10px]">
              Profile
            </span>

          </Link>

        </div>

      </nav>

    </div>
  );
}