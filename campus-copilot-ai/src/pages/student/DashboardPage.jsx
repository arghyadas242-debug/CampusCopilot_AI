import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { authService } from "../../services/api";

const API_URL = "http://localhost:5000";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [aiQuery, setAiQuery] = useState("");

  const currentUser = authService.getCurrentUser();
  const studentName = currentUser?.name || "Ratul Das";
  const firstName = studentName.trim().split(" ")[0];
  const department = currentUser?.department || "Computer Science Dept.";
  const rollNumber = currentUser?.rollNumber || currentUser?.roll_number || "2026-001";

  const getInitials = (name) => {
    if (!name) return "RD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const [dashboardData, setDashboardData] = useState({
    attendancePercentage: null,
    attendanceStatus: "Safe (>75%)",
    pendingAssignmentsCount: [],
    upcomingExamsCount: [],
    todayClassesCount: [],
    todayClasses: [
      {
        subject: "Database Management Systems",
        room: "Room 302",
        time: "10:00 AM",
        color: "primary",
      },
      {
        subject: "Computer Networks",
        room: "Room 405",
        time: "11:00 AM",
        color: "secondary",
      },
    ],
    recentNotices: [
      {
        id: 1,
        title: "Semester Examination Schedule Released",
        time: "2 hours ago • Exam Cell",
        isUrgent: true,
      },
      {
        id: 2,
        title: "Holiday Notice: Campus Sports Day",
        time: "Yesterday • Dean Office",
        isUrgent: false,
      },
    ],
    upcomingAssignments: [
      {
        id: 1,
        title: "DBMS Normalization Problem Set",
        due: "Due Tomorrow, 11:59 PM",
        isUrgent: true,
      },
      {
        id: 2,
        title: "Computer Networks Lab Report",
        due: "Due in 3 days",
        isUrgent: false,
      },
    ],
  });

  const roll = rollNumber;

  useEffect(() => {
    async function fetchRealData() {
      // 1. Attendance Logic
      try {
        const response = await fetch(
          `${API_URL}/api/attendance/${encodeURIComponent(roll)}`
        );

        if (response.ok) {
          const attendance = await response.json();

          let attendancePercentage = 0;

          // Your current Oracle attendance API returns an array
          if (Array.isArray(attendance)) {
            let totalAttended = 0;
            let totalClasses = 0;

            attendance.forEach((item) => {
              totalAttended += Number(item.ATTENDED_CLASSES) || 0;
              totalClasses += Number(item.TOTAL_CLASSES) || 0;
            });

            if (totalClasses > 0) {
              attendancePercentage = Number(
                ((totalAttended / totalClasses) * 100).toFixed(1)
              );
            }
          }
          // Also supports an object response if API changes later
          else if (
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
            attendanceStatus: attendancePercentage >= 75 ? "Safe (>75%)" : "Needs Attention (<75%)",
          }));
        }
      } catch (error) {
        console.warn(
          "Attendance dashboard data unavailable:",
          error
        );
      }

      // 2. Assignments, Exams, Timetable, Notices
      try {
        const [asgRes, examRes, ttRes, notRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/assignments/${encodeURIComponent(roll)}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/api/exams/${encodeURIComponent(roll)}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/api/timetable/${encodeURIComponent(roll)}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/api/notices`).then((r) => (r.ok ? r.json() : null)),
        ]);

        const asg = asgRes.status === "fulfilled" ? asgRes.value : null;
        const exams = examRes.status === "fulfilled" ? examRes.value : null;
        const tt = ttRes.status === "fulfilled" ? ttRes.value : null;
        const notices = notRes.status === "fulfilled" ? notRes.value : null;

        // Assignments
        let assignmentsList = dashboardData.upcomingAssignments;
        let pendingCount = dashboardData.pendingAssignmentsCount;
        const rawAsg = Array.isArray(asg) ? asg : asg?.assignments;
        if (rawAsg && rawAsg.length > 0) {
          const pending = rawAsg.filter(
            (a) => String(a.status || a.STATUS || "pending").toLowerCase() === "pending"
          );
          pendingCount = pending.length;
          assignmentsList = pending.slice(0, 2).map((a, idx) => ({
            id: a.id || a.ID || idx + 1,
            title: a.title || a.TITLE || "Assignment",
            due: a.due_date || a.DUE_DATE || "Due soon",
            isUrgent: String(a.priority || a.PRIORITY || "").toLowerCase() === "high",
          }));
        }

        // Exams
        let examCount = dashboardData.upcomingExamsCount;
        const rawExams = Array.isArray(exams) ? exams : exams?.exams;
        if (rawExams && rawExams.length > 0) {
          examCount = rawExams.length;
        }

        // Timetable
        let todayClassesList = dashboardData.todayClasses;
        let todayCount = dashboardData.todayClassesCount;
        const rawTt = Array.isArray(tt) ? tt : tt?.classes;
        if (rawTt && rawTt.length > 0) {
          const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
          const matches = rawTt.filter(
            (item) => String(item.day_of_week || item.DAY_OF_WEEK || "").toLowerCase() === todayName
          );
          const chosen = matches.length > 0 ? matches : rawTt.slice(0, 2);
          todayCount = chosen.length;
          todayClassesList = chosen.map((c, idx) => ({
            subject: c.subject_name || c.SUBJECT_NAME || c.subject_code || c.SUBJECT_CODE || "Lecture",
            room: c.room || c.ROOM || "Room 302",
            time: c.start_time || c.START_TIME || "10:00 AM",
            color: idx % 2 === 0 ? "primary" : "secondary",
          }));
        }

        // Notices
        let noticesList = dashboardData.recentNotices;
        const rawNotices = Array.isArray(notices) ? notices : notices?.notices;
        if (rawNotices && rawNotices.length > 0) {
          noticesList = rawNotices.slice(0, 2).map((n, idx) => ({
            id: n.id || n.ID || idx + 1,
            title: n.title || n.TITLE || "Campus Notice",
            time: `${n.createdAt || n.CREATED_AT || "Recent"} • ${n.author || n.AUTHOR || "Administration"}`,
            isUrgent: String(n.tag || n.TAG || "").toUpperCase() === "URGENT",
          }));
        }

        setDashboardData((prev) => ({
          ...prev,
          pendingAssignmentsCount: pendingCount,
          upcomingExamsCount: examCount,
          todayClassesCount: todayCount,
          todayClasses: todayClassesList,
          recentNotices: noticesList,
          upcomingAssignments: assignmentsList,
        }));
      } catch (err) {
        console.warn("Other dashboard services fetch warning:", err);
      }
    }

    fetchRealData();
  }, [roll]);

  const handleAISubmit = (e) => {
    e.preventDefault();
    if (aiQuery.trim()) {
      navigate(`/ai-chat?q=${encodeURIComponent(aiQuery)}`);
    } else {
      navigate("/ai-chat");
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col">
      {/* TopAppBar (Mobile) */}
      <header className="sticky top-0 w-full z-40 bg-background border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:hidden">
        <div className="flex items-center gap-sm">
          <Link
            to="/profile"
            className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant bg-primary-container text-on-primary-container flex items-center justify-center font-bold"
          >
            {getInitials(studentName)}
          </Link>
          <span className="font-headline-lg-mobile font-bold text-primary">CampusCopilot</span>
        </div>
        <Link to="/notices" className="text-on-surface-variant hover:opacity-80">
          <span className="material-symbols-outlined">notifications</span>
        </Link>
      </header>

      {/* Main Content Layout (Desktop Grid / Mobile Stack) */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1440px] mx-auto w-full">
        {/* NavigationDrawer (Desktop) */}
        <nav className="hidden md:flex flex-col py-md bg-surface border-r border-outline-variant h-[calc(100vh-64px)] w-[280px] rounded-r-xl shadow-xl sticky top-0">
          <div className="px-md mb-xl flex items-center gap-sm">
            <span className="font-headline-lg font-bold text-primary">CampusCopilot</span>
          </div>

          <Link to="/profile" className="px-md mb-lg block hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-sm">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg">
                {getInitials(studentName)}
              </div>
              <div>
                <div className="font-title-md text-on-surface">{studentName}</div>
                <div className="font-body-sm text-on-surface-variant">{department}</div>
                <div className="font-label-caps text-outline">ID: {rollNumber}</div>
              </div>
            </div>
          </Link>

          <div className="flex flex-col gap-xs flex-1 overflow-y-auto">
            <Link
              to="/dashboard"
              className="bg-secondary-container text-on-secondary-container rounded-full mx-2 font-bold px-4 py-2 flex items-center gap-sm transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                dashboard
              </span>
              <span className="font-body-md">Home</span>
            </Link>
            <Link
              to="/timetable"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-sm transition-all"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="font-body-md">Timetable</span>
            </Link>
            <Link
              to="/attendance"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-sm transition-all"
            >
              <span className="material-symbols-outlined">analytics</span>
              <span className="font-body-md">Attendance</span>
            </Link>
            <Link
              to="/assignments"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-sm transition-all"
            >
              <span className="material-symbols-outlined">assignment</span>
              <span className="font-body-md">Assignments</span>
            </Link>
            <Link
              to="/exams"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-sm transition-all"
            >
              <span className="material-symbols-outlined">description</span>
              <span className="font-body-md">Exams</span>
            </Link>
            <Link
              to="/notices"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-sm transition-all"
            >
              <span className="material-symbols-outlined">campaign</span>
              <span className="font-body-md">Notices</span>
            </Link>
            <Link
              to="/ai-analytics"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-sm transition-all"
            >
              <span className="material-symbols-outlined">insights</span>
              <span className="font-body-md">AI Analytics</span>
            </Link>
            <Link
              to="/resources"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-sm transition-all"
            >
              <span className="material-symbols-outlined">folder_open</span>
              <span className="font-body-md">Resources</span>
            </Link>
            <Link
              to="/student-id"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-sm transition-all"
            >
              <span className="material-symbols-outlined">badge</span>
              <span className="font-body-md">Digital ID</span>
            </Link>
            <Link
              to="/profile"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-sm transition-all mt-auto"
            >
              <span className="material-symbols-outlined">account_circle</span>
              <span className="font-body-md">Profile</span>
            </Link>
            <button
              onClick={() => navigate("/login")}
              className="text-error mx-2 px-4 py-2 hover:bg-error-container/20 rounded-full flex items-center gap-sm transition-all cursor-pointer text-left"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="font-body-md">Logout</span>
            </button>
          </div>
        </nav>

        {/* Main Canvas */}
        <main className="flex-1 p-margin-mobile md:p-margin-desktop overflow-y-auto pb-[90px] md:pb-margin-desktop">
          {/* Header */}
          <div className="mb-lg hidden md:block">
            <h1 className="font-display-lg text-on-background">Good Morning, {firstName}</h1>
            <p className="font-body-md text-on-surface-variant mt-1">Here is your academic overview for today.</p>
          </div>
          <div className="mb-md md:hidden">
            <h1 className="font-headline-lg-mobile text-on-background">Good Morning, {firstName}</h1>
            <p className="font-body-sm text-on-surface-variant">Here is your academic overview for today.</p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-md">
            {/* Quick Stats Row */}
            <div className="col-span-1 md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-sm md:gap-md">
              <Link to="/attendance" className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-sm">
                  <span className="font-label-caps text-outline">ATTENDANCE</span>
                  <span className="material-symbols-outlined text-secondary">analytics</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-headline-lg text-on-surface font-bold">{dashboardData.attendancePercentage}%</span>
                  <span className={`font-body-sm mb-1 ${dashboardData.attendancePercentage >= 75 ? "text-secondary" : "text-error"}`}>
                    {dashboardData.attendanceStatus}
                  </span>
                </div>
              </Link>

              <Link to="/assignments" className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-sm">
                  <span className="font-label-caps text-outline">PENDING TASKS</span>
                  <span className="material-symbols-outlined text-primary">assignment</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-headline-lg text-on-surface font-bold">{dashboardData.pendingAssignmentsCount}</span>
                  <span className="font-body-sm text-on-surface-variant mb-1">Due soon</span>
                </div>
              </Link>

              <Link to="/exams" className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-sm">
                  <span className="font-label-caps text-outline">UPCOMING EXAMS</span>
                  <span className="material-symbols-outlined text-primary">description</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-headline-lg text-on-surface font-bold">{dashboardData.upcomingExamsCount}</span>
                  <span className="font-body-sm text-on-surface-variant mb-1">This term</span>
                </div>
              </Link>

              <Link to="/timetable" className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-sm">
                  <span className="font-label-caps text-outline">CLASSES TODAY</span>
                  <span className="material-symbols-outlined text-secondary">school</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-headline-lg text-on-surface font-bold">{dashboardData.todayClassesCount}</span>
                  <span className="font-body-sm text-on-surface-variant mb-1">Schedule</span>
                </div>
              </Link>
            </div>

            {/* Left Column */}
            <div className="col-span-1 md:col-span-7 flex flex-col gap-md">
              {/* Today's Classes */}
              <div className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-md shadow-sm">
                <div className="flex justify-between items-center mb-sm">
                  <h2 className="font-title-md text-on-surface font-bold">Today's Classes</h2>
                  <Link to="/timetable" className="font-label-caps text-primary hover:underline">
                    VIEW TIMETABLE
                  </Link>
                </div>
                <div className="flex flex-col gap-sm">
                  {dashboardData.todayClasses.map((cls, idx) => (
                    <div key={idx} className="relative overflow-hidden border border-[#E2E8F0] rounded-lg p-sm bg-surface">
                      <div className={`absolute top-0 left-0 w-full h-1 ${cls.color === "primary" ? "bg-primary" : "bg-secondary"}`}></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-title-md text-on-surface font-semibold">{cls.subject}</div>
                          <div className="font-body-sm text-on-surface-variant flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[16px]">location_on</span> {cls.room}
                          </div>
                        </div>
                        <div className={`${cls.color === "primary" ? "bg-primary-container text-on-primary-container" : "bg-secondary-container text-on-secondary-container"} px-3 py-1 rounded-full font-label-caps font-semibold`}>
                          {cls.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Notices */}
              <div className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-md shadow-sm">
                <div className="flex justify-between items-center mb-sm">
                  <h2 className="font-title-md text-on-surface font-bold">Recent Notices</h2>
                  <Link to="/notices" className="font-label-caps text-primary hover:underline">
                    ALL NOTICES
                  </Link>
                </div>
                <ul className="flex flex-col gap-sm divide-y divide-surface-variant">
                  {dashboardData.recentNotices.map((n) => (
                    <li key={n.id} className="pt-sm first:pt-0 flex items-start gap-sm">
                      <div className={`w-8 h-8 rounded-full ${n.isUrgent ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-on-surface-variant"} flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: n.isUrgent ? "'FILL' 1" : "'FILL' 0" }}>
                          {n.isUrgent ? "warning" : "campaign"}
                        </span>
                      </div>
                      <div>
                        <div className="font-body-md font-semibold text-on-surface">{n.title}</div>
                        <div className="font-body-sm text-outline mt-0.5">{n.time}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-span-1 md:col-span-5 flex flex-col gap-md">
              {/* Upcoming Assignments */}
              <div className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-md shadow-sm">
                <div className="flex items-center justify-between mb-sm">
                  <h2 className="font-title-md text-on-surface font-bold">Upcoming Assignments</h2>
                  <Link to="/assignments" className="font-label-caps text-primary hover:underline">
                    VIEW ALL
                  </Link>
                </div>
                <div className="flex flex-col gap-xs">
                  {dashboardData.upcomingAssignments.map((a) => (
                    <div key={a.id} className="group flex items-center justify-between p-sm border border-transparent hover:border-outline-variant rounded-lg transition-colors bg-surface-bright">
                      <div>
                        <div className="font-body-md font-semibold text-on-surface">{a.title}</div>
                        <div className={`font-body-sm ${a.isUrgent ? "text-error" : "text-on-surface-variant"} mt-0.5 flex items-center gap-1`}>
                          <span className="material-symbols-outlined text-[14px]">schedule</span> {a.due}
                        </div>
                      </div>
                      <Link to="/assignments" className="w-8 h-8 rounded-full border border-outline flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-on-primary group-hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">upload</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Copilot Suggestion Area */}
              <div className="ai-layer rounded-xl p-md relative overflow-hidden flex-1 min-h-[180px] shadow-sm">
                <h3 className="font-title-md mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary">smart_toy</span>
                  <span className="ai-gradient-text font-bold">Copilot Insights</span>
                </h3>
                <p className="font-body-sm text-on-surface-variant relative z-10">
                  Based on your upcoming schedule, I recommend reviewing your <strong className="text-on-surface">DBMS Assignment</strong> tasks tonight. It usually takes students about 3 hours to complete.
                </p>
                <div className="mt-3">
                  <Link to="/ai-chat" className="inline-flex items-center gap-1 text-xs font-semibold text-tertiary hover:underline">
                    Ask Copilot for study plan <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* AI Entry Point bar */}
          <div className="fixed md:sticky bottom-[70px] md:bottom-margin-desktop left-0 w-full px-margin-mobile md:px-0 mt-xl z-30 flex justify-center">
            <form onSubmit={handleAISubmit} className="w-full max-w-2xl bg-surface-container-lowest glass-panel rounded-full shadow-lg border border-[#E2E8F0] p-1.5 flex items-center group focus-within:border-primary transition-all">
              <span className="material-symbols-outlined text-outline ml-3 mr-1">smart_toy</span>
              <input
                className="flex-1 bg-transparent border-none focus:outline-none font-body-md text-on-surface placeholder:text-outline-variant py-2 px-2"
                placeholder="Ask CampusCopilot about your classes, attendance, assignments..."
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-secondary to-tertiary text-on-primary rounded-full p-2 mr-1 shadow-md hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  arrow_upward
                </span>
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="bg-surface fixed bottom-0 w-full z-50 h-[64px] flex justify-around items-center px-margin-mobile md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-surface-container-high">
        <Link to="/dashboard" className="flex flex-col items-center justify-center text-primary relative active:scale-95 transition-transform">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            dashboard
          </span>
          <span className="text-[11px] font-semibold">Home</span>
        </Link>
        <Link to="/attendance" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-95">
          <span className="material-symbols-outlined">analytics</span>
          <span className="text-[11px]">Attendance</span>
        </Link>
        <Link to="/ai-chat" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-95">
          <span className="material-symbols-outlined">smart_toy</span>
          <span className="text-[11px]">Copilot</span>
        </Link>
        <Link to="/assignments" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-95">
          <span className="material-symbols-outlined">assignment</span>
          <span className="text-[11px]">Tasks</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-95">
          <span className="material-symbols-outlined">account_circle</span>
          <span className="text-[11px]">Profile</span>
        </Link>
      </nav>
    </div>
  );
}