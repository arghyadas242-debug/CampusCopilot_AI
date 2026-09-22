import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { authService, getAuthHeader } from "../../services/api";
import CampusCopilotBrand from "./CampusCopilotBrand";

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

  if (parts.length === 0) return "--";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function requestJson(path, signal) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: getAuthHeader(),
    signal,
  });

  if (!response.ok) {
    const error = new Error(
      response.status === 401
        ? "Please log in again to load your student information."
        : response.status === 403
        ? "Access denied. Your student information could not be loaded."
        : "Unable to load student information. Please try again."
    );
    error.status = response.status;
    throw error;
  }

  try {
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Invalid response received from the server.");
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRows(value) {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error("Invalid student records received.");
  }
  return value;
}

function readClassCount(value) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && value.trim() === "")
  ) {
    throw new Error("Invalid attendance totals received.");
  }

  const count = Number(value);

  if (!Number.isFinite(count) || count < 0) {
    throw new Error("Invalid attendance totals received.");
  }

  return count;
}

function formatAttendance(value) {
  if (value === null || !Number.isFinite(value)) return "--";
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
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setProfile(null);
    setAttendance(null);
    setPendingTasks(null);
    setClassesToday(null);
    setLoadError("");

    if (!studentRoll) {
      setLoadError("Student roll number is unavailable. Please log in again.");

      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    async function loadSidebarData() {
      try {
        const encodedRoll = encodeURIComponent(studentRoll);
        const results = await Promise.allSettled([
          requestJson(`/api/students/${encodedRoll}`, controller.signal),
          requestJson(`/api/attendance/${encodedRoll}`, controller.signal),
          requestJson(`/api/assignments/${encodedRoll}`, controller.signal),
          requestJson(`/api/timetable/${encodedRoll}`, controller.signal),
        ]);

        if (cancelled) return;

        const authFailure = results.find(
          (result) =>
            result.status === "rejected" &&
            [401, 403].includes(result.reason?.status)
        );

        if (authFailure) throw authFailure.reason;

        const failedSections = [];

        function readResult(index, label, parse) {
          const result = results[index];

          if (result.status !== "fulfilled") {
            failedSections.push(label);
            return null;
          }

          try {
            return parse(result.value);
          } catch {
            failedSections.push(label);
            return null;
          }
        }

        const loadedProfile = readResult(0, "Profile", (data) => {
          if (
            !isRecord(data) ||
            !data.NAME ||
            String(data.STUDENT_ROLL ?? "").trim() !== studentRoll
          ) {
            throw new Error("Invalid student profile received.");
          }

          return data;
        });

        const loadedAttendance = readResult(1, "Attendance", (data) => {
          const rows = requireRows(data);
          let attended = 0;
          let total = 0;

          rows.forEach((row) => {
            const rowAttended = readClassCount(
              row.ATTENDED_CLASSES ?? row.attended_classes
            );
            const rowTotal = readClassCount(
              row.TOTAL_CLASSES ?? row.total_classes
            );

            if (rowAttended > rowTotal) {
              throw new Error("Invalid attendance totals received.");
            }

            attended += rowAttended;
            total += rowTotal;
          });

          if (!Number.isFinite(attended) || !Number.isFinite(total)) {
            throw new Error("Invalid attendance totals received.");
          }

          return total > 0
            ? Number(((attended / total) * 100).toFixed(1))
            : null;
        });

        const loadedPendingTasks = readResult(2, "Assignments", (data) =>
          requireRows(data).filter(
            (assignment) =>
              String(assignment.STATUS ?? assignment.status ?? "")
                .trim()
                .toLowerCase() === "pending"
          ).length
        );

        const loadedClassesToday = readResult(3, "Timetable", (data) => {
          const weekday = new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            timeZone: "Asia/Kolkata",
          }).format(new Date());

          return requireRows(data).filter(
            (entry) =>
              String(entry.DAY_OF_WEEK ?? entry.day_of_week ?? "")
                .trim()
                .toLowerCase() === weekday.toLowerCase()
          ).length;
        });

        setProfile(loadedProfile);
        setAttendance(loadedAttendance);
        setPendingTasks(loadedPendingTasks);
        setClassesToday(loadedClassesToday);
        setLoadError(
          failedSections.length > 0
            ? `Could not load: ${failedSections.join(", ")}.`
            : ""
        );
      } catch (error) {
        if (cancelled || error.name === "AbortError") return;

        setProfile(null);
        setAttendance(null);
        setPendingTasks(null);
        setClassesToday(null);
        setLoadError(
          error.message || "Unable to load student sidebar information."
        );
      }
    }

    loadSidebarData();

    return () => {
      cancelled = true;
      controller.abort();
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
        <CampusCopilotBrand />
      </div>

      <Link
        to="/profile"
        className="px-md py-md transition-colors hover:bg-surface-container-low"
      >
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

        {loadError && (
          <p role="alert" className="mb-sm text-xs text-error">
            {loadError}
          </p>
        )}

        <div className="space-y-3">
          <Link to="/attendance" className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary-container text-secondary">
                <span className="material-symbols-outlined text-[16px]">
                  monitoring
                </span>
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
                <span className="material-symbols-outlined text-[16px]">
                  assignment
                </span>
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
                <span className="material-symbols-outlined text-[16px]">
                  school
                </span>
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