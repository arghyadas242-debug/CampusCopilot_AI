import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { attendanceService, authService } from "../../services/api";
import StudentNotificationBell from "./StudentNotificationBell";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SUBJECT_COLORS = [
  {
    bar: "bg-primary",
    soft: "bg-primary-fixed",
    text: "text-primary",
    icon: "database",
  },
  {
    bar: "bg-secondary",
    soft: "bg-secondary-container",
    text: "text-secondary",
    icon: "lan",
  },
  {
    bar: "bg-tertiary",
    soft: "bg-tertiary-fixed",
    text: "text-tertiary",
    icon: "code",
  },
  {
    bar: "bg-amber-500",
    soft: "bg-amber-50",
    text: "text-amber-700",
    icon: "memory",
  },
];

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
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getPercentage(attended, total) {
  if (!total) {
    return 0;
  }

  return Number(((attended / total) * 100).toFixed(1));
}

function calculateBunksLeft(attended, total) {
  if (!total) {
    return 0;
  }

  const percentage = getPercentage(attended, total);

  if (percentage < 75) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(attended / 0.75 - total)
  );
}

function calculateClassesNeeded(attended, total) {
  if (!total) {
    return 0;
  }

  const percentage = getPercentage(attended, total);

  if (percentage >= 75) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil((0.75 * total - attended) / 0.25)
  );
}

export default function AttendancePage() {
  const navigate = useNavigate();

  const currentUser = authService.getCurrentUser();

  const studentName =
    currentUser?.name || "Student";

  const department =
    currentUser?.department ||
    "Department unavailable";

  const studentRoll = String(
    currentUser?.rollNumber ||
      currentUser?.studentRoll ||
      currentUser?.roll_number ||
      ""
  ).trim();

  const [attendanceData, setAttendanceData] = useState({
    overallPercentage: 0,
    totalAttended: 0,
    totalClasses: 0,
    overallBuffer: 0,
    classesNeeded: 0,
    subjects: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [trendData, setTrendData] = useState([]);
  const [trackedSnapshots, setTrackedSnapshots] = useState(0);
  const [trendLoading, setTrendLoading] = useState(
    Boolean(studentRoll)
  );
  const [trendError, setTrendError] = useState("");

  // =====================================================
  // LOAD REAL ATTENDANCE
  // =====================================================

  useEffect(() => {
    async function loadAttendance() {
      if (!studentRoll) {
        setError(
          "Student roll number could not be found. Please log in again."
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await attendanceService.getAttendance(
            studentRoll
          );

        if (!Array.isArray(data)) {
          throw new Error(
            "Invalid attendance data received"
          );
        }

        const subjects = data.map(
          (item, index) => {
            const attended =
              Number(item.ATTENDED_CLASSES) || 0;

            const total =
              Number(item.TOTAL_CLASSES) || 0;

            const percentage =
              getPercentage(
                attended,
                total
              );

            const bunksLeft =
              calculateBunksLeft(
                attended,
                total
              );

            const classesNeeded =
              calculateClassesNeeded(
                attended,
                total
              );

            return {
              code:
                item.SUBJECT_CODE ||
                `SUB${index + 1}`,

              name:
                item.SUBJECT_NAME ||
                item.SUBJECT_CODE ||
                "Subject",

              attended,

              total,

              percentage,

              bunksLeft,

              classesNeeded,

              style:
                SUBJECT_COLORS[
                  index %
                    SUBJECT_COLORS.length
                ],
            };
          }
        );

        const totalAttended =
          subjects.reduce(
            (sum, subject) =>
              sum + subject.attended,
            0
          );

        const totalClasses =
          subjects.reduce(
            (sum, subject) =>
              sum + subject.total,
            0
          );

        const overallPercentage =
          getPercentage(
            totalAttended,
            totalClasses
          );

        const overallBuffer =
          calculateBunksLeft(
            totalAttended,
            totalClasses
          );

        const classesNeeded =
          calculateClassesNeeded(
            totalAttended,
            totalClasses
          );

        setAttendanceData({
          overallPercentage,
          totalAttended,
          totalClasses,
          overallBuffer,
          classesNeeded,
          subjects,
        });
      } catch (err) {
        console.error(
          "Attendance loading error:",
          err
        );

        setError(
          err.message ||
            "Unable to load attendance data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, [studentRoll]);

  // =====================================================
  // LOAD REAL OVERALL ATTENDANCE SNAPSHOT HISTORY
  // =====================================================

  useEffect(() => {
    if (!studentRoll) {
      return undefined;
    }

    let cancelled = false;

    async function loadTrend() {
      try {
        setTrendLoading(true);

        const result =
          await attendanceService
            .getAttendanceTrendHistory(
              studentRoll,
              8
            );

        const rawTrend = Array.isArray(
          result?.data
        )
          ? result.data
          : [];

        const normalizedTrend =
          rawTrend.map((snapshot) => {
            const attendedClasses =
              Number(
                snapshot.attendedClasses
              ) || 0;

            const totalClasses =
              Number(
                snapshot.totalClasses
              ) || 0;

            const rawPercentage =
              snapshot.percentage;

            const parsedPercentage =
              rawPercentage === null ||
              rawPercentage === undefined
                ? null
                : Number(rawPercentage);

            return {
              weekStart:
                snapshot.date,

              weekLabel:
                snapshot.label,

              attendedClasses,

              totalClasses,

              percentage:
                Number.isFinite(
                  parsedPercentage
                )
                  ? parsedPercentage
                  : null,
            };
          });

        if (cancelled) {
          return;
        }

        setTrendData(
          normalizedTrend
        );

        setTrackedSnapshots(
          normalizedTrend.filter(
            (snapshot) =>
              snapshot.percentage !== null
          ).length
        );

        setTrendError("");
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Attendance history loading error:",
          err
        );

        setTrendError(
          "Unable to load attendance history."
        );
      } finally {
        if (!cancelled) {
          setTrendLoading(false);
        }
      }
    }

    loadTrend();

    return () => {
      cancelled = true;
    };
  }, [studentRoll]);

  // =====================================================
  // DERIVED ANALYTICS
  // =====================================================

  const safeSubjects = useMemo(
    () =>
      attendanceData.subjects.filter(
        (subject) =>
          subject.percentage >= 75
      ),
    [attendanceData.subjects]
  );

  const riskSubjects = useMemo(
    () =>
      attendanceData.subjects.filter(
        (subject) =>
          subject.percentage < 75
      ),
    [attendanceData.subjects]
  );

  const highestSubject = useMemo(() => {
    if (
      attendanceData.subjects.length === 0
    ) {
      return null;
    }

    return [...attendanceData.subjects].sort(
      (a, b) =>
        b.percentage -
        a.percentage
    )[0];
  }, [attendanceData.subjects]);

  const lowestSubject = useMemo(() => {
    if (
      attendanceData.subjects.length === 0
    ) {
      return null;
    }

    return [...attendanceData.subjects].sort(
      (a, b) =>
        a.percentage -
        b.percentage
    )[0];
  }, [attendanceData.subjects]);

  const overallSafe =
    attendanceData.overallPercentage >= 75;

  const trackedTrendPoints = useMemo(
    () =>
      trendData.filter(
        (week) =>
          week.percentage !== null
      ),
    [trendData]
  );

  const trendComparison = useMemo(() => {
    if (
      trackedTrendPoints.length < 2
    ) {
      return null;
    }

    const previous =
      trackedTrendPoints[
        trackedTrendPoints.length - 2
      ];

    const latest =
      trackedTrendPoints[
        trackedTrendPoints.length - 1
      ];

    const difference = Number(
      (
        latest.percentage -
        previous.percentage
      ).toFixed(1)
    );

    return {
      difference,
      direction:
        difference > 0
          ? "Improving"
          : difference < 0
          ? "Declining"
          : "Stable",
    };
  }, [trackedTrendPoints]);

  const circleDegrees =
    Math.min(
      360,
      Math.max(
        0,
        attendanceData.overallPercentage *
          3.6
      )
    );

  // =====================================================
  // LOGOUT
  // =====================================================

  function handleLogout() {
    authService.logout();

    navigate("/login", {
      replace: true,
    });
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">

          <span className="material-symbols-outlined text-5xl text-primary animate-pulse">
            analytics
          </span>

          <p className="font-body-md text-on-surface-variant mt-3">
            Loading attendance analytics...
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
            Unable to Load Attendance
          </h2>

          <p className="font-body-sm text-on-surface-variant mt-2">
            {error}
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md flex">

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      <aside className="hidden lg:flex w-[280px] shrink-0 h-screen sticky top-0 bg-surface border-r border-outline-variant flex-col">

        {/* BRAND */}

        <div className="px-md pt-md pb-sm">

          <span className="font-headline-lg-mobile font-bold text-primary">
            CampusCopilot
          </span>

        </div>

        {/* PROFILE */}

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
                ID: {studentRoll}
              </div>

            </div>

          </div>
        </Link>

        {/* NAVIGATION */}

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
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >
            <span className="material-symbols-outlined">
              calendar_month
            </span>

            Timetable
          </Link>

          <Link
            to="/attendance"
            className="bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-semibold flex items-center gap-sm"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
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

        {/* =================================================
            QUICK SUMMARY
        ================================================= */}

        <div className="mx-4 mt-md rounded-xl border border-outline-variant bg-surface-container-lowest p-sm">

          <div className="font-label-caps text-outline mb-sm">
            QUICK SUMMARY
          </div>

          <div className="space-y-3">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-secondary-container text-secondary flex items-center justify-center">

                  <span className="material-symbols-outlined text-[16px]">
                    monitoring
                  </span>

                </div>

                <span className="font-body-sm text-on-surface">
                  Overall Attendance
                </span>

              </div>

              <span className="font-body-sm font-bold text-secondary">
                {attendanceData.overallPercentage}%
              </span>

            </div>

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">

                  <span className="material-symbols-outlined text-[16px]">
                    event_available
                  </span>

                </div>

                <span className="font-body-sm text-on-surface">
                  Classes Attended
                </span>

              </div>

              <span className="font-body-sm font-bold text-primary">
                {attendanceData.totalAttended} /{" "}
                {attendanceData.totalClasses}
              </span>

            </div>

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">

                  <span className="material-symbols-outlined text-[16px]">
                    verified_user
                  </span>

                </div>

                <span className="font-body-sm text-on-surface">
                  Bunks Remaining
                </span>

              </div>

              <span className="font-body-sm font-bold text-on-surface">
                {attendanceData.overallBuffer}
              </span>

            </div>

          </div>

        </div>

        <div className="flex-1" />

        {/* PROFILE / LOGOUT */}

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

        {/* MOBILE HEADER */}

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

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main className="w-full px-margin-mobile md:px-lg py-md pb-[90px] lg:pb-lg">

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <section className="flex flex-col md:flex-row md:items-start md:justify-between gap-sm mb-md">

            <div>

              <h1 className="font-headline-lg md:font-display-lg font-bold text-on-surface">
                Attendance Analytics
              </h1>

              <p className="font-body-md text-on-surface-variant mt-1">
                Track your attendance performance and stay in the safe zone.
              </p>

            </div>

            <div className="flex items-center gap-2">

              <div className="hidden lg:block">
                <StudentNotificationBell />
              </div>

              <Link
                to="/ai-chat?q=Analyze%20my%20attendance%20and%20give%20me%20attendance%20advice"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  smart_toy
                </span>

                Ask Copilot Attendance Advice
              </Link>

            </div>

          </section>

          {/* =================================================
              TOP SUMMARY CARDS
          ================================================= */}

          <section className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-md mb-md">

            {/* OVERALL ATTENDANCE */}

            <article className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-container text-white rounded-xl p-md min-h-[155px]">

              <div className="relative z-10 flex items-center justify-between h-full">

                <div>

                  <div className="font-label-caps text-primary-fixed">
                    OVERALL ATTENDANCE
                  </div>

                  <div className="font-display-lg font-bold mt-2">
                    {attendanceData.overallPercentage}%
                  </div>

                  <div
                    className={`font-body-sm font-semibold mt-1 ${
                      overallSafe
                        ? "text-secondary-fixed"
                        : "text-error-container"
                    }`}
                  >
                    {overallSafe
                      ? "Good Standing"
                      : "Attendance Warning"}
                  </div>

                  <div className="font-body-sm text-primary-fixed mt-2">

                    {overallSafe
                      ? `${attendanceData.overallBuffer} ${
                          attendanceData.overallBuffer === 1
                            ? "class"
                            : "classes"
                        } safe before 75%`
                      : `${attendanceData.classesNeeded} ${
                          attendanceData.classesNeeded === 1
                            ? "class"
                            : "classes"
                        } needed to reach 75%`}

                  </div>

                </div>

                <div
                  className="w-[84px] h-[84px] rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: `conic-gradient(
                      #86f2e4 ${circleDegrees}deg,
                      rgba(255,255,255,0.16) ${circleDegrees}deg
                    )`,
                  }}
                >
                  <div className="w-[64px] h-[64px] rounded-full bg-primary-container flex items-center justify-center font-bold text-lg">

                    {attendanceData.overallPercentage}%

                  </div>
                </div>

              </div>

            </article>

            {/* CLASSES ATTENDED */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md min-h-[155px] flex items-center gap-md">

              <div className="w-14 h-14 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">

                <span className="material-symbols-outlined text-[28px]">
                  event_available
                </span>

              </div>

              <div>

                <div className="font-label-caps text-outline">
                  CLASSES ATTENDED
                </div>

                <div className="font-display-lg font-bold text-on-surface mt-2">

                  {attendanceData.totalAttended}

                  <span className="font-body-sm font-normal text-on-surface-variant ml-1">
                    / {attendanceData.totalClasses}
                  </span>

                </div>

                <div className="font-body-sm text-on-surface-variant mt-1">
                  Total Classes
                </div>

              </div>

            </article>

            {/* SAFE ZONE */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md min-h-[155px] flex items-center gap-md">

              <div className="w-14 h-14 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">

                <span className="material-symbols-outlined text-[28px]">
                  shield
                </span>

              </div>

              <div>

                <div className="font-label-caps text-outline">
                  SAFE ZONE
                </div>

                <div className="font-display-lg font-bold text-on-surface mt-2">
                  {attendanceData.overallBuffer}
                </div>

                <div className="font-body-sm text-on-surface-variant mt-1">
                  Bunks Remaining
                </div>

              </div>

            </article>

            {/* SUBJECT STATUS */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md min-h-[155px]">

              <div className="font-label-caps text-outline">
                SUBJECT STATUS
              </div>

              <div className="flex items-center gap-md mt-4">

                <div className="w-12 h-12 rounded-xl bg-secondary-container text-secondary flex items-center justify-center">

                  <span className="material-symbols-outlined text-[25px]">
                    task_alt
                  </span>

                </div>

                <div>

                  <div className="font-display-lg font-bold text-on-surface">
                    {safeSubjects.length}
                  </div>

                  <div className="font-body-sm text-on-surface-variant">
                    Safe Subjects
                  </div>

                </div>

              </div>

              {riskSubjects.length > 0 && (
                <div className="font-body-sm text-error mt-3">
                  {riskSubjects.length} subject
                  {riskSubjects.length === 1 ? "" : "s"} below 75%
                </div>
              )}

            </article>

          </section>

          {/* =================================================
              REAL ATTENDANCE SNAPSHOT HISTORY
          ================================================= */}

          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md mb-md shadow-[0_2px_10px_rgba(25,28,30,0.04)]">

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-sm mb-md">

              <div>

                <h2 className="font-title-md font-bold text-on-surface">
                  Attendance History
                </h2>

                <p className="font-body-sm text-on-surface-variant mt-1">
                  Last 8 Weeks
                </p>

              </div>

              {trendComparison && (
                <div className="sm:text-right">

                  <div
                    className={`font-title-md font-bold ${
                      trendComparison.difference > 0
                        ? "text-secondary"
                        : trendComparison.difference < 0
                        ? "text-error"
                        : "text-primary"
                    }`}
                  >
                    {trendComparison.direction}
                  </div>

                  <div className="font-body-sm text-on-surface-variant mt-0.5">
                    {trendComparison.difference > 0
                      ? "+"
                      : ""}
                    {trendComparison.difference.toFixed(
                      1
                    )}
                    % from previous snapshot
                  </div>

                </div>
              )}

            </div>

            {trendLoading ? (
              <div className="min-h-[290px] flex flex-col items-center justify-center text-center">

                <span className="material-symbols-outlined text-4xl text-primary animate-pulse">
                  monitoring
                </span>

                <p className="font-body-sm text-on-surface-variant mt-2">
                  Loading attendance history...
                </p>

              </div>
            ) : trendError ? (
              <div className="min-h-[290px] flex flex-col items-center justify-center text-center">

                <span className="material-symbols-outlined text-4xl text-error">
                  cloud_off
                </span>

                <p className="font-body-md font-semibold text-on-surface mt-2">
                  Unable to load attendance history.
                </p>

                <p className="font-body-sm text-on-surface-variant mt-1">
                  Your current aggregate attendance is still available above.
                </p>

              </div>
            ) : trackedSnapshots === 0 ? (
              <div className="min-h-[290px] flex flex-col items-center justify-center text-center px-md">

                <span className="material-symbols-outlined text-5xl text-outline">
                  timeline
                </span>

                <p className="font-body-md font-semibold text-on-surface mt-3">
                  No attendance history yet.
                </p>

                <p className="font-body-sm text-on-surface-variant mt-1 max-w-[560px]">
                  History will appear after attendance snapshots are recorded.
                </p>

              </div>
            ) : (
              <>

                <div className="w-full h-[290px] md:h-[320px]">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={trendData}
                      margin={{
                        top: 18,
                        right: 20,
                        left: 0,
                        bottom: 4,
                      }}
                    >
                      <CartesianGrid
                        stroke="#c5c5d3"
                        strokeDasharray="4 4"
                        vertical={false}
                        opacity={0.65}
                      />

                      <XAxis
                        dataKey="weekLabel"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#757682",
                          fontSize: 12,
                        }}
                        minTickGap={12}
                      />

                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                        tick={{
                          fill: "#757682",
                          fontSize: 12,
                        }}
                        tickFormatter={(value) =>
                          `${value}%`
                        }
                      />

                      <Tooltip
                        cursor={{
                          stroke: "#c5c5d3",
                          strokeDasharray: "4 4",
                        }}
                        contentStyle={{
                          borderColor: "#c5c5d3",
                          borderRadius: "12px",
                          backgroundColor: "#ffffff",
                          color: "#191c1e",
                          boxShadow:
                            "0 6px 20px rgba(25, 28, 30, 0.10)",
                        }}
                        labelStyle={{
                          color: "#00236f",
                          fontWeight: 700,
                        }}
                        formatter={(
                          value,
                          _name,
                          item
                        ) => [
                          value === null ||
                          value === undefined
                            ? "No tracked history"
                            : `${value}% (${item.payload.attendedClasses}/${item.payload.totalClasses})`,
                          "Attendance",
                        ]}
                      />

                      <ReferenceLine
                        y={75}
                        stroke="#ba1a1a"
                        strokeDasharray="6 5"
                        label={{
                          value: "Minimum 75%",
                          position: "insideTopRight",
                          fill: "#ba1a1a",
                          fontSize: 12,
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="percentage"
                        name="Attendance"
                        stroke="#00236f"
                        strokeWidth={3}
                        connectNulls={false}
                        isAnimationActive={false}
                        dot={{
                          r: 4,
                          fill: "#ffffff",
                          stroke: "#00236f",
                          strokeWidth: 3,
                        }}
                        activeDot={{
                          r: 6,
                          fill: "#86f2e4",
                          stroke: "#00236f",
                          strokeWidth: 2,
                        }}
                      />

                    </LineChart>
                  </ResponsiveContainer>

                </div>

                {trackedSnapshots === 1 && (
                  <div className="mt-sm rounded-xl bg-primary-fixed/45 border border-primary-fixed px-sm py-3 flex items-start gap-2 text-primary">

                    <span className="material-symbols-outlined text-[20px] shrink-0">
                      info
                    </span>

                    <p className="font-body-sm leading-5">
                      Trend tracking has started. More history will appear as new attendance is recorded.
                    </p>

                  </div>
                )}

              </>
            )}

          </section>

          {/* =================================================
              MIDDLE ROW
          ================================================= */}

          <section className="grid grid-cols-1 2xl:grid-cols-12 gap-md mb-md">

            {/* =================================================
                SUBJECT PERFORMANCE OVERVIEW
            ================================================= */}

            <article className="2xl:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl p-md">

              <div className="flex items-center justify-between mb-md">

                <div>

                  <h2 className="font-title-md font-bold text-on-surface">
                    Attendance Performance
                  </h2>

                  <p className="font-body-sm text-on-surface-variant mt-1">
                    Current subject attendance compared with the 75% requirement.
                  </p>

                </div>

                <div className="font-label-caps text-outline">
                  75% MINIMUM
                </div>

              </div>

              {attendanceData.subjects.length === 0 ? (
                <div className="min-h-[270px] flex flex-col items-center justify-center text-center">

                  <span className="material-symbols-outlined text-5xl text-outline">
                    analytics
                  </span>

                  <p className="font-body-sm text-on-surface-variant mt-2">
                    No attendance records available.
                  </p>

                </div>
              ) : (
                <div className="space-y-md">

                  {attendanceData.subjects.map(
                    (subject) => (
                      <div key={subject.code}>

                        <div className="flex items-center justify-between gap-4 mb-2">

                          <div className="min-w-0">

                            <div className="font-title-md text-sm font-semibold text-on-surface">
                              {subject.name}
                            </div>

                            <div className="font-mono-sm text-xs text-outline">
                              {subject.code}
                            </div>

                          </div>

                          <div
                            className={`font-title-md text-lg font-bold ${
                              subject.percentage >= 75
                                ? "text-secondary"
                                : "text-error"
                            }`}
                          >
                            {subject.percentage}%
                          </div>

                        </div>

                        <div className="relative h-3 rounded-full bg-surface-container-high overflow-hidden">

                          <div
                            className="absolute top-0 bottom-0 w-[2px] bg-outline z-20"
                            style={{
                              left: "75%",
                            }}
                          />

                          <div
                            className={`h-full rounded-full ${
                              subject.percentage >= 75
                                ? subject.style.bar
                                : "bg-error"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                subject.percentage
                              )}%`,
                            }}
                          />

                        </div>

                        <div className="flex justify-between mt-1.5 font-body-sm text-xs text-outline">

                          <span>
                            {subject.attended} attended
                          </span>

                          <span>
                            {subject.total} total
                          </span>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </article>

            {/* =================================================
                SUBJECT WISE ATTENDANCE
            ================================================= */}

            <article className="2xl:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl p-md">

              <div className="flex items-center justify-between mb-md">

                <h2 className="font-title-md font-bold text-on-surface">
                  Subject-wise Attendance
                </h2>

                <span className="font-label-caps text-primary">
                  {attendanceData.subjects.length} SUBJECTS
                </span>

              </div>

              <div className="divide-y divide-surface-container-high">

                {attendanceData.subjects.map(
                  (subject) => (
                    <div
                      key={subject.code}
                      className="py-sm first:pt-0"
                    >

                      <div className="flex items-center gap-3">

                        <div
                          className={`w-10 h-10 rounded-xl ${subject.style.soft} ${subject.style.text} flex items-center justify-center shrink-0`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {subject.style.icon}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="font-mono-sm text-xs text-on-surface font-semibold">
                            {subject.code}
                          </div>

                          <div className="font-body-sm text-xs text-on-surface-variant truncate">
                            {subject.name}
                          </div>

                        </div>

                        <div className="text-right shrink-0">

                          <div
                            className={`font-title-md text-lg font-bold ${
                              subject.percentage >= 75
                                ? "text-on-surface"
                                : "text-error"
                            }`}
                          >
                            {subject.percentage}%
                          </div>

                          <div className="font-body-sm text-xs text-outline">
                            {subject.attended} / {subject.total} classes
                          </div>

                        </div>

                      </div>

                      <div className="ml-[52px] mt-2 h-1.5 rounded-full bg-surface-container-high overflow-hidden">

                        <div
                          className={`h-full rounded-full ${
                            subject.percentage >= 75
                              ? subject.style.bar
                              : "bg-error"
                          }`}
                          style={{
                            width: `${Math.min(
                              subject.percentage,
                              100
                            )}%`,
                          }}
                        />

                      </div>

                    </div>
                  )
                )}

              </div>

            </article>

          </section>

          {/* =================================================
              LOWER ROW
          ================================================= */}

          <section className="grid grid-cols-1 2xl:grid-cols-12 gap-md">

            {/* =================================================
                ATTENDANCE PLANNER
            ================================================= */}

            <article className="2xl:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">

              <div className="px-md py-sm border-b border-outline-variant">

                <h2 className="font-title-md font-bold text-on-surface">
                  Attendance Planner
                </h2>

                <p className="font-body-sm text-on-surface-variant mt-1">
                  Safe bunk limits and recovery requirements based on current attendance.
                </p>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[680px]">

                  <thead className="bg-surface-container-low">

                    <tr className="text-left">

                      <th className="px-md py-3 font-label-caps text-outline">
                        SUBJECT
                      </th>

                      <th className="px-md py-3 font-label-caps text-outline">
                        ATTENDED
                      </th>

                      <th className="px-md py-3 font-label-caps text-outline">
                        ATTENDANCE
                      </th>

                      <th className="px-md py-3 font-label-caps text-outline">
                        STATUS
                      </th>

                      <th className="px-md py-3 font-label-caps text-outline">
                        ACTION
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-surface-container-high">

                    {attendanceData.subjects.map(
                      (subject) => {
                        const safe =
                          subject.percentage >= 75;

                        return (
                          <tr key={subject.code}>

                            <td className="px-md py-sm">

                              <div className="font-title-md text-sm font-semibold text-on-surface">
                                {subject.code}
                              </div>

                              <div className="font-body-sm text-xs text-outline">
                                {subject.name}
                              </div>

                            </td>

                            <td className="px-md py-sm font-body-sm text-on-surface-variant">
                              {subject.attended} / {subject.total}
                            </td>

                            <td className="px-md py-sm">

                              <span
                                className={`font-title-md font-bold ${
                                  safe
                                    ? "text-secondary"
                                    : "text-error"
                                }`}
                              >
                                {subject.percentage}%
                              </span>

                            </td>

                            <td className="px-md py-sm">

                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 font-label-caps ${
                                  safe
                                    ? "bg-secondary-container text-secondary"
                                    : "bg-error-container text-error"
                                }`}
                              >
                                {safe
                                  ? "SAFE"
                                  : "NEEDS ATTENTION"}
                              </span>

                            </td>

                            <td className="px-md py-sm font-body-sm">

                              {safe ? (
                                <span className="text-on-surface-variant">
                                  {subject.bunksLeft === 0
                                    ? "No safe bunks left"
                                    : `${subject.bunksLeft} ${
                                        subject.bunksLeft === 1
                                          ? "bunk"
                                          : "bunks"
                                      } available`}
                                </span>
                              ) : (
                                <span className="text-error font-semibold">
                                  Attend next{" "}
                                  {subject.classesNeeded}{" "}
                                  {subject.classesNeeded === 1
                                    ? "class"
                                    : "classes"}
                                </span>
                              )}

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            </article>

            {/* =================================================
                ATTENDANCE INSIGHTS
            ================================================= */}

            <article className="2xl:col-span-5 relative overflow-hidden bg-gradient-to-br from-tertiary-fixed/35 via-surface-container-lowest to-secondary-container/20 border border-tertiary-fixed-dim rounded-xl p-md">

              <div className="absolute -right-24 -top-24 w-[260px] h-[260px] rounded-full bg-tertiary-fixed/35" />

              <div className="relative z-10">

                <div className="flex items-center gap-sm">

                  <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center">

                    <span className="material-symbols-outlined">
                      insights
                    </span>

                  </div>

                  <div>

                    <h2 className="font-title-md font-bold text-tertiary">
                      Attendance Insights
                    </h2>

                    <div className="font-label-caps text-outline">
                      REAL ATTENDANCE DATA
                    </div>

                  </div>

                </div>

                <div className="space-y-sm mt-md">

                  {/* OVERALL */}

                  <div className="flex items-start gap-3">

                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        overallSafe
                          ? "bg-secondary-container text-secondary"
                          : "bg-error-container text-error"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {overallSafe
                          ? "trending_up"
                          : "warning"}
                      </span>
                    </div>

                    <div>

                      <div className="font-body-md font-semibold text-on-surface">

                        {overallSafe
                          ? "Your attendance is above the minimum requirement."
                          : "Your overall attendance is below the minimum requirement."}

                      </div>

                      <div className="font-body-sm text-on-surface-variant mt-1">

                        {overallSafe
                          ? `You currently have a safe buffer of ${attendanceData.overallBuffer} ${
                              attendanceData.overallBuffer === 1
                                ? "class"
                                : "classes"
                            }.`
                          : `Attend the next ${attendanceData.classesNeeded} ${
                              attendanceData.classesNeeded === 1
                                ? "class"
                                : "classes"
                            } to reach 75%.`}

                      </div>

                    </div>

                  </div>

                  {/* HIGHEST */}

                  {highestSubject && (
                    <div className="flex items-start gap-3">

                      <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">

                        <span className="material-symbols-outlined text-[18px]">
                          workspace_premium
                        </span>

                      </div>

                      <div>

                        <div className="font-body-md font-semibold text-on-surface">
                          Strongest attendance: {highestSubject.code}
                        </div>

                        <div className="font-body-sm text-on-surface-variant mt-1">
                          {highestSubject.name} is currently at{" "}
                          {highestSubject.percentage}%.
                        </div>

                      </div>

                    </div>
                  )}

                  {/* LOWEST */}

                  {lowestSubject && (
                    <div className="flex items-start gap-3">

                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          lowestSubject.percentage >= 75
                            ? "bg-secondary-container text-secondary"
                            : "bg-error-container text-error"
                        }`}
                      >

                        <span className="material-symbols-outlined text-[18px]">
                          info
                        </span>

                      </div>

                      <div>

                        <div className="font-body-md font-semibold text-on-surface">
                          Lowest attendance: {lowestSubject.code}
                        </div>

                        <div className="font-body-sm text-on-surface-variant mt-1">

                          {lowestSubject.name} is currently at{" "}
                          {lowestSubject.percentage}%.

                          {lowestSubject.percentage >= 75
                            ? ` You can safely miss ${lowestSubject.bunksLeft} more ${
                                lowestSubject.bunksLeft === 1
                                  ? "class"
                                  : "classes"
                              }.`
                            : ` Attend the next ${lowestSubject.classesNeeded} ${
                                lowestSubject.classesNeeded === 1
                                  ? "class"
                                  : "classes"
                              } to recover to 75%.`}

                        </div>

                      </div>

                    </div>
                  )}

                </div>

                <Link
                  to="/ai-chat?q=Analyze%20my%20attendance%20and%20create%20a%20safe%20attendance%20plan"
                  className="inline-flex items-center gap-2 mt-md text-tertiary font-semibold text-sm hover:underline"
                >
                  Ask Copilot for detailed advice

                  <span className="material-symbols-outlined text-[17px]">
                    arrow_forward
                  </span>
                </Link>

              </div>

            </article>

          </section>

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
            className="flex flex-col items-center text-primary font-semibold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
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
