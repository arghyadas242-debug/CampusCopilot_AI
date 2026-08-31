import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { authService, attendanceService, assignmentService, timetableService } from "../../services/api";
import CampusCopilotBrand from "../../components/student/CampusCopilotBrand";
import StudentPageHero from "../../components/student/StudentPageHero";
import StudentNotificationBell from "./StudentNotificationBell";

/* ===================================================================
   HELPERS
   =================================================================== */

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getPercentage = (attended, total) => {
  if (!total || total === 0) return 0;
  return parseFloat(((attended / total) * 100).toFixed(1));
};

const calculateBunksLeft = (attended, total) => {
  const pct = getPercentage(attended, total);
  if (pct < 75) return 0;
  return Math.max(0, Math.floor(attended / 0.75 - total));
};

const calculateClassesNeeded = (attended, total) => {
  const pct = getPercentage(attended, total);
  if (pct >= 75) return 0;
  return Math.max(0, Math.ceil((0.75 * total - attended) / 0.25));
};

const SUBJECT_THEMES = [
  { bg: "bg-blue-50", border: "border-blue-200", accent: "bg-primary", text: "text-primary", barBg: "bg-blue-100", barFill: "bg-primary" },
  { bg: "bg-emerald-50", border: "border-emerald-200", accent: "bg-secondary", text: "text-secondary", barBg: "bg-emerald-100", barFill: "bg-secondary" },
  { bg: "bg-violet-50", border: "border-violet-200", accent: "bg-tertiary", text: "text-tertiary", barBg: "bg-violet-100", barFill: "bg-tertiary" },
  { bg: "bg-amber-50", border: "border-amber-200", accent: "bg-amber-500", text: "text-amber-800", barBg: "bg-amber-100", barFill: "bg-amber-500" },
  { bg: "bg-rose-50", border: "border-rose-200", accent: "bg-rose-500", text: "text-rose-800", barBg: "bg-rose-100", barFill: "bg-rose-500" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* ===================================================================
   CUSTOM CHART TOOLTIP
   =================================================================== */

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface rounded-xl border border-outline-variant shadow-lg px-4 py-3 font-body-sm">
      <div className="font-semibold text-on-surface mb-1">{label}</div>
      <div className="text-primary font-bold">{d.percentage}%</div>
      <div className="text-on-surface-variant text-xs mt-0.5">
        {d.attendedClasses} / {d.totalClasses} classes
      </div>
    </div>
  );
};

/* ===================================================================
   CIRCULAR PROGRESS
   =================================================================== */

const CircularProgress = ({ percentage, size = 120, strokeWidth = 10, color = "#006a61" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-surface-container-low"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
      />
    </svg>
  );
};

/* ===================================================================
   MAIN COMPONENT
   =================================================================== */

export default function AttendancePage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const studentName = user?.name || "Student";
  const department = user?.department || "";
  const studentRoll = user?.rollNumber || "";

  /* ---- state ---- */
  const [subjects, setSubjects] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [todaySummary, setTodaySummary] = useState({ pendingTasks: 0, classesToday: 0 });
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendError, setTrendError] = useState(null);

  /* ---- derived ---- */
  const totalAttended = subjects.reduce((s, sub) => s + (sub.attended || 0), 0);
  const totalClasses = subjects.reduce((s, sub) => s + (sub.total || 0), 0);
  const overallPercentage = getPercentage(totalAttended, totalClasses);
  const overallBuffer = calculateBunksLeft(totalAttended, totalClasses);
  const classesNeeded = calculateClassesNeeded(totalAttended, totalClasses);
  const safeSubjects = subjects.filter((s) => getPercentage(s.attended, s.total) >= 75);
  const isGoodStanding = overallPercentage >= 75;

  /* ---- fetch all data ---- */
  useEffect(() => {
    if (!studentRoll) return;

    const loadAttendance = async () => {
      setLoading(true);
      setError(null);
      try {
        const raw = await attendanceService.getAttendance(studentRoll);
        const rows = Array.isArray(raw) ? raw : raw?.data || raw?.rows || [];
        const parsed = rows.map((r, i) => ({
          code: r.SUBJECT_CODE || r.subject_code || "",
          name: r.SUBJECT_NAME || r.subject_name || "",
          attended: Number(r.ATTENDED_CLASSES ?? r.attended_classes ?? 0),
          total: Number(r.TOTAL_CLASSES ?? r.total_classes ?? 0),
          theme: SUBJECT_THEMES[i % SUBJECT_THEMES.length],
        }));
        setSubjects(parsed);
      } catch (e) {
        setError(e.message || "Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };

    const loadTrend = async () => {
      setTrendLoading(true);
      setTrendError(null);
      try {
        const res = await attendanceService.getAttendanceTrendHistory(studentRoll, 8);
        const points = Array.isArray(res) ? res : res?.data || [];
        setTrendData(points);
      } catch (e) {
        setTrendError(e.message || "Failed to load trend");
      } finally {
        setTrendLoading(false);
      }
    };

    const loadTodaySummary = async () => {
      try {
        const [assignRes, ttRes] = await Promise.allSettled([
          assignmentService.getAssignments(studentRoll),
          timetableService.getTimetable(studentRoll),
        ]);

        let pending = 0;
        if (assignRes.status === "fulfilled") {
          const items = Array.isArray(assignRes.value)
            ? assignRes.value
            : assignRes.value?.assignments || assignRes.value?.data || [];
          pending = items.filter(
            (a) => (a.STATUS || a.status || "").toLowerCase() === "pending"
          ).length;
        }

        let classesToday = 0;
        if (ttRes.status === "fulfilled") {
          const classes = Array.isArray(ttRes.value)
            ? ttRes.value
            : ttRes.value?.classes || ttRes.value?.data || [];
          const today = DAYS[new Date().getDay()];
          classesToday = classes.filter(
            (c) => (c.DAY_OF_WEEK || c.day_of_week || "").toLowerCase() === today.toLowerCase()
          ).length;
        }

        setTodaySummary({ pendingTasks: pending, classesToday });
      } catch {
        /* silent */
      }
    };

    loadAttendance();
    loadTrend();
    loadTodaySummary();
  }, [studentRoll]);

  /* ---- logout ---- */
  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  /* =================================================================
     RENDER
     ================================================================= */

  return (
    <div className="flex min-h-screen bg-background">
      {/* =============================================================
          DESKTOP SIDEBAR
          ============================================================= */}
      <aside className="hidden lg:flex w-[280px] shrink-0 h-screen sticky top-0 bg-surface border-r border-outline-variant flex-col">
        {/* Brand */}
        <div className="px-md pt-md pb-sm">
          <CampusCopilotBrand />
        </div>

        {/* Profile */}
        <Link to="/profile" className="px-md py-md hover:bg-surface-container-low transition-colors">
          <div className="flex items-center gap-sm">
            <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0">
              {getInitials(studentName)}
            </div>
            <div className="min-w-0">
              <div className="font-title-md font-semibold text-on-surface">{studentName}</div>
              <div className="font-body-sm text-on-surface-variant leading-5">{department}</div>
              <div className="font-label-caps text-outline mt-0.5">ID: {studentRoll}</div>
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <div className="px-2 flex flex-col gap-1">
          <Link to="/dashboard" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">dashboard</span>
            Home
          </Link>
          <Link to="/timetable" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">calendar_month</span>
            Timetable
          </Link>
          <Link to="/attendance" className="bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-semibold flex items-center gap-sm">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            Attendance
          </Link>
          <Link to="/assignments" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">assignment</span>
            Assignments
          </Link>
          <Link to="/exams" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">description</span>
            Exams
          </Link>
          <Link to="/notices" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">campaign</span>
            Notices
          </Link>
          <Link to="/ai-analytics" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">insights</span>
            AI Analytics
          </Link>
          <Link to="/resources" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">folder_open</span>
            Resources
          </Link>
          <Link to="/student-id" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">badge</span>
            Digital ID
          </Link>
        </div>

        {/* TODAY SUMMARY */}
        <div className="mx-4 mt-md border border-outline-variant rounded-xl bg-surface-container-lowest p-sm">
          <div className="font-label-caps text-outline mb-sm">TODAY SUMMARY</div>
          <div className="space-y-3">
            <Link to="/attendance" className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-secondary-container text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">monitoring</span>
                </div>
                <span className="font-body-sm text-on-surface">Attendance</span>
              </div>
              <span className="font-body-sm font-bold text-secondary">
                {loading ? "--" : `${overallPercentage}%`}
              </span>
            </Link>
            <Link to="/assignments" className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">assignment</span>
                </div>
                <span className="font-body-sm text-on-surface">Pending Tasks</span>
              </div>
              <span className="font-body-sm font-bold text-error">{todaySummary.pendingTasks}</span>
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">school</span>
                </div>
                <span className="font-body-sm text-on-surface">Classes Today</span>
              </div>
              <span className="font-body-sm font-bold text-primary">{todaySummary.classesToday}</span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Profile & Logout */}
        <div className="mx-2 px-2 py-sm border-t border-outline-variant">
          <Link to="/profile" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm">
            <span className="material-symbols-outlined">account_circle</span>
            Profile
          </Link>
          <button type="button" onClick={handleLogout} className="w-full text-error px-4 py-2.5 rounded-xl hover:bg-error-container/20 flex items-center gap-sm text-left">
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* =============================================================
          MAIN CONTENT
          ============================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ---- Mobile Header ---- */}
        <header className="lg:hidden sticky top-0 z-40 bg-surface border-b border-outline-variant px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0">
              {getInitials(studentName)}
            </div>
            <span className="font-headline-lg-mobile font-bold text-primary">CampusCopilot</span>
          </div>
          <StudentNotificationBell />
        </header>

        {/* ---- Scrollable content ---- */}
        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8 overflow-y-auto">
          <StudentPageHero
            eyebrow="ATTENDANCE ANALYTICS"
            title="Attendance Analytics"
            subtitle="Track your attendance performance and stay in the safe zone."
          />

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-error-container/20 border border-error/30 text-error font-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ========================================
                  TOP STAT CARDS
                  ======================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                {/* 1 — Overall Attendance */}
                <div className="rounded-xl bg-surface border border-outline-variant p-5 flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <CircularProgress
                      percentage={overallPercentage}
                      size={100}
                      strokeWidth={9}
                      color={isGoodStanding ? "#006a61" : "#ba1a1a"}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-bold text-xl text-on-surface">{overallPercentage}%</span>
                    </div>
                  </div>
                  <div className="font-title-md font-semibold text-on-surface">Overall Attendance</div>
                  <span
                    className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isGoodStanding
                        ? "bg-secondary-container/50 text-secondary"
                        : "bg-error-container/50 text-error"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isGoodStanding ? "check_circle" : "warning"}
                    </span>
                    {isGoodStanding ? "Good Standing" : "Attendance Warning"}
                  </span>
                </div>

                {/* 2 — Classes Attended */}
                <div className="rounded-xl bg-surface border border-outline-variant p-5 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined">school</span>
                    </div>
                    <span className="font-title-md font-semibold text-on-surface">Classes Attended</span>
                  </div>
                  <div className="font-display-lg text-primary font-bold">
                    {totalAttended}
                    <span className="text-on-surface-variant font-normal text-lg"> / {totalClasses}</span>
                  </div>
                  <div className="mt-2 w-full h-2 rounded-full bg-surface-container-low overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* 3 — Safe Zone */}
                <div className="rounded-xl bg-surface border border-outline-variant p-5 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGoodStanding ? "bg-secondary-container text-secondary" : "bg-error-container text-error"}`}>
                      <span className="material-symbols-outlined">{isGoodStanding ? "shield" : "emergency"}</span>
                    </div>
                    <span className="font-title-md font-semibold text-on-surface">Safe Zone</span>
                  </div>
                  {isGoodStanding ? (
                    <>
                      <div className="font-display-lg text-secondary font-bold">{overallBuffer}</div>
                      <div className="font-body-sm text-on-surface-variant mt-1">bunks remaining</div>
                    </>
                  ) : (
                    <>
                      <div className="font-display-lg text-error font-bold">{classesNeeded}</div>
                      <div className="font-body-sm text-on-surface-variant mt-1">classes needed to recover</div>
                    </>
                  )}
                </div>

                {/* 4 — Subject Status */}
                <div className="rounded-xl bg-surface border border-outline-variant p-5 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center">
                      <span className="material-symbols-outlined">library_books</span>
                    </div>
                    <span className="font-title-md font-semibold text-on-surface">Subject Status</span>
                  </div>
                  <div className="font-display-lg text-tertiary font-bold">
                    {safeSubjects.length}
                    <span className="text-on-surface-variant font-normal text-lg"> / {subjects.length}</span>
                  </div>
                  <div className="font-body-sm text-on-surface-variant mt-1">subjects above 75%</div>
                </div>
              </div>

              {/* ========================================
                  ATTENDANCE HISTORY CHART
                  ======================================== */}
              <div className="rounded-xl bg-surface border border-outline-variant p-5 lg:p-6 mb-8">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-title-md font-semibold text-on-surface">Attendance History</h2>
                    <p className="font-body-sm text-on-surface-variant mt-0.5">Last 8 Weeks</p>
                  </div>
                  <div className="flex items-center gap-4 font-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 rounded bg-primary inline-block" />
                      Attendance
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 rounded bg-error/50 inline-block border-t border-dashed border-error" />
                      Minimum 75%
                    </span>
                  </div>
                </div>

                {trendLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : trendError ? (
                  <div className="text-center py-12 font-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl text-outline mb-2 block">cloud_off</span>
                    Unable to load trend data
                  </div>
                ) : trendData.length === 0 ? (
                  <div className="text-center py-16 font-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl text-outline mb-3 block">timeline</span>
                    No attendance history yet.
                  </div>
                ) : (
                  <>
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#c5c5d3" strokeOpacity={0.4} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 12, fill: "#757682" }}
                            axisLine={{ stroke: "#c5c5d3" }}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 12, fill: "#757682" }}
                            axisLine={{ stroke: "#c5c5d3" }}
                            tickLine={false}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <ReferenceLine
                            y={75}
                            stroke="#ba1a1a"
                            strokeDasharray="6 4"
                            strokeWidth={1.5}
                            label={{
                              value: "Minimum 75%",
                              position: "insideTopRight",
                              fill: "#ba1a1a",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="percentage"
                            stroke="#00236f"
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: "#00236f", stroke: "#fff", strokeWidth: 2 }}
                            activeDot={{ r: 7, fill: "#00236f", stroke: "#fff", strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {trendData.length === 1 && (
                      <p className="text-center font-body-sm text-on-surface-variant mt-4">
                        Trend tracking has started. More history will appear as new attendance is recorded.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* ========================================
                  BOTTOM TWO-COLUMN: Performance + Subjects
                  ======================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ---- Attendance Performance ---- */}
                <div className="rounded-xl bg-surface border border-outline-variant p-5 lg:p-6">
                  <h2 className="font-title-md font-semibold text-on-surface mb-5">Attendance Performance</h2>

                  {/* Central ring */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative">
                      <CircularProgress
                        percentage={overallPercentage}
                        size={140}
                        strokeWidth={12}
                        color={isGoodStanding ? "#006a61" : "#ba1a1a"}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-bold text-2xl text-on-surface">{overallPercentage}%</span>
                        <span className="font-body-sm text-on-surface-variant">Overall</span>
                      </div>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-4 border-t border-outline-variant pt-5">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-on-surface-variant">Status</span>
                      <span className={`font-body-sm font-semibold ${isGoodStanding ? "text-secondary" : "text-error"}`}>
                        {isGoodStanding ? "Good Standing" : "Needs Attention"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-on-surface-variant">Classes Attended</span>
                      <span className="font-body-sm font-semibold text-on-surface">{totalAttended} / {totalClasses}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-on-surface-variant">Safe Zone</span>
                      <span className={`font-body-sm font-semibold ${isGoodStanding ? "text-secondary" : "text-error"}`}>
                        {isGoodStanding
                          ? `${overallBuffer} bunks remaining`
                          : `${classesNeeded} classes needed`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50">
                    <p className="font-body-sm text-on-surface-variant flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5 shrink-0">info</span>
                      Maintain consistency to stay in the safe zone.
                    </p>
                  </div>

                  <Link
                    to="/ai-chat?q=Analyze%20my%20attendance%20and%20suggest%20improvement%20strategies"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container"
                  >
                    <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                    Ask Copilot Attendance Advice
                  </Link>
                </div>

                {/* ---- Subject-wise Attendance ---- */}
                <div className="rounded-xl bg-surface border border-outline-variant p-5 lg:p-6">
                  <h2 className="font-title-md font-semibold text-on-surface mb-5">Subject-wise Attendance</h2>

                  {subjects.length === 0 ? (
                    <div className="text-center py-12 font-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl text-outline mb-2 block">menu_book</span>
                      No subjects found.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {subjects.map((sub) => {
                        const pct = getPercentage(sub.attended, sub.total);
                        const safe = pct >= 75;
                        const bunks = calculateBunksLeft(sub.attended, sub.total);
                        const needed = calculateClassesNeeded(sub.attended, sub.total);

                        return (
                          <div
                            key={sub.code}
                            className={`rounded-xl border p-4 ${sub.theme.bg} ${sub.theme.border}`}
                          >
                            {/* Header row */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="font-title-md font-semibold text-on-surface">{sub.name}</div>
                                <div className="font-body-sm text-on-surface-variant">{sub.code}</div>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  safe
                                    ? "bg-secondary-container/60 text-secondary"
                                    : "bg-error-container/60 text-error"
                                }`}
                              >
                                {safe ? "Good Standing" : "Needs Attention"}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-body-sm font-bold ${sub.theme.text}`}>{pct}%</span>
                                <span className="font-body-sm text-on-surface-variant">
                                  {sub.attended} / {sub.total}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-white/60 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${sub.theme.barFill}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Bunk info */}
                            <div className="flex items-center gap-1.5">
                              <span className={`material-symbols-outlined text-[16px] ${safe ? "text-secondary" : "text-error"}`}>
                                {safe ? "shield" : "emergency"}
                              </span>
                              <span className={`font-body-sm font-medium ${safe ? "text-secondary" : "text-error"}`}>
                                {safe
                                  ? `${bunks} bunks left`
                                  : `Attend next ${needed} classes`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* =============================================================
          MOBILE BOTTOM NAVIGATION
          ============================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-[64px] bg-surface border-t border-outline-variant">
        <div className="h-full flex items-center justify-around">
          <Link to="/dashboard" className="flex flex-col items-center text-on-surface-variant">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px]">Home</span>
          </Link>
          <Link to="/timetable" className="flex flex-col items-center text-on-surface-variant">
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="text-[10px]">Timetable</span>
          </Link>
          <Link to="/attendance" className="flex flex-col items-center text-secondary font-semibold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            <span className="text-[10px]">Attendance</span>
          </Link>
          <Link to="/ai-chat" className="flex flex-col items-center text-on-surface-variant">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-[10px]">Copilot</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center text-on-surface-variant">
            <span className="material-symbols-outlined">account_circle</span>
            <span className="text-[10px]">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
