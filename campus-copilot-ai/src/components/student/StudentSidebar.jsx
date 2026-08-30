import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { authService } from "../../services/api";

const API_URL = "http://localhost:5000";

const NAV_ITEMS = [
  { label: "Home", icon: "dashboard", path: "/dashboard" },
  { label: "Timetable", icon: "calendar_month", path: "/timetable" },
  { label: "Attendance", icon: "analytics", path: "/attendance" },
  { label: "Assignments", icon: "assignment", path: "/assignments" },
  { label: "Exams", icon: "description", path: "/exams" },
  { label: "Notices", icon: "campaign", path: "/notices" },
  { label: "AI Analytics", icon: "insights", path: "/ai-analytics" },
  { label: "Resources", icon: "folder_open", path: "/resources" },
  { label: "Digital ID", icon: "badge", path: "/student-id" },
];

const MOBILE_ITEMS = [
  { label: "Home", icon: "dashboard", path: "/dashboard" },
  { label: "Notices", icon: "campaign", path: "/notices" },
  { label: "Analytics", icon: "insights", path: "/ai-analytics" },
  { label: "Resources", icon: "folder_open", path: "/resources" },
  { label: "Digital ID", icon: "badge", path: "/student-id" },
];

function getStudentRoll(user) {
  return String(
    user?.rollNumber ||
      user?.studentRoll ||
      user?.student_roll ||
      user?.roll_number ||
      ""
  ).trim();
}

function getStudentInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "--";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function requestJson(path) {
  const token = localStorage.getItem("campus_token");
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}

function formatAttendance(value) {
  if (value === null) {
    return "--";
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export default function StudentSidebar({ activePath }) {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const studentRoll = getStudentRoll(currentUser);

  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [pendingTasks, setPendingTasks] = useState(null);
  const [classesToday, setClassesToday] = useState(null);

  useEffect(() => {
    if (!studentRoll) {
      return undefined;
    }

    let cancelled = false;

    async function loadSidebarData() {
      const encodedRoll = encodeURIComponent(studentRoll);
      const results = await Promise.allSettled([
        requestJson(`/api/students/${encodedRoll}`),
        requestJson(`/api/attendance/${encodedRoll}`),
        requestJson(`/api/assignments/${encodedRoll}`),
        requestJson(`/api/timetable/${encodedRoll}`),
      ]);

      if (cancelled) {
        return;
      }

      if (results[0].status === "fulfilled") {
        setProfile(results[0].value);
      }

      if (results[1].status === "fulfilled" && Array.isArray(results[1].value)) {
        const totals = results[1].value.reduce(
          (sum, row) => ({
            attended:
              sum.attended +
              (Number(row.ATTENDED_CLASSES ?? row.attended_classes) || 0),
            total:
              sum.total +
              (Number(row.TOTAL_CLASSES ?? row.total_classes) || 0),
          }),
          { attended: 0, total: 0 }
        );

        setAttendance(
          totals.total > 0
            ? Number(((totals.attended / totals.total) * 100).toFixed(1))
            : null
        );
      }

      if (results[2].status === "fulfilled" && Array.isArray(results[2].value)) {
        setPendingTasks(
          results[2].value.filter(
            (assignment) =>
              String(assignment.STATUS ?? assignment.status ?? "")
                .trim()
                .toLowerCase() === "pending"
          ).length
        );
      }

      if (results[3].status === "fulfilled" && Array.isArray(results[3].value)) {
        const weekday = new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          timeZone: "Asia/Kolkata",
        }).format(new Date());

        setClassesToday(
          results[3].value.filter(
            (entry) =>
              String(entry.DAY_OF_WEEK ?? entry.day_of_week ?? "")
                .trim()
                .toLowerCase() === weekday.toLowerCase()
          ).length
        );
      }
    }

    loadSidebarData().catch((error) => {
      console.error("Student sidebar data error:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [studentRoll]);

  const displayName = profile?.NAME || currentUser?.name || "Profile unavailable";
  const displayDepartment =
    profile?.DEPARTMENT || currentUser?.department || "Department unavailable";
  const displayRoll = profile?.STUDENT_ROLL || studentRoll || "--";

  function handleLogout() {
    authService.logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="hidden h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface lg:flex lg:sticky lg:top-0">
      <div className="px-md pb-sm pt-md">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-[28px]">school</span>
          <span className="font-headline-lg-mobile font-bold">CampusCopilot</span>
        </div>
      </div>

      <Link to="/profile" className="px-md py-md transition-colors hover:bg-surface-container-low">
        <div className="flex items-center gap-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container text-lg font-bold text-on-primary-container">
            {getStudentInitials(displayName)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-title-md font-semibold text-on-surface">
              {displayName}
            </div>
            <div className="truncate font-body-sm leading-5 text-on-surface-variant">
              {displayDepartment}
            </div>
            <div className="mt-0.5 truncate font-label-caps text-outline">
              ID: {displayRoll}
            </div>
          </div>
        </div>
      </Link>

      <nav className="flex flex-col gap-1 px-2" aria-label="Student navigation">
        {NAV_ITEMS.map((item) => {
          const active = item.path === activePath;

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex items-center gap-sm rounded-xl bg-secondary-container px-4 py-2.5 font-semibold text-on-secondary-container"
                  : "flex items-center gap-sm rounded-xl px-4 py-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-low"
              }
            >
              <span
                className="material-symbols-outlined"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 mt-md rounded-xl border border-outline-variant bg-surface-container-lowest p-sm">
        <div className="mb-sm font-label-caps text-outline">TODAY SUMMARY</div>
        <div className="space-y-3">
          <Link to="/attendance" className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary-container text-secondary">
                <span className="material-symbols-outlined text-[16px]">monitoring</span>
              </span>
              <span className="font-body-sm text-on-surface">Attendance</span>
            </span>
            <span className="font-body-sm font-bold text-secondary">
              {formatAttendance(attendance)}
            </span>
          </Link>

          <Link to="/assignments" className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-tertiary/10 text-tertiary">
                <span className="material-symbols-outlined text-[16px]">assignment</span>
              </span>
              <span className="font-body-sm text-on-surface">Pending Tasks</span>
            </span>
            <span className="font-body-sm font-bold text-error">
              {pendingTasks ?? "--"}
            </span>
          </Link>

          <Link to="/timetable" className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[16px]">school</span>
              </span>
              <span className="font-body-sm text-on-surface">Classes Today</span>
            </span>
            <span className="font-body-sm font-bold text-primary">
              {classesToday ?? "--"}
            </span>
          </Link>
        </div>
      </div>

      <div className="min-h-4 flex-1" />

      <div className="mx-2 border-t border-outline-variant px-2 py-sm">
        <Link
          to="/profile"
          className="flex items-center gap-sm rounded-xl px-4 py-2.5 text-on-surface-variant hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined">account_circle</span>
          Profile
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-sm rounded-xl px-4 py-2.5 text-left text-error hover:bg-error-container/20"
        >
          <span className="material-symbols-outlined">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}

export function StudentMobileNavigation({ activePath }) {
  return (
    <nav className="fixed bottom-0 z-50 h-[64px] w-full border-t border-outline-variant bg-surface lg:hidden">
      <div className="flex h-full w-full items-center justify-around px-1">
        {MOBILE_ITEMS.map((item) => {
          const active = item.path === activePath;

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={`flex w-16 flex-col items-center justify-center text-[10px] ${
                active ? "font-bold text-primary" : "text-on-surface-variant"
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
