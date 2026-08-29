import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { authService } from "../../services/api";
import StudentNotificationBell from "./StudentNotificationBell";

const API_URL = "http://localhost:5000";

export default function DashboardPage() {
  const navigate = useNavigate();

  const [aiQuery, setAiQuery] = useState("");

  // =====================================================
  // CURRENT USER
  // =====================================================

  const currentUser = authService.getCurrentUser();

  const studentName =
    currentUser?.name || "Student";

  const firstName =
    studentName.trim().split(/\s+/)[0] || "Student";

  const department =
    currentUser?.department ||
    "Department not available";

  const rollNumber =
    currentUser?.rollNumber ||
    currentUser?.studentRoll ||
    currentUser?.roll_number ||
    "";

  // =====================================================
  // INITIALS
  // =====================================================

  const getInitials = (name) => {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return "ST";
    }

    if (parts.length >= 2) {
      return (
        parts[0][0] +
        parts[1][0]
      ).toUpperCase();
    }

    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  };

  // =====================================================
  // DASHBOARD STATE
  // =====================================================

  const [dashboardData, setDashboardData] = useState({
    attendancePercentage: null,

    attendanceStatus:
      "Attendance unavailable",

    pendingAssignmentsCount: 0,

    upcomingExamsCount: 0,

    todayClassesCount: 0,

    todayClasses: [],

    recentNotices: [],

    upcomingAssignments: [],

    attendanceAvailable:
      rollNumber ? null : false,

    assignmentsAvailable:
      rollNumber ? null : false,

    examsAvailable:
      rollNumber ? null : false,

    timetableAvailable:
      rollNumber ? null : false,

    noticesAvailable:
      rollNumber ? null : false,
  });

  const [loading, setLoading] = useState(
    Boolean(rollNumber)
  );

  // =====================================================
  // LOAD REAL DASHBOARD DATA
  // =====================================================

  useEffect(() => {
    if (!rollNumber) {
      return;
    }

    async function fetchRealData() {
      const token =
        localStorage.getItem(
          "campus_token"
        );

      const requestOptions = token
        ? {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        : {};

      // =================================================
      // ATTENDANCE
      // =================================================

      try {
        const response = await fetch(
          `${API_URL}/api/attendance/${encodeURIComponent(
            rollNumber
          )}`,
          requestOptions
        );

        if (response.ok) {
          const attendance = await response.json();

          let attendancePercentage = null;

          if (Array.isArray(attendance)) {
            let totalAttended = 0;
            let totalClasses = 0;

            attendance.forEach((item) => {
              totalAttended +=
                Number(item.ATTENDED_CLASSES) || 0;

              totalClasses +=
                Number(item.TOTAL_CLASSES) || 0;
            });

            if (totalClasses > 0) {
              attendancePercentage = Number(
                (
                  (totalAttended / totalClasses) *
                  100
                ).toFixed(1)
              );
            }
          } else if (
            attendance &&
            attendance.overallPercentage !== undefined
          ) {
            attendancePercentage = Number(
              attendance.overallPercentage
            );
          }

          setDashboardData((prev) => ({
            ...prev,

            attendancePercentage,

            attendanceStatus:
              attendancePercentage === null
                ? "No attendance yet"
                : attendancePercentage >= 75
                ? "Safe (>75%)"
                : "Needs Attention",

            attendanceAvailable: true,
          }));
        } else {
          setDashboardData((prev) => ({
            ...prev,
            attendancePercentage: null,
            attendanceStatus:
              "Attendance unavailable",
            attendanceAvailable: false,
          }));
        }
      } catch (error) {
        console.warn(
          "Attendance dashboard data unavailable:",
          error
        );

        setDashboardData((prev) => ({
          ...prev,
          attendancePercentage: null,
          attendanceStatus:
            "Attendance unavailable",
          attendanceAvailable: false,
        }));
      }

      // =================================================
      // ASSIGNMENTS / EXAMS / TIMETABLE / NOTICES
      // =================================================

      try {
        const [
          assignmentResult,
          examResult,
          timetableResult,
          noticeResult,
        ] = await Promise.allSettled([
          fetch(
            `${API_URL}/api/assignments/${encodeURIComponent(
              rollNumber
            )}`,
            requestOptions
          ).then((response) =>
            response.ok
              ? response.json()
              : null
          ),

          fetch(
            `${API_URL}/api/exams/${encodeURIComponent(
              rollNumber
            )}`,
            requestOptions
          ).then((response) =>
            response.ok
              ? response.json()
              : null
          ),

          fetch(
            `${API_URL}/api/timetable/${encodeURIComponent(
              rollNumber
            )}`,
            requestOptions
          ).then((response) =>
            response.ok
              ? response.json()
              : null
          ),

          fetch(
            `${API_URL}/api/notices`,
            requestOptions
          ).then((response) =>
            response.ok
              ? response.json()
              : null
          ),
        ]);

        // =================================================
        // ASSIGNMENTS
        // =================================================

        const assignments =
          assignmentResult.status === "fulfilled"
            ? assignmentResult.value
            : null;

        const rawAssignments =
          Array.isArray(assignments)
            ? assignments
            : assignments?.assignments;

        let pendingAssignments = [];

        if (Array.isArray(rawAssignments)) {
          pendingAssignments =
            rawAssignments.filter((assignment) => {
              const status = String(
                assignment.status ||
                  assignment.STATUS ||
                  ""
              ).toLowerCase();

              return status === "pending";
            });
        }

        const upcomingAssignments =
          pendingAssignments
            .slice(0, 2)
            .map((assignment, index) => ({
              id:
                assignment.id ||
                assignment.ID ||
                index + 1,

              title:
                assignment.title ||
                assignment.TITLE ||
                "Untitled Assignment",

              due:
                assignment.due_date ||
                assignment.DUE_DATE ||
                "Due date unavailable",

              isUrgent:
                String(
                  assignment.priority ||
                    assignment.PRIORITY ||
                    ""
                ).toLowerCase() === "high",
            }));

        // =================================================
        // EXAMS
        // =================================================

        const exams =
          examResult.status === "fulfilled"
            ? examResult.value
            : null;

        const rawExams =
          Array.isArray(exams)
            ? exams
            : exams?.exams;

        const upcomingExamsCount =
          Array.isArray(rawExams)
            ? rawExams.length
            : 0;

        // =================================================
        // TIMETABLE
        // =================================================

        const timetable =
          timetableResult.status === "fulfilled"
            ? timetableResult.value
            : null;

        const rawTimetable =
          Array.isArray(timetable)
            ? timetable
            : timetable?.classes;

        let todayClasses = [];

        if (Array.isArray(rawTimetable)) {
          const todayName = new Date()
            .toLocaleDateString("en-US", {
              weekday: "long",
            })
            .toLowerCase();

          const matches =
            rawTimetable.filter((item) => {
              const day = String(
                item.day_of_week ||
                  item.DAY_OF_WEEK ||
                  ""
              ).toLowerCase();

              return day === todayName;
            });

          todayClasses = matches.map(
            (item, index) => ({
              subject:
                item.subject_name ||
                item.SUBJECT_NAME ||
                item.subject_code ||
                item.SUBJECT_CODE ||
                "Class",

              room:
                item.room ||
                item.ROOM ||
                "Room not assigned",

              time:
                item.start_time ||
                item.START_TIME ||
                "Time unavailable",

              color:
                index % 2 === 0
                  ? "primary"
                  : "secondary",
            })
          );
        }

        // =================================================
        // NOTICES
        // =================================================

        const notices =
          noticeResult.status === "fulfilled"
            ? noticeResult.value
            : null;

        const rawNotices =
          Array.isArray(notices)
            ? notices
            : notices?.notices;

        const recentNotices =
          Array.isArray(rawNotices)
            ? rawNotices
                .slice(0, 2)
                .map((notice, index) => ({
                  id:
                    notice.id ||
                    notice.ID ||
                    index + 1,

                  title:
                    notice.title ||
                    notice.TITLE ||
                    "Campus Notice",

                  time: `${
                    notice.createdAt ||
                    notice.CREATED_AT ||
                    "Recent"
                  } • ${
                    notice.author ||
                    notice.AUTHOR ||
                    "Administration"
                  }`,

                  isUrgent:
                    String(
                      notice.tag ||
                        notice.TAG ||
                        ""
                    ).toUpperCase() ===
                    "URGENT",
                }))
            : [];

        // =================================================
        // UPDATE DASHBOARD
        // =================================================

        setDashboardData((prev) => ({
          ...prev,

          pendingAssignmentsCount:
            pendingAssignments.length,

          upcomingExamsCount,

          todayClassesCount:
            todayClasses.length,

          todayClasses,

          recentNotices,

          upcomingAssignments,

          assignmentsAvailable:
            assignments !== null,

          examsAvailable:
            exams !== null,

          timetableAvailable:
            timetable !== null,

          noticesAvailable:
            notices !== null,
        }));
      } catch (error) {
        console.warn(
          "Dashboard services unavailable:",
          error
        );

        setDashboardData((prev) => ({
          ...prev,
          assignmentsAvailable: false,
          examsAvailable: false,
          timetableAvailable: false,
          noticesAvailable: false,
        }));
      } finally {
        setLoading(false);
      }
    }

    fetchRealData();
  }, [rollNumber]);

  // =====================================================
  // AI BAR
  // =====================================================

  const handleAISubmit = (event) => {
    event.preventDefault();

    const query = aiQuery.trim();

    if (query) {
      navigate(
        `/ai-chat?q=${encodeURIComponent(query)}`
      );
    } else {
      navigate("/ai-chat");
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    authService.logout();

    navigate("/login", {
      replace: true,
    });
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col">

      {/* =================================================
          MOBILE TOP BAR
      ================================================= */}

      <header className="sticky top-0 w-full z-40 bg-background border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:hidden">

        <div className="flex items-center gap-sm">

          <Link
            to="/profile"
            className="w-10 h-10 rounded-full border border-outline-variant bg-primary-container text-on-primary-container flex items-center justify-center font-bold"
          >
            {getInitials(studentName)}
          </Link>

          <span className="font-headline-lg-mobile font-bold text-primary">
            CampusCopilot
          </span>

        </div>

        <StudentNotificationBell />

      </header>

      {/* =================================================
          DESKTOP LAYOUT
      ================================================= */}

      <div className="flex-1 flex flex-col md:flex-row w-full">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <nav className="hidden md:flex flex-col bg-surface border-r border-outline-variant h-screen w-[280px] shrink-0 sticky top-0">

          {/* Brand */}

          <div className="px-md pt-md pb-sm">

            <span className="font-headline-lg-mobile font-bold text-primary">
              CampusCopilot
            </span>

          </div>

          {/* Student Profile */}

          <Link
            to="/profile"
            className="px-md py-md block hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-sm">

              <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0">
                {getInitials(studentName)}
              </div>

              <div className="min-w-0">

                <div className="font-title-md text-base font-semibold text-on-surface">
                  {studentName}
                </div>

                <div className="font-body-sm text-on-surface-variant leading-5">
                  {department}
                </div>

                <div className="font-label-caps text-outline mt-0.5">
                  ID:{" "}
                  {rollNumber || "--"}
                </div>

              </div>

            </div>
          </Link>

          {/* =================================================
              NAVIGATION
          ================================================= */}

          <div className="px-2 flex flex-col gap-1">

            <Link
              to="/dashboard"
              className="bg-secondary-container text-on-secondary-container rounded-xl font-semibold px-4 py-2.5 flex items-center gap-sm"
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontVariationSettings:
                    "'FILL' 1",
                }}
              >
                dashboard
              </span>

              <span>
                Home
              </span>
            </Link>

            <Link
              to="/timetable"
              className="text-on-surface-variant px-4 py-2.5 hover:bg-surface-container-low rounded-xl flex items-center gap-sm transition-colors"
            >
              <span className="material-symbols-outlined">
                calendar_month
              </span>

              <span>
                Timetable
              </span>
            </Link>

            <Link
              to="/attendance"
              className="text-on-surface-variant px-4 py-2.5 hover:bg-surface-container-low rounded-xl flex items-center gap-sm transition-colors"
            >
              <span className="material-symbols-outlined">
                analytics
              </span>

              <span>
                Attendance
              </span>
            </Link>

            <Link
              to="/assignments"
              className="text-on-surface-variant px-4 py-2.5 hover:bg-surface-container-low rounded-xl flex items-center gap-sm transition-colors"
            >
              <span className="material-symbols-outlined">
                assignment
              </span>

              <span>
                Assignments
              </span>
            </Link>

            <Link
              to="/exams"
              className="text-on-surface-variant px-4 py-2.5 hover:bg-surface-container-low rounded-xl flex items-center gap-sm transition-colors"
            >
              <span className="material-symbols-outlined">
                description
              </span>

              <span>
                Exams
              </span>
            </Link>

            <Link
              to="/notices"
              className="text-on-surface-variant px-4 py-2.5 hover:bg-surface-container-low rounded-xl flex items-center gap-sm transition-colors"
            >
              <span className="material-symbols-outlined">
                campaign
              </span>

              <span>
                Notices
              </span>
            </Link>

            <Link
              to="/ai-analytics"
              className="text-on-surface-variant px-4 py-2.5 hover:bg-surface-container-low rounded-xl flex items-center gap-sm transition-colors"
            >
              <span className="material-symbols-outlined">
                insights
              </span>

              <span>
                AI Analytics
              </span>
            </Link>

            <Link
              to="/resources"
              className="text-on-surface-variant px-4 py-2.5 hover:bg-surface-container-low rounded-xl flex items-center gap-sm transition-colors"
            >
              <span className="material-symbols-outlined">
                folder_open
              </span>

              <span>
                Resources
              </span>
            </Link>

            <Link
              to="/student-id"
              className="text-on-surface-variant px-4 py-2.5 hover:bg-surface-container-low rounded-xl flex items-center gap-sm transition-colors"
            >
              <span className="material-symbols-outlined">
                badge
              </span>

              <span>
                Digital ID
              </span>
            </Link>

          </div>

          {/* =================================================
              TODAY SUMMARY
          ================================================= */}

          <div className="mx-4 mt-md rounded-xl border border-outline-variant bg-surface-container-lowest p-sm">

            <div className="font-label-caps text-outline mb-sm">
              TODAY SUMMARY
            </div>

            <div className="flex flex-col gap-2">

              <Link
                to="/attendance"
                className="flex items-center justify-between gap-2"
              >

                <div className="flex items-center gap-2">

                  <div className="w-7 h-7 rounded-lg bg-secondary-container text-secondary flex items-center justify-center">

                    <span className="material-symbols-outlined text-[16px]">
                      analytics
                    </span>

                  </div>

                  <span className="font-body-sm font-medium text-on-surface">
                    Attendance
                  </span>

                </div>

                <span className="font-body-sm font-bold text-secondary">
                  {dashboardData.attendancePercentage !== null
                    ? `${dashboardData.attendancePercentage}%`
                    : "--"}
                </span>

              </Link>

              <Link
                to="/assignments"
                className="flex items-center justify-between gap-2"
              >

                <div className="flex items-center gap-2">

                  <div className="w-7 h-7 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center">

                    <span className="material-symbols-outlined text-[16px]">
                      assignment
                    </span>

                  </div>

                  <span className="font-body-sm font-medium text-on-surface">
                    Pending Tasks
                  </span>

                </div>

                <span className="font-body-sm font-bold text-error">
                  {dashboardData.assignmentsAvailable === true
                    ? dashboardData.pendingAssignmentsCount
                    : "--"}
                </span>

              </Link>

              <Link
                to="/timetable"
                className="flex items-center justify-between gap-2"
              >

                <div className="flex items-center gap-2">

                  <div className="w-7 h-7 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">

                    <span className="material-symbols-outlined text-[16px]">
                      calendar_month
                    </span>

                  </div>

                  <span className="font-body-sm font-medium text-on-surface">
                    Classes Today
                  </span>

                </div>

                <span className="font-body-sm font-bold text-primary">
                  {dashboardData.timetableAvailable === true
                    ? dashboardData.todayClassesCount
                    : "--"}
                </span>

              </Link>

            </div>

          </div>

          {/* Spacer */}

          <div className="flex-1" />

          {/* Profile / Logout */}

          <div className="px-2 pb-md border-t border-surface-container-high pt-sm mx-2">

            <Link
              to="/profile"
              className="text-on-surface-variant px-4 py-2.5 hover:bg-surface-container-low rounded-xl flex items-center gap-sm transition-colors"
            >
              <span className="material-symbols-outlined">
                account_circle
              </span>

              <span>
                Profile
              </span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-error px-4 py-2.5 hover:bg-error-container/20 rounded-xl flex items-center gap-sm transition-colors text-left"
            >
              <span className="material-symbols-outlined">
                logout
              </span>

              <span>
                Logout
              </span>
            </button>

          </div>

        </nav>

        {/* =================================================
            MAIN AREA
        ================================================= */}

        <main className="flex-1 min-w-0 p-margin-mobile md:p-md lg:p-margin-desktop overflow-y-auto pb-[100px] md:pb-lg">

          {/* =================================================
              WELCOME BANNER
          ================================================= */}

          <section className="hidden md:block relative overflow-hidden bg-gradient-to-r from-primary to-primary-container rounded-2xl px-lg py-md mb-md">

            {/* Decoration */}

            <div className="absolute -right-20 -top-24 w-[280px] h-[280px] rounded-full bg-white/5" />

            <div className="absolute right-12 -bottom-32 w-[260px] h-[260px] rounded-full bg-tertiary-fixed/10" />

            <div className="absolute right-[160px] bottom-5 grid grid-cols-5 gap-1 opacity-20">
              {Array.from({
                length: 15,
              }).map((_, index) => (
                <div
                  key={index}
                  className="w-1 h-1 rounded-full bg-white"
                />
              ))}
            </div>

            {/* Content */}

            <div className="relative z-10 flex justify-between items-start">

              <div>

                <div className="font-label-caps text-secondary-fixed uppercase">
                  Student Dashboard
                </div>

                <h1 className="font-headline-lg text-white font-bold mt-1">
                  Good Morning, {firstName}
                </h1>

                <p className="font-body-md text-primary-fixed mt-1">
                  Here is your academic overview for today.
                </p>

              </div>

              {/* ONLY notification stays here */}

              <div className="shrink-0">

                <StudentNotificationBell />

              </div>

            </div>

          </section>

          {/* MOBILE TITLE */}

          <section className="md:hidden mb-md">

            <h1 className="font-headline-lg-mobile text-on-background font-bold">
              Good Morning, {firstName}
            </h1>

            <p className="font-body-sm text-on-surface-variant mt-1">
              Here is your academic overview for today.
            </p>

          </section>

          {/* =================================================
              STAT CARDS
          ================================================= */}

          <section className="grid grid-cols-2 xl:grid-cols-4 gap-sm md:gap-md mb-md">

            {/* Attendance */}

            <Link
              to="/attendance"
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md min-h-[120px] flex items-center gap-sm hover:shadow-[0_4px_12px_rgba(0,35,111,0.08)] transition-all"
            >

              <div className="w-14 h-14 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">

                <span className="material-symbols-outlined text-[28px]">
                  monitoring
                </span>

              </div>

              <div>

                <div className="font-label-caps text-outline">
                  ATTENDANCE
                </div>

                <div className="font-headline-lg font-bold text-on-surface mt-1">
                  {dashboardData.attendancePercentage !== null
                    ? `${dashboardData.attendancePercentage}%`
                    : "--"}
                </div>

                <div
                  className={`font-body-sm ${
                    dashboardData.attendancePercentage !== null &&
                    dashboardData.attendancePercentage >= 75
                      ? "text-secondary"
                      : "text-error"
                  }`}
                >
                  {dashboardData.attendanceStatus}
                </div>

              </div>

            </Link>

            {/* Pending */}

            <Link
              to="/assignments"
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md min-h-[120px] flex items-center gap-sm hover:shadow-[0_4px_12px_rgba(0,35,111,0.08)] transition-all"
            >

              <div className="w-14 h-14 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">

                <span className="material-symbols-outlined text-[28px]">
                  assignment
                </span>

              </div>

              <div>

                <div className="font-label-caps text-outline">
                  PENDING TASKS
                </div>

                <div className="font-headline-lg font-bold text-on-surface mt-1">
                  {dashboardData.assignmentsAvailable === true
                    ? dashboardData.pendingAssignmentsCount
                    : "--"}
                </div>

                <div className="font-body-sm text-on-surface-variant">
                  {dashboardData.assignmentsAvailable === false
                    ? "Unavailable"
                    : "Due soon"}
                </div>

              </div>

            </Link>

            {/* Exams */}

            <Link
              to="/exams"
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md min-h-[120px] flex items-center gap-sm hover:shadow-[0_4px_12px_rgba(0,35,111,0.08)] transition-all"
            >

              <div className="w-14 h-14 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">

                <span className="material-symbols-outlined text-[28px]">
                  description
                </span>

              </div>

              <div>

                <div className="font-label-caps text-outline">
                  UPCOMING EXAMS
                </div>

                <div className="font-headline-lg font-bold text-on-surface mt-1">
                  {dashboardData.examsAvailable === true
                    ? dashboardData.upcomingExamsCount
                    : "--"}
                </div>

                <div className="font-body-sm text-on-surface-variant">
                  {dashboardData.examsAvailable === false
                    ? "Unavailable"
                    : "This term"}
                </div>

              </div>

            </Link>

            {/* Classes */}

            <Link
              to="/timetable"
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md min-h-[120px] flex items-center gap-sm hover:shadow-[0_4px_12px_rgba(0,35,111,0.08)] transition-all"
            >

              <div className="w-14 h-14 rounded-xl bg-secondary-container/60 text-secondary flex items-center justify-center shrink-0">

                <span className="material-symbols-outlined text-[28px]">
                  school
                </span>

              </div>

              <div>

                <div className="font-label-caps text-outline">
                  CLASSES TODAY
                </div>

                <div className="font-headline-lg font-bold text-on-surface mt-1">
                  {dashboardData.timetableAvailable === true
                    ? dashboardData.todayClassesCount
                    : "--"}
                </div>

                <div className="font-body-sm text-on-surface-variant">
                  {dashboardData.timetableAvailable === false
                    ? "Unavailable"
                    : "Schedule"}
                </div>

              </div>

            </Link>

          </section>

          {/* =================================================
              FIRST CONTENT ROW
          ================================================= */}

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-md mb-md">

            {/* TODAY'S CLASSES */}

            <article className="xl:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-md">

              <div className="flex justify-between items-center mb-sm">

                <h2 className="font-title-md font-bold text-on-surface">
                  Today's Classes
                </h2>

                <Link
                  to="/timetable"
                  className="font-label-caps text-primary hover:underline"
                >
                  VIEW TIMETABLE
                </Link>

              </div>

              {loading &&
              dashboardData.timetableAvailable === null ? (
                <div className="min-h-[160px] flex items-center justify-center text-center">

                  <p className="font-body-sm text-on-surface-variant">
                    Loading today's classes...
                  </p>

                </div>
              ) : dashboardData.timetableAvailable === false ? (
                <div className="min-h-[160px] flex flex-col items-center justify-center text-center">

                  <span className="material-symbols-outlined text-outline text-4xl">
                    cloud_off
                  </span>

                  <p className="font-body-sm text-on-surface-variant mt-2">
                    Today's class schedule is unavailable.
                  </p>

                </div>
              ) : dashboardData.todayClasses.length === 0 ? (
                <div className="min-h-[160px] flex flex-col items-center justify-center text-center">

                  <span className="material-symbols-outlined text-outline text-4xl">
                    event_available
                  </span>

                  <p className="font-body-sm text-on-surface-variant mt-2">
                    No classes scheduled for today.
                  </p>

                </div>
              ) : (
                <div className="flex flex-col gap-sm">

                  {dashboardData.todayClasses.map(
                    (cls, index) => (
                      <div
                        key={`${cls.subject}-${index}`}
                        className="relative overflow-hidden border border-outline-variant rounded-xl p-sm md:p-4 bg-surface min-h-[88px]"
                      >

                        <div
                          className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                            cls.color === "primary"
                              ? "bg-primary"
                              : "bg-secondary"
                          }`}
                        />

                        <div className="flex items-center justify-between gap-4 h-full">

                          <div className="pl-1">

                            <div className="font-title-md font-semibold text-on-surface">
                              {cls.subject}
                            </div>

                            <div className="font-body-sm text-on-surface-variant flex items-center gap-1 mt-1">

                              <span className="material-symbols-outlined text-[16px]">
                                location_on
                              </span>

                              {cls.room}

                            </div>

                          </div>

                          <span
                            className={`font-label-caps px-3 py-1 rounded-full ${
                              cls.color === "primary"
                                ? "bg-primary-fixed text-primary"
                                : "bg-secondary-container text-secondary"
                            }`}
                          >
                            {cls.time}
                          </span>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </article>

            {/* ASSIGNMENTS */}

            <article className="xl:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-md">

              <div className="flex justify-between items-center mb-sm">

                <h2 className="font-title-md font-bold text-on-surface">
                  Upcoming Assignments
                </h2>

                <Link
                  to="/assignments"
                  className="font-label-caps text-primary hover:underline"
                >
                  VIEW ALL
                </Link>

              </div>

              {loading &&
              dashboardData.assignmentsAvailable === null ? (
                <div className="min-h-[160px] flex items-center justify-center text-center">

                  <p className="font-body-sm text-on-surface-variant">
                    Loading assignments...
                  </p>

                </div>
              ) : dashboardData.assignmentsAvailable === false ? (
                <div className="min-h-[160px] flex flex-col items-center justify-center text-center">

                  <span className="material-symbols-outlined text-outline text-4xl">
                    cloud_off
                  </span>

                  <p className="font-body-sm text-on-surface-variant mt-2">
                    Assignments are unavailable.
                  </p>

                </div>
              ) : dashboardData.upcomingAssignments.length === 0 ? (
                <div className="min-h-[160px] flex flex-col items-center justify-center text-center">

                  <span className="material-symbols-outlined text-outline text-4xl">
                    task_alt
                  </span>

                  <p className="font-body-sm text-on-surface-variant mt-2">
                    No pending assignments.
                  </p>

                </div>
              ) : (
                <div className="flex flex-col gap-sm">

                  {dashboardData.upcomingAssignments.map(
                    (assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between gap-3 border border-outline-variant rounded-xl bg-surface p-sm md:p-4 min-h-[88px]"
                      >

                        <div className="flex items-start gap-3 min-w-0">

                          <div
                            className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                              assignment.isUrgent
                                ? "bg-error"
                                : "bg-outline"
                            }`}
                          />

                          <div className="min-w-0">

                            <div className="font-body-md font-semibold text-on-surface">
                              {assignment.title}
                            </div>

                            <div
                              className={`font-body-sm flex items-center gap-1 mt-1 ${
                                assignment.isUrgent
                                  ? "text-error"
                                  : "text-on-surface-variant"
                              }`}
                            >

                              <span className="material-symbols-outlined text-[16px]">
                                schedule
                              </span>

                              {assignment.due}

                            </div>

                          </div>

                        </div>

                        <Link
                          to="/assignments"
                          className="w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center text-outline hover:bg-primary hover:text-on-primary hover:border-primary transition-colors shrink-0"
                        >

                          <span className="material-symbols-outlined text-[18px]">
                            arrow_forward
                          </span>

                        </Link>

                      </div>
                    )
                  )}

                </div>
              )}

            </article>

          </section>

          {/* =================================================
              SECOND ROW
          ================================================= */}

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-md">

            {/* NOTICES */}

            <article className="xl:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-md">

              <div className="flex justify-between items-center mb-sm">

                <h2 className="font-title-md font-bold text-on-surface">
                  Recent Notices
                </h2>

                <Link
                  to="/notices"
                  className="font-label-caps text-primary hover:underline"
                >
                  ALL NOTICES
                </Link>

              </div>

              {loading &&
              dashboardData.noticesAvailable === null ? (
                <div className="min-h-[145px] flex items-center justify-center text-center">

                  <p className="font-body-sm text-on-surface-variant">
                    Loading notices...
                  </p>

                </div>
              ) : dashboardData.noticesAvailable === false ? (
                <div className="min-h-[145px] flex flex-col items-center justify-center text-center">

                  <span className="material-symbols-outlined text-outline text-4xl">
                    cloud_off
                  </span>

                  <p className="font-body-sm text-on-surface-variant mt-2">
                    Notices are unavailable.
                  </p>

                </div>
              ) : dashboardData.recentNotices.length === 0 ? (
                <div className="min-h-[145px] flex flex-col items-center justify-center">

                  <span className="material-symbols-outlined text-outline text-4xl">
                    campaign
                  </span>

                  <p className="font-body-sm text-on-surface-variant mt-2">
                    No notices available.
                  </p>

                </div>
              ) : (
                <div className="divide-y divide-surface-container-high">

                  {dashboardData.recentNotices.map(
                    (notice) => (
                      <div
                        key={notice.id}
                        className="py-sm flex items-start gap-sm"
                      >

                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            notice.isUrgent
                              ? "bg-error-container text-error"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >

                          <span className="material-symbols-outlined text-[18px]">
                            {notice.isUrgent
                              ? "warning"
                              : "campaign"}
                          </span>

                        </div>

                        <div>

                          <div className="font-body-md font-semibold text-on-surface">
                            {notice.title}
                          </div>

                          <div className="font-body-sm text-outline mt-0.5">
                            {notice.time}
                          </div>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </article>

            {/* COPILOT INSIGHTS */}

            <article className="xl:col-span-6 relative overflow-hidden rounded-xl border border-tertiary-fixed-dim bg-gradient-to-br from-tertiary-fixed/30 via-surface-container-lowest to-secondary-container/20 p-md min-h-[220px]">

              <div className="absolute -right-14 -top-20 w-[260px] h-[260px] rounded-full bg-tertiary-fixed/40" />

              <div className="absolute right-8 bottom-8 text-tertiary-fixed-dim opacity-70">

                <span className="material-symbols-outlined text-[26px]">
                  auto_awesome
                </span>

              </div>

              <div className="relative z-10">

                <div className="flex items-center gap-sm">

                  <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center">

                    <span className="material-symbols-outlined">
                      smart_toy
                    </span>

                  </div>

                  <div>

                    <h3 className="font-title-md font-bold text-tertiary">
                      Copilot Insights
                    </h3>

                    <div className="font-label-caps text-outline mt-0.5">
                      CAMPUSCOPILOT INTELLIGENCE
                    </div>

                  </div>

                </div>

                <p className="font-body-sm text-on-surface-variant leading-6 mt-sm max-w-[520px]">

                  Ask CampusCopilot to analyze your current attendance,
                  assignments, exams, timetable and academic resources.

                </p>

                <Link
                  to="/ai-chat"
                  className="inline-flex items-center gap-2 mt-md text-tertiary font-semibold text-sm hover:underline"
                >

                  Ask Copilot for study plan

                  <span className="material-symbols-outlined text-[17px]">
                    arrow_forward
                  </span>

                </Link>

              </div>

            </article>

          </section>

          {/* =================================================
              SPACE BETWEEN CARDS AND COPILOT BAR
          ================================================= */}

          <div className="h-8 md:h-10" />

          {/* =================================================
              ASK COPILOT BAR
          ================================================= */}

          <div className="fixed md:sticky bottom-[72px] md:bottom-5 left-0 z-30 w-full px-margin-mobile md:px-0">

            <form
              onSubmit={handleAISubmit}
              className="w-full bg-surface-container-lowest/95 backdrop-blur-[12px] border border-outline-variant rounded-xl p-2 flex items-center gap-sm shadow-[0_6px_24px_rgba(25,28,30,0.10)] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all"
            >

              <div className="w-10 h-10 bg-tertiary-fixed text-tertiary rounded-xl flex items-center justify-center shrink-0">

                <span className="material-symbols-outlined">
                  smart_toy
                </span>

              </div>

              <input
                type="text"
                value={aiQuery}
                onChange={(event) =>
                  setAiQuery(event.target.value)
                }
                placeholder="Ask CampusCopilot about your classes, attendance, assignments, exams, resources..."
                className="flex-1 min-w-0 bg-transparent border-none outline-none font-body-md text-on-surface placeholder:text-outline py-2"
              />

              <span className="hidden lg:block font-label-caps text-outline px-sm">
                ASK AI
              </span>

              <button
                type="submit"
                className="w-11 h-11 rounded-xl bg-gradient-to-r from-secondary to-tertiary text-white flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
              >

                <span
                  className="material-symbols-outlined"
                  style={{
                    fontVariationSettings:
                      "'FILL' 1",
                  }}
                >
                  arrow_upward
                </span>

              </button>

            </form>

          </div>

        </main>

      </div>

      {/* =================================================
          MOBILE NAVIGATION
      ================================================= */}

      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-outline-variant md:hidden">

        <div className="flex justify-around items-center px-margin-mobile w-full h-full">

          <Link
            to="/dashboard"
            className="flex flex-col items-center justify-center text-primary font-semibold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              dashboard
            </span>

            <span className="text-[11px]">
              Home
            </span>
          </Link>

          <Link
            to="/attendance"
            className="flex flex-col items-center justify-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined">
              analytics
            </span>

            <span className="text-[11px]">
              Attendance
            </span>
          </Link>

          <Link
            to="/ai-chat"
            className="flex flex-col items-center justify-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined">
              smart_toy
            </span>

            <span className="text-[11px]">
              Copilot
            </span>
          </Link>

          <Link
            to="/assignments"
            className="flex flex-col items-center justify-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined">
              assignment
            </span>

            <span className="text-[11px]">
              Tasks
            </span>
          </Link>

          <Link
            to="/profile"
            className="flex flex-col items-center justify-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined">
              account_circle
            </span>

            <span className="text-[11px]">
              Profile
            </span>
          </Link>

        </div>

      </nav>

    </div>
  );
}
