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

import StudentPageHero from "../../components/student/StudentPageHero";
import StudentNotificationBell from "./StudentNotificationBell";

const API_URL = "http://localhost:5000";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const START_HOUR = 8;
const END_HOUR = 18;
const HOUR_HEIGHT = 72;

const SUBJECT_THEMES = [
  {
    bg: "bg-blue-50",
    border: "border-blue-200",
    accent: "bg-primary",
    text: "text-primary",
    icon: "database",
  },
  {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    accent: "bg-secondary",
    text: "text-secondary",
    icon: "lan",
  },
  {
    bg: "bg-violet-50",
    border: "border-violet-200",
    accent: "bg-tertiary",
    text: "text-tertiary",
    icon: "data_object",
  },
  {
    bg: "bg-amber-50",
    border: "border-amber-200",
    accent: "bg-amber-500",
    text: "text-amber-800",
    icon: "engineering",
  },
  {
    bg: "bg-rose-50",
    border: "border-rose-200",
    accent: "bg-rose-500",
    text: "text-rose-800",
    icon: "memory",
  },
];

// =====================================================
// DATE HELPERS
// =====================================================

function startOfDay(date) {
  const copy = new Date(date);

  copy.setHours(0, 0, 0, 0);

  return copy;
}

function getMonday(date) {
  const copy = startOfDay(date);

  const day = copy.getDay();

  const difference =
    day === 0 ? -6 : 1 - day;

  copy.setDate(
    copy.getDate() + difference
  );

  return copy;
}

function addDays(date, amount) {
  const copy = new Date(date);

  copy.setDate(
    copy.getDate() + amount
  );

  return copy;
}

function sameDate(first, second) {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

function formatDayDate(date) {
  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
    }
  );
}

// =====================================================
// TIME HELPERS
// =====================================================

function timeToMinutes(value) {
  if (!value) {
    return null;
  }

  const parts = String(value)
    .trim()
    .split(":");

  if (parts.length < 2) {
    return null;
  }

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  const minutes =
    timeToMinutes(value);

  if (minutes === null) {
    return value;
  }

  let hour = Math.floor(
    minutes / 60
  );

  const minute =
    minutes % 60;

  const period =
    hour >= 12 ? "PM" : "AM";

  hour = hour % 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${String(
    minute
  ).padStart(2, "0")} ${period}`;
}

// =====================================================
// INITIALS
// =====================================================

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "ST";
  }

  return parts
    .slice(0, 2)
    .map((part) =>
      part[0]?.toUpperCase()
    )
    .join("");
}

// =====================================================
// DAY INDEX
// =====================================================

function getDayIndex(day) {
  return DAYS.findIndex(
    (item) =>
      item.toLowerCase() ===
      String(day || "")
        .trim()
        .toLowerCase()
  );
}

// =====================================================
// CALENDAR CELLS
// =====================================================

function buildCalendar(monthDate) {
  const year =
    monthDate.getFullYear();

  const month =
    monthDate.getMonth();

  const firstDay = new Date(
    year,
    month,
    1
  );

  const firstWeekday =
    firstDay.getDay();

  const mondayOffset =
    firstWeekday === 0
      ? 6
      : firstWeekday - 1;

  const start = new Date(
    year,
    month,
    1 - mondayOffset
  );

  const cells = [];

  for (
    let index = 0;
    index < 42;
    index += 1
  ) {
    const date = addDays(
      start,
      index
    );

    cells.push({
      date,

      currentMonth:
        date.getMonth() ===
        month,
    });
  }

  return cells;
}

// =====================================================
// COMPONENT
// =====================================================

export default function TimetablePage() {
  const navigate =
    useNavigate();

  const currentUser =
    authService.getCurrentUser();

  const studentName =
    currentUser?.name ||
    "Student";

  const department =
    currentUser?.department ||
    "Department unavailable";

  const studentRoll =
    String(
      currentUser?.rollNumber ||
        currentUser?.studentRoll ||
        currentUser?.roll_number ||
        ""
    ).trim();

  const now = new Date();

  const currentDayName =
    now.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
      }
    );

  const [
    selectedDay,
    setSelectedDay,
  ] = useState(
    DAYS.includes(currentDayName)
      ? currentDayName
      : "Monday"
  );

  const [
    weekStart,
    setWeekStart,
  ] = useState(
    getMonday(new Date())
  );

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    )
  );

  const [
    timetableRows,
    setTimetableRows,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    attendancePercentage,
    setAttendancePercentage,
  ] = useState(null);

  const [
    pendingAssignments,
    setPendingAssignments,
  ] = useState(0);

  // =====================================================
  // AUTH HEADER
  // =====================================================

  function authHeaders() {
    const token =
      localStorage.getItem(
        "campus_token"
      );

    return token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {};
  }

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    if (!studentRoll) {
      setError(
        "Student roll number is unavailable. Please log in again."
      );

      setLoading(false);

      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          timetableResult,
          attendanceResult,
          assignmentResult,
        ] =
          await Promise.allSettled([
            fetch(
              `${API_URL}/api/timetable/${encodeURIComponent(
                studentRoll
              )}`,
              {
                headers:
                  authHeaders(),
              }
            ).then(
              async (response) => {
                if (!response.ok) {
                  throw new Error(
                    "Failed to load timetable"
                  );
                }

                return response.json();
              }
            ),

            fetch(
              `${API_URL}/api/attendance/${encodeURIComponent(
                studentRoll
              )}`,
              {
                headers:
                  authHeaders(),
              }
            ).then(
              async (response) => {
                if (!response.ok) {
                  return null;
                }

                return response.json();
              }
            ),

            fetch(
              `${API_URL}/api/assignments/${encodeURIComponent(
                studentRoll
              )}`,
              {
                headers:
                  authHeaders(),
              }
            ).then(
              async (response) => {
                if (!response.ok) {
                  return null;
                }

                return response.json();
              }
            ),
          ]);

        // ===============================================
        // TIMETABLE
        // ===============================================

        if (
          timetableResult.status !==
          "fulfilled"
        ) {
          throw timetableResult.reason;
        }

        const timetable =
          timetableResult.value;

        if (
          !Array.isArray(
            timetable
          )
        ) {
          throw new Error(
            "Invalid timetable data received"
          );
        }

        const normalized =
          timetable.map(
            (item, index) => {
              const subjectName =
                item.SUBJECT_NAME ||
                item.subject_name ||
                item.SUBJECT_CODE ||
                item.subject_code ||
                "Class";

              const subjectCode =
                item.SUBJECT_CODE ||
                item.subject_code ||
                "";

              const startTime =
                item.START_TIME ||
                item.start_time ||
                "";

              const endTime =
                item.END_TIME ||
                item.end_time ||
                "";

              const day =
                item.DAY_OF_WEEK ||
                item.day_of_week ||
                "";

              const startMinutes =
                timeToMinutes(
                  startTime
                );

              const endMinutes =
                timeToMinutes(
                  endTime
                );

              const themeIndex =
                Math.abs(
                  String(subjectCode)
                    .split("")
                    .reduce(
                      (
                        total,
                        character
                      ) =>
                        total +
                        character.charCodeAt(
                          0
                        ),
                      0
                    )
                ) %
                SUBJECT_THEMES.length;

              return {
                id:
                  item.ID ||
                  item.id ||
                  index,

                subjectName,

                subjectCode,

                day,

                startTime,

                endTime,

                startMinutes,

                endMinutes,

                room:
                  item.ROOM ||
                  item.room ||
                  "Room not assigned",

                faculty:
                  item.FACULTY_NAME ||
                  item.faculty_name ||
                  "Faculty not assigned",

                theme:
                  SUBJECT_THEMES[
                    themeIndex
                  ],
              };
            }
          );

        setTimetableRows(
          normalized
        );

        // ===============================================
        // ATTENDANCE
        // ===============================================

        if (
          attendanceResult.status ===
            "fulfilled" &&
          Array.isArray(
            attendanceResult.value
          )
        ) {
          let attended = 0;
          let total = 0;

          attendanceResult.value.forEach(
            (row) => {
              attended +=
                Number(
                  row.ATTENDED_CLASSES
                ) || 0;

              total +=
                Number(
                  row.TOTAL_CLASSES
                ) || 0;
            }
          );

          if (total > 0) {
            setAttendancePercentage(
              Number(
                (
                  (attended /
                    total) *
                  100
                ).toFixed(1)
              )
            );
          }
        }

        // ===============================================
        // ASSIGNMENTS
        // ===============================================

        if (
          assignmentResult.status ===
            "fulfilled" &&
          assignmentResult.value
        ) {
          const assignments =
            Array.isArray(
              assignmentResult.value
            )
              ? assignmentResult.value
              : assignmentResult.value
                  .assignments;

          if (
            Array.isArray(
              assignments
            )
          ) {
            const pending =
              assignments.filter(
                (assignment) =>
                  String(
                    assignment.STATUS ||
                      assignment.status ||
                      ""
                  )
                    .trim()
                    .toLowerCase() ===
                  "pending"
              );

            setPendingAssignments(
              pending.length
            );
          }
        }
      } catch (err) {
        console.error(
          "Timetable loading error:",
          err
        );

        setError(
          err.message ||
            "Unable to load timetable."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [studentRoll]);

  // =====================================================
  // WEEK DATES
  // =====================================================

  const weekDates =
    useMemo(
      () =>
        DAYS.map(
          (day, index) => ({
            day,

            date:
              addDays(
                weekStart,
                index
              ),
          })
        ),
      [weekStart]
    );

  // =====================================================
  // CLASSES BY DAY
  // =====================================================

  const scheduleByDay =
    useMemo(() => {
      const grouped = {};

      DAYS.forEach((day) => {
        grouped[day] = [];
      });

      timetableRows.forEach(
        (row) => {
          const day =
            DAYS.find(
              (item) =>
                item.toLowerCase() ===
                String(row.day)
                  .trim()
                  .toLowerCase()
            );

          if (day) {
            grouped[day].push(
              row
            );
          }
        }
      );

      DAYS.forEach((day) => {
        grouped[day].sort(
          (first, second) =>
            (first.startMinutes ||
              0) -
            (second.startMinutes ||
              0)
        );
      });

      return grouped;
    }, [timetableRows]);

  // =====================================================
  // SELECTED DAY
  // =====================================================

  const selectedDate =
    weekDates.find(
      (item) =>
        item.day ===
        selectedDay
    )?.date || weekStart;

  // =====================================================
  // TODAY CLASSES
  // =====================================================

  const todaySchedule =
    scheduleByDay[
      currentDayName
    ] || [];

  // =====================================================
  // UPCOMING CLASSES
  // =====================================================

  const upcomingClasses =
    useMemo(() => {
      const current =
        new Date();

      const currentMonday =
        getMonday(current);

      const results = [];

      timetableRows.forEach(
        (row) => {
          const dayIndex =
            getDayIndex(row.day);

          if (
            dayIndex < 0 ||
            row.startMinutes ===
              null
          ) {
            return;
          }

          let occurrence =
            addDays(
              currentMonday,
              dayIndex
            );

          occurrence.setHours(
            Math.floor(
              row.startMinutes /
                60
            ),

            row.startMinutes %
              60,

            0,
            0
          );

          if (
            occurrence <
            current
          ) {
            occurrence =
              addDays(
                occurrence,
                7
              );
          }

          results.push({
            ...row,
            occurrence,
          });
        }
      );

      return results
        .sort(
          (
            first,
            second
          ) =>
            first.occurrence -
            second.occurrence
        )
        .slice(0, 4);
    }, [timetableRows]);

  // =====================================================
  // HOURS
  // =====================================================

  const hours =
    useMemo(() => {
      const list = [];

      for (
        let hour =
          START_HOUR;
        hour <= END_HOUR;
        hour += 1
      ) {
        list.push(hour);
      }

      return list;
    }, []);

  const timelineHeight =
    (END_HOUR -
      START_HOUR) *
    HOUR_HEIGHT;

  // =====================================================
  // CALENDAR
  // =====================================================

  const calendarCells =
    useMemo(
      () =>
        buildCalendar(
          calendarMonth
        ),
      [calendarMonth]
    );

  // =====================================================
  // SELECT CALENDAR DATE
  // =====================================================

  function selectCalendarDate(
    date
  ) {
    const name =
      date.toLocaleDateString(
        "en-US",
        {
          weekday: "long",
        }
      );

    if (
      DAYS.includes(name)
    ) {
      setSelectedDay(name);
    }

    setWeekStart(
      getMonday(date)
    );
  }

  // =====================================================
  // TODAY BUTTON
  // =====================================================

  function goToToday() {
    const today =
      new Date();

    const name =
      today.toLocaleDateString(
        "en-US",
        {
          weekday: "long",
        }
      );

    setWeekStart(
      getMonday(today)
    );

    setCalendarMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    if (
      DAYS.includes(name)
    ) {
      setSelectedDay(name);
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
            calendar_month
          </span>

          <p className="font-body-md text-on-surface-variant mt-3">
            Loading timetable...
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

          <h2 className="font-title-md font-bold text-error mt-3">
            Unable to Load Timetable
          </h2>

          <p className="font-body-sm text-on-surface-variant mt-2">
            {error}
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md flex">

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      <aside className="hidden lg:flex w-[280px] shrink-0 h-screen sticky top-0 bg-surface border-r border-outline-variant flex-col">

        <div className="px-md pt-md pb-sm">
          <span className="font-headline-lg-mobile font-bold text-primary">
            CampusCopilot
          </span>
        </div>

        <Link
          to="/profile"
          className="px-md py-md hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center gap-sm">

            <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0">
              {getInitials(
                studentName
              )}
            </div>

            <div className="min-w-0">

              <div className="font-title-md font-semibold text-on-surface">
                {studentName}
              </div>

              <div className="font-body-sm text-on-surface-variant leading-5">
                {department}
              </div>

              <div className="font-label-caps text-outline mt-0.5">
                ID:{" "}
                {studentRoll}
              </div>

            </div>

          </div>
        </Link>

        <div className="px-2 flex flex-col gap-1">

          <Link
            to="/dashboard"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >
            <span className="material-symbols-outlined">
              dashboard
            </span>

            Home
          </Link>

          <Link
            to="/timetable"
            className="bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-semibold flex items-center gap-sm"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              calendar_month
            </span>

            Timetable
          </Link>

          <Link
            to="/attendance"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >
            <span className="material-symbols-outlined">
              analytics
            </span>

            Attendance
          </Link>

          <Link
            to="/assignments"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >
            <span className="material-symbols-outlined">
              assignment
            </span>

            Assignments
          </Link>

          <Link
            to="/exams"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >
            <span className="material-symbols-outlined">
              description
            </span>

            Exams
          </Link>

          <Link
            to="/notices"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >
            <span className="material-symbols-outlined">
              campaign
            </span>

            Notices
          </Link>

          <Link
            to="/ai-analytics"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >
            <span className="material-symbols-outlined">
              insights
            </span>

            AI Analytics
          </Link>

          <Link
            to="/resources"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >
            <span className="material-symbols-outlined">
              folder_open
            </span>

            Resources
          </Link>

          <Link
            to="/student-id"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >
            <span className="material-symbols-outlined">
              badge
            </span>

            Digital ID
          </Link>

        </div>

        {/* TODAY SUMMARY */}

        <div className="mx-4 mt-md border border-outline-variant rounded-xl bg-surface-container-lowest p-sm">

          <div className="font-label-caps text-outline mb-sm">
            TODAY SUMMARY
          </div>

          <div className="space-y-3">

            <Link
              to="/attendance"
              className="flex items-center justify-between"
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

            <Link
              to="/assignments"
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">
                    assignment
                  </span>
                </div>

                <span className="font-body-sm text-on-surface">
                  Pending Tasks
                </span>

              </div>

              <span className="font-body-sm font-bold text-error">
                {pendingAssignments}
              </span>
            </Link>

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">
                    school
                  </span>
                </div>

                <span className="font-body-sm text-on-surface">
                  Classes Today
                </span>

              </div>

              <span className="font-body-sm font-bold text-primary">
                {todaySchedule.length}
              </span>

            </div>

          </div>

        </div>

        <div className="flex-1" />

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
            onClick={handleLogout}
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

        <header className="lg:hidden sticky top-0 z-50 h-[64px] bg-surface border-b border-outline-variant px-margin-mobile flex items-center justify-between">

          <div className="flex items-center gap-sm">

            <Link
              to="/profile"
              className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold"
            >
              {getInitials(
                studentName
              )}
            </Link>

            <span className="font-headline-lg-mobile font-bold text-primary">
              CampusCopilot
            </span>

          </div>

          <StudentNotificationBell />

        </header>

        <main className="w-full px-margin-mobile md:px-lg py-md pb-[90px] lg:pb-lg">

          <StudentPageHero
            eyebrow="WEEKLY SCHEDULE"
            title="Class Timetable"
            subtitle="Weekly schedule, venue navigation, and faculty assignments."
          />

          {/* DAY SELECTOR */}

          <section className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-sm mb-md">

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">

              {weekDates.map(
                ({
                  day,
                }) => {
                  const active =
                    selectedDay ===
                    day;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setSelectedDay(
                          day
                        )
                      }
                      className={`shrink-0 rounded-full px-5 py-2.5 font-title-md text-sm transition-all ${
                        active
                          ? "bg-primary text-on-primary shadow-sm"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {day}
                    </button>
                  );
                }
              )}

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={goToToday}
                className="h-10 px-4 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface flex items-center gap-2 font-semibold text-sm hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[18px]">
                  today
                </span>

                Today
              </button>

              <button
                type="button"
                onClick={() =>
                  setWeekStart(
                    addDays(
                      weekStart,
                      -7
                    )
                  )
                }
                className="w-10 h-10 border border-outline-variant rounded-lg bg-surface-container-lowest flex items-center justify-center text-on-surface hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined">
                  chevron_left
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setWeekStart(
                    addDays(
                      weekStart,
                      7
                    )
                  )
                }
                className="w-10 h-10 border border-outline-variant rounded-lg bg-surface-container-lowest flex items-center justify-center text-on-surface hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined">
                  chevron_right
                </span>
              </button>

            </div>

          </section>

          {/* =================================================
              MAIN GRID
          ================================================= */}

          <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px] gap-md">

            {/* =================================================
                WEEKLY TIMETABLE
            ================================================= */}

            <section className="min-w-0">

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">

                <div className="overflow-x-auto">

                  <div className="min-w-[1120px]">

                    {/* HEADER */}

                    <div className="grid grid-cols-[72px_repeat(7,minmax(145px,1fr))] border-b border-outline-variant">

                      <div className="px-2 py-sm flex items-center justify-center font-label-caps text-outline">
                        TIME
                      </div>

                      {weekDates.map(
                        ({
                          day,
                          date,
                        }) => {
                          const active =
                            selectedDay ===
                            day;

                          const today =
                            sameDate(
                              date,
                              now
                            );

                          return (
                            <button
                              type="button"
                              key={day}
                              onClick={() =>
                                setSelectedDay(
                                  day
                                )
                              }
                              className={`py-sm px-2 border-l border-surface-container-high text-center transition-colors ${
                                active
                                  ? "bg-primary/5"
                                  : "hover:bg-surface-container-low"
                              }`}
                            >

                              <div
                                className={`font-title-md text-sm font-semibold ${
                                  active
                                    ? "text-primary"
                                    : "text-on-surface"
                                }`}
                              >
                                {day}
                              </div>

                              <div
                                className={`font-mono-sm text-xs mt-0.5 ${
                                  today
                                    ? "text-primary font-bold"
                                    : "text-on-surface-variant"
                                }`}
                              >
                                {formatDayDate(
                                  date
                                )}
                              </div>

                            </button>
                          );
                        }
                      )}

                    </div>

                    {/* TIMELINE */}

                    <div className="relative">

                      <div
                        className="absolute left-[72px] right-0 top-0 pointer-events-none"
                        style={{
                          height:
                            `${timelineHeight}px`,
                        }}
                      >

                        {hours.map(
                          (
                            hour,
                            index
                          ) => (
                            <div
                              key={hour}
                              className="absolute left-0 right-0 border-t border-surface-container-high"
                              style={{
                                top:
                                  `${index *
                                  HOUR_HEIGHT}px`,
                              }}
                            />
                          )
                        )}

                      </div>

                      <div className="grid grid-cols-[72px_repeat(7,minmax(145px,1fr))]">

                        {/* TIME LABELS */}

                        <div
                          className="relative"
                          style={{
                            height:
                              `${timelineHeight}px`,
                          }}
                        >

                          {hours
                            .slice(
                              0,
                              -1
                            )
                            .map(
                              (
                                hour,
                                index
                              ) => (
                                <div
                                  key={hour}
                                  className="absolute left-0 right-0 px-2 text-right font-body-sm text-xs text-on-surface-variant"
                                  style={{
                                    top:
                                      `${index *
                                      HOUR_HEIGHT +
                                      10}px`,
                                  }}
                                >
                                  {formatTime(
                                    `${String(
                                      hour
                                    ).padStart(
                                      2,
                                      "0"
                                    )}:00`
                                  )}
                                </div>
                              )
                            )}

                        </div>

                        {/* DAY COLUMNS */}

                        {DAYS.map(
                          (day) => (
                            <div
                              key={day}
                              className={`relative border-l border-surface-container-high ${
                                selectedDay ===
                                day
                                  ? "bg-primary/[0.015]"
                                  : ""
                              }`}
                              style={{
                                height:
                                  `${timelineHeight}px`,
                              }}
                            >

                              {(
                                scheduleByDay[
                                  day
                                ] || []
                              ).map(
                                (
                                  slot
                                ) => {
                                  if (
                                    slot.startMinutes ===
                                      null ||
                                    slot.endMinutes ===
                                      null
                                  ) {
                                    return null;
                                  }

                                  const start =
                                    Math.max(
                                      slot.startMinutes,
                                      START_HOUR *
                                        60
                                    );

                                  const end =
                                    Math.min(
                                      slot.endMinutes,
                                      END_HOUR *
                                        60
                                    );

                                  if (
                                    end <=
                                    start
                                  ) {
                                    return null;
                                  }

                                  const top =
                                    ((start -
                                      START_HOUR *
                                        60) /
                                      60) *
                                    HOUR_HEIGHT;

                                  const height =
                                    Math.max(
                                      50,

                                      ((end -
                                        start) /
                                        60) *
                                        HOUR_HEIGHT -
                                        6
                                    );

                                  return (
                                    <div
                                      key={
                                        slot.id
                                      }
                                      className={`absolute left-1.5 right-1.5 rounded-lg border ${slot.theme.bg} ${slot.theme.border} overflow-hidden shadow-sm`}
                                      style={{
                                        top:
                                          `${top +
                                          3}px`,

                                        height:
                                          `${height}px`,
                                      }}
                                    >

                                      <div
                                        className={`absolute left-0 top-0 bottom-0 w-[3px] ${slot.theme.accent}`}
                                      />

                                      <div className="h-full px-2 py-1.5 pl-3 flex flex-col">

                                        {/* SMALLER SUBJECT NAME */}

                                        <div
                                          className={`font-title-md text-[10px] leading-[13px] font-semibold ${slot.theme.text}`}
                                        >
                                          {
                                            slot.subjectName
                                          }
                                        </div>

                                        {/* SMALLER SUBJECT CODE */}

                                        <div
                                          className={`font-mono-sm text-[8px] leading-[11px] mt-[2px] ${slot.theme.text}`}
                                        >
                                          (
                                          {
                                            slot.subjectCode
                                          }
                                          )
                                        </div>

                                        {/* SMALLER TIME */}

                                        <div className="font-body-sm text-[8px] leading-[11px] text-on-surface-variant mt-1 flex items-center gap-1">

                                          <span className="material-symbols-outlined text-[10px]">
                                            schedule
                                          </span>

                                          {formatTime(
                                            slot.startTime
                                          )}

                                          {" - "}

                                          {formatTime(
                                            slot.endTime
                                          )}

                                        </div>

                                        {height >
                                          70 && (
                                          <>

                                            {/* SMALLER ROOM */}

                                            <div className="font-body-sm text-[8px] leading-[11px] text-on-surface-variant mt-[2px] flex items-center gap-1">

                                              <span className="material-symbols-outlined text-[10px]">
                                                location_on
                                              </span>

                                              {
                                                slot.room
                                              }

                                            </div>

                                            {/* SMALLER FACULTY */}

                                            <div className="font-body-sm text-[8px] leading-[11px] text-on-surface-variant mt-[2px] flex items-center gap-1 truncate">

                                              <span className="material-symbols-outlined text-[10px]">
                                                person
                                              </span>

                                              {
                                                slot.faculty
                                              }

                                            </div>

                                          </>
                                        )}

                                      </div>

                                    </div>
                                  );
                                }
                              )}

                            </div>
                          )
                        )}

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* NOTE */}

              <div className="mt-sm rounded-xl border border-primary-fixed bg-primary-fixed/35 px-sm py-3 flex items-start gap-2">

                <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
                  info
                </span>

                <p className="font-body-sm text-on-surface-variant">

                  <strong className="text-primary">
                    Note:
                  </strong>{" "}

                  Timetable is subject to change. Please check regularly for updates and announcements.

                </p>

              </div>

            </section>

            {/* =================================================
                RIGHT SIDE
            ================================================= */}

            <aside className="flex flex-col gap-md">

              {/* CALENDAR */}

              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">

                <h2 className="font-title-md font-bold text-on-surface">
                  Calendar
                </h2>

                <div className="flex items-center justify-between mt-md">

                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        new Date(
                          calendarMonth.getFullYear(),
                          calendarMonth.getMonth() -
                            1,
                          1
                        )
                      )
                    }
                    className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-primary"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      chevron_left
                    </span>
                  </button>

                  <div className="font-title-md font-semibold text-primary">
                    {calendarMonth.toLocaleDateString(
                      "en-US",
                      {
                        month:
                          "long",

                        year:
                          "numeric",
                      }
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        new Date(
                          calendarMonth.getFullYear(),
                          calendarMonth.getMonth() +
                            1,
                          1
                        )
                      )
                    }
                    className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-primary"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      chevron_right
                    </span>
                  </button>

                </div>

                <div className="grid grid-cols-7 gap-1 mt-md">

                  {[
                    "M",
                    "T",
                    "W",
                    "T",
                    "F",
                    "S",
                    "S",
                  ].map(
                    (
                      label,
                      index
                    ) => (
                      <div
                        key={`${label}-${index}`}
                        className="text-center font-label-caps text-xs text-on-surface-variant py-1"
                      >
                        {label}
                      </div>
                    )
                  )}

                </div>

                <div className="grid grid-cols-7 gap-1">

                  {calendarCells.map(
                    (
                      cell,
                      index
                    ) => {
                      const today =
                        sameDate(
                          cell.date,
                          now
                        );

                      const selected =
                        sameDate(
                          cell.date,
                          selectedDate
                        );

                      return (
                        <button
                          key={`${cell.date.toISOString()}-${index}`}
                          type="button"
                          onClick={() =>
                            selectCalendarDate(
                              cell.date
                            )
                          }
                          className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                            today
                              ? "bg-primary text-on-primary font-bold"
                              : selected
                              ? "bg-primary-fixed text-primary"
                              : cell.currentMonth
                              ? "text-on-surface hover:bg-surface-container-low"
                              : "text-outline/50"
                          }`}
                        >
                          {cell.date.getDate()}
                        </button>
                      );
                    }
                  )}

                </div>

              </section>

              {/* UPCOMING CLASSES */}

              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">

                <div className="flex items-center justify-between">

                  <h2 className="font-title-md font-bold text-on-surface">
                    Upcoming Classes
                  </h2>

                  <span className="font-label-caps text-primary">
                    {upcomingClasses.length}{" "}
                    upcoming
                  </span>

                </div>

                {upcomingClasses.length ===
                0 ? (
                  <div className="py-lg text-center">

                    <span className="material-symbols-outlined text-4xl text-outline">
                      event_available
                    </span>

                    <p className="font-body-sm text-on-surface-variant mt-2">
                      No upcoming classes.
                    </p>

                  </div>
                ) : (
                  <div className="mt-sm divide-y divide-surface-container-high">

                    {upcomingClasses.map(
                      (slot) => (
                        <div
                          key={`${slot.id}-${slot.occurrence.toISOString()}`}
                          className="py-sm first:pt-1"
                        >

                          <div className="flex items-start gap-3">

                            <div
                              className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${slot.theme.accent}`}
                            />

                            <div className="min-w-0 flex-1">

                              <div className="font-title-md text-sm font-semibold text-on-surface">
                                {
                                  slot.subjectName
                                }{" "}

                                <span className="text-on-surface-variant">
                                  (
                                  {
                                    slot.subjectCode
                                  }
                                  )
                                </span>
                              </div>

                              <div className="font-body-sm text-xs text-on-surface-variant mt-1">

                                {slot.occurrence.toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday:
                                      "short",
                                  }
                                )}

                                ,{" "}

                                {formatTime(
                                  slot.startTime
                                )}

                                {" - "}

                                {formatTime(
                                  slot.endTime
                                )}

                              </div>

                              <div className="font-body-sm text-xs text-outline mt-1">

                                {
                                  slot.room
                                }

                                {" • "}

                                {
                                  slot.faculty
                                }

                              </div>

                            </div>

                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}

              </section>

              {/* NOTE */}

              <section className="rounded-xl border border-primary-fixed bg-primary-fixed/30 p-md">

                <div className="flex items-start gap-3">

                  <span className="material-symbols-outlined text-primary">
                    schedule
                  </span>

                  <div>

                    <div className="font-body-sm font-semibold text-primary">
                      All times are shown in your local time.
                    </div>

                    <p className="font-body-sm text-xs text-on-surface-variant mt-2 leading-5">
                      For timetable issues or schedule corrections, contact your department office.
                    </p>

                  </div>

                </div>

              </section>

            </aside>

          </div>

        </main>

      </div>

      {/* =================================================
          MOBILE NAVIGATION
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
            className="flex flex-col items-center text-primary font-semibold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
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
            to="/ai-chat"
            className="flex flex-col items-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined">
              smart_toy
            </span>

            <span className="text-[10px]">
              Copilot
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
