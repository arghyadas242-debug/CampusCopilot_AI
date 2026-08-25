import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { authService } from "../../services/api";

const API_URL = "http://localhost:5000";

const DEFAULT_DASHBOARD_DATA = {
  attendancePercentage: 81.2,
  pendingAssignments: [
    {
      ID: 1,
      TITLE: "ER Modeling & Schema Normalization",
      SUBJECT_NAME: "Database Management Systems",
      DUE_DATE: "28-08-2026",
      PRIORITY: "High",
      STATUS: "pending",
    },
    {
      ID: 2,
      TITLE: "Socket Programming in C / Python",
      SUBJECT_NAME: "Computer Networks",
      DUE_DATE: "30-08-2026",
      PRIORITY: "Medium",
      STATUS: "pending",
    },
  ],
  upcomingExams: [
    {
      ID: 1,
      SUBJECT_CODE: "CS301",
      SUBJECT_NAME: "Database Management Systems",
      EXAM_DATE: "12-09-2026",
      START_TIME: "10:00 AM",
      END_TIME: "01:00 PM",
      ROOM: "Hall A (Room 302)",
      EXAM_TYPE: "End-Semester Theory",
    },
    {
      ID: 2,
      SUBJECT_CODE: "CS302",
      SUBJECT_NAME: "Computer Networks",
      EXAM_DATE: "15-09-2026",
      START_TIME: "02:00 PM",
      END_TIME: "05:00 PM",
      ROOM: "Hall B (Room 105)",
      EXAM_TYPE: "End-Semester Theory",
    },
  ],
  todayClasses: [
    {
      ID: 1,
      SUBJECT_CODE: "CS301",
      SUBJECT_NAME: "Database Management Systems",
      START_TIME: "09:30 AM",
      END_TIME: "10:30 AM",
      ROOM: "LH-302",
      FACULTY_NAME: "Prof. Alan Turing",
    },
    {
      ID: 2,
      SUBJECT_CODE: "CS302",
      SUBJECT_NAME: "Computer Networks",
      START_TIME: "10:30 AM",
      END_TIME: "11:30 AM",
      ROOM: "LH-302",
      FACULTY_NAME: "Dr. Grace Hopper",
    },
    {
      ID: 3,
      SUBJECT_CODE: "CS303",
      SUBJECT_NAME: "Operating Systems Lab",
      START_TIME: "01:30 PM",
      END_TIME: "03:30 PM",
      ROOM: "Lab 2",
      FACULTY_NAME: "Dr. Linus Torvalds",
    },
  ],
  recentNotices: [
    {
      ID: 1,
      TITLE: "Semester Examination Schedule Released",
      AUTHOR: "Exam Cell",
      TAG: "URGENT",
      CREATED_AT: "2 hours ago",
    },
    {
      ID: 2,
      TITLE: "Annual Hackathon & AI Innovation Challenge 2026",
      AUTHOR: "ACM Chapter",
      TAG: "EVENT",
      CREATED_AT: "Yesterday",
    },
  ],
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const [aiQuery, setAiQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(DEFAULT_DASHBOARD_DATA);

  const currentUser = authService.getCurrentUser();
  const roll = currentUser?.rollNumber || "12024002037008";

  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        // Fetch each endpoint safely with individual fallbacks
        const [
          attendanceRes,
          assignmentRes,
          examRes,
          timetableRes,
          noticeRes,
        ] = await Promise.allSettled([
          fetch(`${API_URL}/api/attendance/${encodeURIComponent(roll)}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/api/assignments/${encodeURIComponent(roll)}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/api/exams/${encodeURIComponent(roll)}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/api/timetable/${encodeURIComponent(roll)}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/api/notices`).then((r) => (r.ok ? r.json() : null)),
        ]);

        const attendanceData = attendanceRes.status === "fulfilled" ? attendanceRes.value : null;
        const assignmentsData = assignmentRes.status === "fulfilled" ? assignmentRes.value : null;
        const examsData = examRes.status === "fulfilled" ? examRes.value : null;
        const timetableData = timetableRes.status === "fulfilled" ? timetableRes.value : null;
        const noticesData = noticeRes.status === "fulfilled" ? noticeRes.value : null;

        // 1. Attendance
        let attendancePercentage = DEFAULT_DASHBOARD_DATA.attendancePercentage;
        if (attendanceData) {
          if (typeof attendanceData.overallPercentage === "number") {
            attendancePercentage = attendanceData.overallPercentage;
          } else if (Array.isArray(attendanceData.subjects) && attendanceData.subjects.length > 0) {
            let totalAttended = 0;
            let totalClasses = 0;
            attendanceData.subjects.forEach((s) => {
              totalAttended += Number(s.attended || s.ATTENDED_CLASSES) || 0;
              totalClasses += Number(s.total || s.TOTAL_CLASSES) || 0;
            });
            if (totalClasses > 0) {
              attendancePercentage = Number(((totalAttended / totalClasses) * 100).toFixed(1));
            }
          }
        }

        // 2. Assignments
        let pendingAssignments = DEFAULT_DASHBOARD_DATA.pendingAssignments;
        const rawAssignments = Array.isArray(assignmentsData)
          ? assignmentsData
          : Array.isArray(assignmentsData?.assignments)
          ? assignmentsData.assignments
          : null;

        if (rawAssignments && rawAssignments.length > 0) {
          pendingAssignments = rawAssignments
            .filter((item) => String(item.STATUS || item.status || "pending").toLowerCase() === "pending")
            .map((item) => ({
              ID: item.ID || item.id,
              TITLE: item.TITLE || item.title,
              SUBJECT_NAME: item.SUBJECT_NAME || item.subject_name || item.subject || item.SUBJECT_CODE || "Course",
              DUE_DATE: item.DUE_DATE || item.due_date || item.dueDate || "Soon",
              PRIORITY: item.PRIORITY || item.priority || "Medium",
              STATUS: item.STATUS || item.status || "pending",
            }));
        }

        // 3. Exams
        let upcomingExams = DEFAULT_DASHBOARD_DATA.upcomingExams;
        const rawExams = Array.isArray(examsData)
          ? examsData
          : Array.isArray(examsData?.exams)
          ? examsData.exams
          : null;

        if (rawExams && rawExams.length > 0) {
          upcomingExams = rawExams.map((exam) => ({
            ID: exam.ID || exam.id,
            SUBJECT_CODE: exam.SUBJECT_CODE || exam.subject_code || "CS",
            SUBJECT_NAME: exam.SUBJECT_NAME || exam.subject_name || "Course Exam",
            EXAM_DATE: exam.EXAM_DATE || exam.exam_date || "Upcoming",
            START_TIME: exam.START_TIME || exam.start_time || "10:00 AM",
            END_TIME: exam.END_TIME || exam.end_time || "01:00 PM",
            ROOM: exam.ROOM || exam.room || "Exam Hall",
            EXAM_TYPE: exam.EXAM_TYPE || exam.exam_type || "Theory",
          }));
        }

        // 4. Timetable (Today's classes)
        let todayClasses = DEFAULT_DASHBOARD_DATA.todayClasses;
        const rawTimetable = Array.isArray(timetableData)
          ? timetableData
          : Array.isArray(timetableData?.classes)
          ? timetableData.classes
          : null;

        if (rawTimetable && rawTimetable.length > 0) {
          const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
          const matches = rawTimetable.filter(
            (item) => String(item.DAY_OF_WEEK || item.day_of_week || "").toLowerCase() === todayName
          );
          if (matches.length > 0) {
            todayClasses = matches.map((item) => ({
              ID: item.ID || item.id,
              SUBJECT_CODE: item.SUBJECT_CODE || item.subject_code,
              SUBJECT_NAME: item.SUBJECT_NAME || item.subject_name || item.subject_code,
              START_TIME: item.START_TIME || item.start_time,
              END_TIME: item.END_TIME || item.end_time,
              ROOM: item.ROOM || item.room || "LH",
              FACULTY_NAME: item.FACULTY_NAME || item.faculty_name || "Faculty",
            }));
          } else {
            todayClasses = rawTimetable.slice(0, 3).map((item) => ({
              ID: item.ID || item.id,
              SUBJECT_CODE: item.SUBJECT_CODE || item.subject_code,
              SUBJECT_NAME: item.SUBJECT_NAME || item.subject_name || item.subject_code,
              START_TIME: item.START_TIME || item.start_time,
              END_TIME: item.END_TIME || item.end_time,
              ROOM: item.ROOM || item.room || "LH",
              FACULTY_NAME: item.FACULTY_NAME || item.faculty_name || "Faculty",
            }));
          }
        }

        // 5. Notices
        let recentNotices = DEFAULT_DASHBOARD_DATA.recentNotices;
        const rawNotices = Array.isArray(noticesData)
          ? noticesData
          : Array.isArray(noticesData?.notices)
          ? noticesData.notices
          : null;

        if (rawNotices && rawNotices.length > 0) {
          recentNotices = rawNotices.slice(0, 2).map((n) => ({
            ID: n.ID || n.id,
            TITLE: n.TITLE || n.title,
            AUTHOR: n.AUTHOR || n.author || "Admin",
            TAG: (n.TAG || n.tag || "ACADEMIC").toUpperCase(),
            CREATED_AT: n.CREATED_AT || n.createdAt || "Recent",
          }));
        }

        setDashboardData({
          attendancePercentage,
          pendingAssignments,
          upcomingExams,
          todayClasses,
          recentNotices,
        });
      } catch (err) {
        console.warn("Dashboard using fallback data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [roll]);

  // =====================================================
  // HELPERS
  // =====================================================

  function getFirstName() {
    const name = currentUser?.name || "Ratul";
    return name.trim().split(" ")[0];
  }

  const handleAISubmit = (e) => {
    e.preventDefault();
    if (aiQuery.trim()) {
      navigate(`/ai-chat?q=${encodeURIComponent(aiQuery)}`);
    } else {
      navigate("/ai-chat");
    }
  };

  const attendanceSafe = dashboardData.attendancePercentage >= 75;
  const nextAssignments = dashboardData.pendingAssignments.slice(0, 2);
  const nextExam = dashboardData.upcomingExams[0];

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col">
      {/* Mobile Header */}
      <header className="sticky top-0 w-full z-40 bg-background border-b border-surface-container-high flex justify-between items-center px-4 py-3 md:hidden">
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant bg-primary-container text-on-primary-container flex items-center justify-center font-bold"
          >
            {getFirstName().charAt(0)}
          </Link>
          <span className="font-headline-lg-mobile font-bold text-primary">CampusCopilot</span>
        </div>
        <Link to="/notices" className="text-on-surface-variant hover:opacity-80">
          <span className="material-symbols-outlined text-[24px]">notifications</span>
        </Link>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1440px] mx-auto w-full">
        {/* NavigationDrawer (Desktop) */}
        <aside className="hidden md:flex flex-col py-6 bg-surface border-r border-outline-variant h-[calc(100vh-64px)] w-[280px] rounded-r-2xl shadow-sm sticky top-0">
          <div className="px-6 mb-6 flex items-center gap-2">
            <span className="font-headline-lg font-bold text-primary">CampusCopilot</span>
          </div>

          <Link to="/profile" className="px-6 mb-6 block hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg">
                {getFirstName().charAt(0)}
              </div>
              <div>
                <div className="font-title-md text-on-surface font-semibold">{currentUser?.name || "Ratul Das"}</div>
                <div className="font-body-sm text-on-surface-variant text-xs">{currentUser?.department || "Computer Science"}</div>
                <div className="font-mono-sm text-outline text-[11px]">ID: {roll}</div>
              </div>
            </div>
          </Link>

          <nav className="flex flex-col gap-1 flex-1 overflow-y-auto px-2">
            <Link
              to="/dashboard"
              className="bg-secondary-container text-on-secondary-container rounded-full mx-2 font-bold px-4 py-2 flex items-center gap-3 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                dashboard
              </span>
              <span className="font-body-md text-sm">Home</span>
            </Link>
            <Link
              to="/timetable"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-3 transition-all"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="font-body-md text-sm">Timetable</span>
            </Link>
            <Link
              to="/attendance"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-3 transition-all"
            >
              <span className="material-symbols-outlined">analytics</span>
              <span className="font-body-md text-sm">Attendance</span>
            </Link>
            <Link
              to="/assignments"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-3 transition-all"
            >
              <span className="material-symbols-outlined">assignment</span>
              <span className="font-body-md text-sm">Assignments</span>
            </Link>
            <Link
              to="/exams"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-3 transition-all"
            >
              <span className="material-symbols-outlined">description</span>
              <span className="font-body-md text-sm">Exams</span>
            </Link>
            <Link
              to="/notices"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-3 transition-all"
            >
              <span className="material-symbols-outlined">campaign</span>
              <span className="font-body-md text-sm">Notices</span>
            </Link>
            <Link
              to="/ai-chat"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-3 transition-all"
            >
              <span className="material-symbols-outlined">smart_toy</span>
              <span className="font-body-md text-sm">Copilot AI</span>
            </Link>
            <Link
              to="/student-id"
              className="text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full flex items-center gap-3 transition-all"
            >
              <span className="material-symbols-outlined">badge</span>
              <span className="font-body-md text-sm">Digital ID</span>
            </Link>
          </nav>
        </aside>

        {/* Canvas */}
        <main className="flex-1 flex flex-col px-4 md:px-8 py-6 max-w-[1100px] w-full pb-24 md:pb-12">
          {/* Greeting Section */}
          <div className="mb-6">
            <h1 className="font-headline-lg md:font-display-lg text-primary font-bold text-2xl md:text-4xl">
              Hello, {getFirstName()}! 👋
            </h1>
            <p className="font-body-md text-on-surface-variant text-sm mt-1">
              Here is your academic overview, schedule, and pending tasks for today.
            </p>
          </div>

          {/* AI Quick Query Bar */}
          <form onSubmit={handleAISubmit} className="relative mb-6">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ask Copilot: 'What classes do I have today?', 'Explain B-Trees', 'Generate study plan'..."
              className="w-full py-3.5 pl-12 pr-28 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
            />
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">
              smart_toy
            </span>
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary-container transition-all cursor-pointer shadow-sm"
            >
              Ask AI
            </button>
          </form>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Metric 1: Attendance */}
            <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-outline uppercase tracking-wider">Attendance</span>
                <h3 className="text-2xl md:text-3xl font-bold text-primary mt-0.5">
                  {dashboardData.attendancePercentage}%
                </h3>
                <span className={`text-xs font-semibold ${attendanceSafe ? "text-secondary" : "text-error"}`}>
                  {attendanceSafe ? "✓ Safe (>75%)" : "⚠️ Needs Attention"}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary-container text-secondary flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">analytics</span>
              </div>
            </div>

            {/* Metric 2: Pending Tasks */}
            <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-outline uppercase tracking-wider">Tasks & Deadlines</span>
                <h3 className="text-2xl md:text-3xl font-bold text-primary mt-0.5">
                  {dashboardData.pendingAssignments.length}
                </h3>
                <span className="text-xs text-outline">Pending this week</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">assignment</span>
              </div>
            </div>

            {/* Metric 3: Upcoming Exam */}
            <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-outline uppercase tracking-wider">Next Examination</span>
                <h3 className="text-lg md:text-xl font-bold text-primary mt-0.5 line-clamp-1">
                  {nextExam ? nextExam.SUBJECT_CODE : "Sep 12"}
                </h3>
                <span className="text-xs text-outline">{nextExam ? nextExam.EXAM_DATE : "End-Sem Finals"}</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-tertiary-container text-on-tertiary flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">description</span>
              </div>
            </div>
          </div>

          {/* 2-Column Schedule & Assignments Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Today's Classes */}
            <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-title-md font-bold text-on-surface text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                  Today's Lecture Schedule
                </h2>
                <Link to="/timetable" className="text-xs font-bold text-primary hover:underline">
                  Full Timetable
                </Link>
              </div>

              <div className="space-y-3">
                {dashboardData.todayClasses.map((cls, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-outline-variant/50 hover:bg-surface-container-low transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {cls.SUBJECT_CODE || "LEC"}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-on-surface">{cls.SUBJECT_NAME}</h4>
                        <p className="text-xs text-on-surface-variant">
                          {cls.START_TIME} – {cls.END_TIME} • {cls.ROOM}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono-sm text-outline font-medium">{cls.FACULTY_NAME}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Pending Assignments & Notices */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Upcoming Assignments Card */}
              <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-title-md font-bold text-on-surface text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-[20px]">assignment</span>
                    Assignments
                  </h2>
                  <Link to="/assignments" className="text-xs font-bold text-primary hover:underline">
                    View All
                  </Link>
                </div>

                <div className="space-y-3">
                  {nextAssignments.map((asg, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-xs text-on-surface line-clamp-1">{asg.TITLE}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error-container text-on-error-container">
                          {asg.PRIORITY}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-1">{asg.SUBJECT_NAME}</p>
                      <div className="mt-2 flex justify-between items-center text-[11px] text-outline">
                        <span>Due: {asg.DUE_DATE}</span>
                        <Link to="/assignments" className="text-primary font-bold hover:underline">
                          Submit
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Notices Card */}
              <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-title-md font-bold text-on-surface text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[20px]">campaign</span>
                    Recent Notices
                  </h2>
                  <Link to="/notices" className="text-xs font-bold text-primary hover:underline">
                    All Notices
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {dashboardData.recentNotices.map((n, idx) => (
                    <Link
                      key={idx}
                      to="/notices"
                      className="block p-3 rounded-xl hover:bg-surface-container-low transition-colors border border-outline-variant/30 group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-on-primary-container">
                          {n.TAG}
                        </span>
                        <span className="text-[11px] text-outline font-mono-sm">{n.CREATED_AT}</span>
                      </div>
                      <h4 className="font-semibold text-xs text-on-surface group-hover:text-primary line-clamp-1">
                        {n.TITLE}
                      </h4>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Nav Bar (Mobile) */}
      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">
        <div className="flex justify-around items-center px-4 w-full h-full">
          <Link to="/dashboard" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              dashboard
            </span>
            <span className="text-[10px] mt-1">Home</span>
          </Link>
          <Link to="/attendance" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-[10px] mt-1">Attendance</span>
          </Link>
          <Link to="/ai-chat" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-[10px] mt-1">Copilot</span>
          </Link>
          <Link to="/assignments" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">assignment</span>
            <span className="text-[10px] mt-1">Tasks</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">account_circle</span>
            <span className="text-[10px] mt-1">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}