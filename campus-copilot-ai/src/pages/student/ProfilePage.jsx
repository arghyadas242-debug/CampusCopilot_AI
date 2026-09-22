import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import StudentPageLayout from "../../components/student/StudentPageLayout";
import { authService, getAuthHeader } from "../../services/api";

const API_URL = "http://localhost:5000";

function emptyMetrics() {
  return {
    attendancePercentage: null,
    attendedClasses: null,
    totalClasses: null,
    completedAssignments: null,
    totalAssignments: null,
    upcomingExams: null,
  };
}

function getInitials(name) {
  const parts = String(name || "Student")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "--";
}

function formatLastLogin(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
      .format(date)
      .replace(/\b(am|pm)\b/gi, (part) => part.toUpperCase());
  } catch {
    return date.toLocaleString("en-IN");
  }
}

function displayValue(value, fallback = "--") {
  return value === undefined || value === null || value === ""
    ? fallback
    : value;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRows(value, label) {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error(`Invalid ${label} data received.`);
  }
  return value;
}

function requireNumber(value) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && value.trim() === "")
  ) {
    throw new Error("Invalid numeric data received.");
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error("Invalid numeric data received.");
  }
  return number;
}

function optionalNumber(value) {
  return value === null || value === undefined || value === ""
    ? null
    : requireNumber(value);
}

function parseAcademicSummary(data) {
  if (!isRecord(data) || typeof data.hasAcademicSummary !== "boolean") {
    throw new Error("Invalid academic summary received.");
  }

  if (!data.hasAcademicSummary) {
    return {
      hasAcademicSummary: false,
      cgpa: null,
      creditsEarned: null,
      totalProgramCredits: null,
      completedSemesters: null,
      updatedAt: null,
    };
  }

  return {
    hasAcademicSummary: true,
    cgpa: optionalNumber(data.cgpa),
    creditsEarned: optionalNumber(data.creditsEarned),
    totalProgramCredits: optionalNumber(data.totalProgramCredits),
    completedSemesters: optionalNumber(data.completedSemesters),
    updatedAt: data.updatedAt ?? null,
  };
}

async function requestJson(path, signal) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: getAuthHeader(),
    signal,
  });

  if (!response.ok) {
    const error = new Error(
      response.status === 401
        ? "Your session has expired or you are not logged in. Please log in again."
        : response.status === 403
        ? "Access denied. Your session may be invalid or you may not have permission."
        : "Unable to load the requested records. Please try again."
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

export default function ProfilePage() {
  const currentUser = authService.getCurrentUser();
  const studentRoll = String(
    currentUser?.rollNumber ||
    currentUser?.studentRoll ||
    currentUser?.student_roll ||
    currentUser?.roll_number ||
    ""
  ).trim();

  const [studentInfo, setStudentInfo] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [academicSummary, setAcademicSummary] = useState(null);
  const [academicMetrics, setAcademicMetrics] = useState(emptyMetrics);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setLoading(true);
    setError("");
    setWarnings([]);
    setStudentInfo(null);
    setAccountInfo(null);
    setAcademicSummary(null);
    setAcademicMetrics(emptyMetrics());

    async function loadProfile() {
      try {
        if (!studentRoll) {
          throw new Error(
            "Student roll number was not found. Please log in again."
          );
        }

        const roll = encodeURIComponent(studentRoll);
        const studentData = await requestJson(
          `/api/students/${roll}`,
          controller.signal
        );

        if (!active) return;

        if (
          !isRecord(studentData) ||
          !studentData.STUDENT_ROLL ||
          !studentData.NAME ||
          String(studentData.STUDENT_ROLL).trim() !== studentRoll
        ) {
          throw new Error("Invalid student profile data received.");
        }

        const loadedStudent = {
          studentId: studentData.STUDENT_ID ?? null,
          name: studentData.NAME,
          email: studentData.EMAIL || "",
          rollNumber: studentData.STUDENT_ROLL,
          department: studentData.DEPARTMENT || "",
          semester: studentData.SEMESTER ?? null,
          section: studentData.SECTION || "",
        };

        const results = await Promise.allSettled(
          [
            "/api/auth/me",
            `/api/students/${roll}/academic-summary`,
            `/api/attendance/${roll}`,
            `/api/assignments/${roll}`,
            `/api/exams/${roll}`,
          ].map((path) => requestJson(path, controller.signal))
        );

        if (!active) return;

        const authFailure = results.find(
          (result) =>
            result.status === "rejected" &&
            [401, 403].includes(result.reason?.status)
        );

        if (authFailure) throw authFailure.reason;

        const loadWarnings = [];
        const metrics = emptyMetrics();
        let loadedAccount = null;
        let loadedSummary = null;

        function readOptional(index, label, parse) {
          const result = results[index];

          if (result.status !== "fulfilled") {
            loadWarnings.push(`${label} could not be loaded.`);
            return null;
          }

          try {
            return parse(result.value);
          } catch {
            loadWarnings.push(`${label} could not be loaded.`);
            return null;
          }
        }

        loadedAccount = readOptional(0, "Account information", (data) => {
          if (!isRecord(data) || !isRecord(data.user)) {
            throw new Error("Invalid account information received.");
          }
          return data.user;
        });

        loadedSummary = readOptional(
          1,
          "Academic summary",
          parseAcademicSummary
        );

        const attendance = readOptional(2, "Attendance", (data) => {
          const rows = requireRows(data, "attendance");
          let attendedClasses = 0;
          let totalClasses = 0;

          rows.forEach((item) => {
            const attended = requireNumber(
              item.ATTENDED_CLASSES ??
              item.attendedClasses ??
              item.attended_classes
            );
            const total = requireNumber(
              item.TOTAL_CLASSES ??
              item.totalClasses ??
              item.total_classes
            );

            if (attended > total) {
              throw new Error("Invalid attendance totals received.");
            }

            attendedClasses += attended;
            totalClasses += total;
          });

          if (
            !Number.isFinite(attendedClasses) ||
            !Number.isFinite(totalClasses)
          ) {
            throw new Error("Invalid attendance totals received.");
          }

          return {
            attendedClasses,
            totalClasses,
            attendancePercentage:
              totalClasses > 0
                ? Number(((attendedClasses / totalClasses) * 100).toFixed(1))
                : 0,
          };
        });

        if (attendance) Object.assign(metrics, attendance);

        const assignments = readOptional(3, "Assignments", (data) => {
          const rows = requireRows(
            Array.isArray(data) ? data : data?.assignments,
            "assignment"
          );

          const completed = rows.filter((item) => {
            const status = String(item.STATUS ?? item.status ?? "")
              .trim()
              .toLowerCase();

            return status === "completed" || status === "submitted";
          }).length;

          return {
            completedAssignments: completed,
            totalAssignments: rows.length,
          };
        });

        if (assignments) Object.assign(metrics, assignments);

        const exams = readOptional(4, "Exams", (data) =>
          requireRows(data, "exam")
        );

        // Preserve the existing count; this metric is not displayed here.
        if (exams !== null) metrics.upcomingExams = exams.length;

        setStudentInfo(loadedStudent);
        setAccountInfo(loadedAccount);
        setAcademicSummary(loadedSummary);
        setAcademicMetrics(metrics);
        setWarnings(loadWarnings);
      } catch (err) {
        if (!active || err.name === "AbortError") return;

        setStudentInfo(null);
        setAccountInfo(null);
        setAcademicSummary(null);
        setAcademicMetrics(emptyMetrics());
        setWarnings([]);
        setError(err.message || "Unable to load student profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
      controller.abort();
    };
  }, [studentRoll]);

  const initials = useMemo(
    () => getInitials(studentInfo?.name || currentUser?.name),
    [studentInfo?.name, currentUser?.name]
  );

  const profileCompleteness = useMemo(() => {
    if (!studentInfo) return 0;

    const fields = [
      studentInfo.name,
      studentInfo.email,
      studentInfo.rollNumber,
      studentInfo.department,
      studentInfo.semester,
      studentInfo.section,
      studentInfo.studentId,
    ];

    const completed = fields.filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    ).length;

    return Math.round((completed / fields.length) * 100);
  }, [studentInfo]);

  const lastLoginText = formatLastLogin(accountInfo?.lastLogin);

  // Preserve the existing indicator based on a loaded account record.
  const accountActive = Boolean(accountInfo);

  const cgpaText =
    academicSummary?.hasAcademicSummary && academicSummary.cgpa !== null
      ? academicSummary.cgpa.toFixed(2)
      : "--";

  const cgpaSubtitle =
    academicSummary === null
      ? "Unavailable"
      : academicSummary.hasAcademicSummary &&
        academicSummary.completedSemesters !== null
      ? `Till Semester ${academicSummary.completedSemesters}`
      : "Not recorded";

  const creditsText =
    academicSummary?.hasAcademicSummary &&
    academicSummary.creditsEarned !== null
      ? academicSummary.creditsEarned
      : "--";

  const creditsSubtitle =
    academicSummary === null
      ? "Unavailable"
      : academicSummary.hasAcademicSummary &&
        academicSummary.totalProgramCredits !== null
      ? `of ${academicSummary.totalProgramCredits}`
      : "Not recorded";

  if (loading) {
    return (
      <StudentPageLayout
        activePath="/profile"
        eyebrow="STUDENT PROFILE"
        title="My Profile"
        subtitle="View your CampusCopilot identity, academic records and account information."
      >
        <div className="min-h-[420px] rounded-2xl border border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[34px] animate-pulse">
              account_circle
            </span>
          </div>
          <h2 className="font-title-md font-bold text-on-surface mt-4">
            Loading Student Profile
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Loading your CampusCopilot records...
          </p>
        </div>
      </StudentPageLayout>
    );
  }

  if (error || !studentInfo) {
    return (
      <StudentPageLayout
        activePath="/profile"
        eyebrow="STUDENT PROFILE"
        title="My Profile"
        subtitle="View your CampusCopilot identity, academic records and account information."
      >
        <div
          role="alert"
          className="min-h-[360px] rounded-2xl border border-error/30 bg-surface-container-lowest flex flex-col items-center justify-center text-center px-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-error-container text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[34px]">
              error
            </span>
          </div>
          <h2 className="font-title-md font-bold text-on-surface mt-4">
            Unable to Load Profile
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-md">
            {error || "Student information is unavailable."}
          </p>
        </div>
      </StudentPageLayout>
    );
  }

  return (
    <StudentPageLayout
      activePath="/profile"
      eyebrow="STUDENT PROFILE"
      title="My Profile"
      subtitle="View your CampusCopilot identity, academic records and account information."
    >
      <div className="w-full pb-8 space-y-4">
        {warnings.length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-error/30 bg-surface-container-lowest px-4 py-3 text-sm text-error"
          >
            {warnings.join(" ")} Unavailable values are shown as --.
          </div>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(330px,0.82fr)_minmax(560px,1.58fr)] gap-4">
          <div className="rounded-2xl border border-outline-variant overflow-hidden bg-surface-container-lowest">
            <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-container to-secondary text-white px-6 py-6 text-center">
              <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full border border-white/10" />
              <div className="absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-white/5" />

              <div className="relative z-10">
                <div className="mx-auto w-20 h-20 rounded-full bg-white/15 border-4 border-white/25 backdrop-blur-sm flex items-center justify-center text-2xl font-bold shadow-sm">
                  {initials}
                </div>
                <h2 className="mt-3 text-2xl font-bold font-headline-lg">
                  {studentInfo.name}
                </h2>
                <p className="text-sm text-white/90 mt-0.5">
                  {studentInfo.department || "Department not available"}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-white text-primary text-xs font-bold">
                    Semester {displayValue(studentInfo.semester)}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">
                    Section {displayValue(studentInfo.section)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-outline-variant border-b border-outline-variant">
              <div className="px-3 py-4 text-center">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  badge
                </span>
                <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mt-1">
                  Student ID
                </p>
                <p className="text-sm font-bold text-on-surface mt-1">
                  {displayValue(studentInfo.studentId)}
                </p>
              </div>
              <div className="px-3 py-4 text-center">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  id_card
                </span>
                <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mt-1">
                  University Roll
                </p>
                <p className="text-xs sm:text-sm font-bold text-on-surface mt-1 break-all">
                  {studentInfo.rollNumber}
                </p>
              </div>
              <div className="px-3 py-4 text-center">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  verified_user
                </span>
                <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mt-1">
                  Profile Record
                </p>
                <p className="text-sm font-bold text-on-surface mt-1">
                  Loaded
                </p>
              </div>
            </div>

            <div className="p-4">
              <Link
                to="/student-id"
                className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[20px]">
                  badge
                </span>
                View Digital Student ID
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-title-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    school
                  </span>
                  Official Academic Records
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Verified information from your CampusCopilot student record.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RecordCard
                icon="id_card"
                label="University Roll No"
                value={studentInfo.rollNumber}
              />
              <RecordCard
                icon="mail"
                label="University Email"
                value={studentInfo.email || "Not available"}
              />
              <RecordCard
                icon="account_balance"
                label="Department"
                value={studentInfo.department || "Not available"}
              />
              <RecordCard
                icon="badge"
                label="Student ID"
                value={displayValue(studentInfo.studentId, "Not available")}
              />
              <RecordCard
                icon="layers"
                label="Current Semester"
                value={displayValue(studentInfo.semester, "Not available")}
              />
              <RecordCard
                icon="groups"
                label="Section"
                value={studentInfo.section || "Not available"}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(620px,1.55fr)_minmax(360px,0.95fr)] gap-4">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-title-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    menu_book
                  </span>
                  Academic Overview
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Live summary from your academic records.
                </p>
              </div>
              <Link
                to="/ai-analytics"
                className="h-9 px-3 rounded-lg border border-outline-variant text-primary text-xs font-bold flex items-center gap-1 hover:bg-surface-container-low transition-colors"
              >
                View Analytics
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                icon="trending_up"
                iconClass="bg-secondary-container text-secondary"
                label="CGPA"
                value={cgpaText}
                subtitle={cgpaSubtitle}
              />
              <MetricCard
                icon="workspace_premium"
                iconClass="bg-orange-100 text-orange-600"
                label="Credits Earned"
                value={creditsText}
                subtitle={creditsSubtitle}
              />
              <MetricCard
                icon="task_alt"
                iconClass="bg-purple-100 text-purple-700"
                label="Completed"
                value={academicMetrics.completedAssignments ?? "--"}
                subtitle={
                  academicMetrics.totalAssignments === null
                    ? "Unavailable"
                    : academicMetrics.totalAssignments > 0
                    ? `${academicMetrics.completedAssignments} of ${academicMetrics.totalAssignments} assignments`
                    : "Completed assignments"
                }
              />
              <MetricCard
                icon="calendar_month"
                iconClass="bg-primary-fixed text-primary"
                label="Attendance"
                value={
                  academicMetrics.attendancePercentage !== null
                    ? `${academicMetrics.attendancePercentage}%`
                    : "--"
                }
                subtitle={
                  academicMetrics.totalClasses === null
                    ? "Unavailable"
                    : academicMetrics.totalClasses > 0
                    ? `${academicMetrics.attendedClasses}/${academicMetrics.totalClasses} classes`
                    : "Overall attendance"
                }
              />
            </div>

            {academicSummary?.hasAcademicSummary === false && (
              <div className="mt-3 rounded-lg bg-surface-container-low border border-outline-variant/50 px-3 py-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  info
                </span>
                <p className="text-xs text-on-surface-variant">
                  CGPA and credit information has not been added to your
                  academic record yet.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">
                shield
              </span>
              <h2 className="font-title-md font-bold text-on-surface">
                Campus Account & Security
              </h2>
            </div>

            <SecurityRow icon="person" label="Account Status">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  accountActive
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {accountActive ? "Active" : "Unknown"}
              </span>
            </SecurityRow>

            <SecurityRow icon="mail" label="Email">
              <span className="text-xs font-semibold text-on-surface text-right break-all">
                {studentInfo.email || accountInfo?.email || "Not available"}
              </span>
            </SecurityRow>

            <SecurityRow icon="key" label="Password">
              <div className="flex items-center gap-2">
                <span className="tracking-[2px] font-bold text-on-surface">
                  ••••••••
                </span>
                <button
                  type="button"
                  onClick={() => {
                    window.alert("Password change is not configured yet.");
                  }}
                  className="h-8 px-3 rounded-lg border border-primary/40 text-primary text-xs font-bold hover:bg-primary-fixed transition-colors cursor-pointer"
                >
                  Change
                </button>
              </div>
            </SecurityRow>

            <SecurityRow icon="schedule" label="Last Login" last>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-on-surface text-right">
                  {lastLoginText}
                </span>
                <span className="material-symbols-outlined text-outline text-[18px]">
                  chevron_right
                </span>
              </div>
            </SecurityRow>
          </div>
        </section>

        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="font-title-md font-bold text-on-surface">
            Quick Access
          </h2>
          <p className="text-xs text-on-surface-variant mt-1 mb-4">
            Jump directly to your most-used CampusCopilot pages.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <QuickAccessCard
              to="/student-id"
              icon="qr_code_2"
              iconClass="bg-primary-fixed text-primary"
              title="Digital ID"
              description="View your secure student identity"
            />
            <QuickAccessCard
              to="/attendance"
              icon="monitoring"
              iconClass="bg-secondary-container text-secondary"
              title="Attendance"
              description="Check subject-wise attendance"
            />
            <QuickAccessCard
              to="/assignments"
              icon="assignment"
              iconClass="bg-orange-100 text-orange-600"
              title="Assignments"
              description="View pending and completed tasks"
            />
            <QuickAccessCard
              to="/exams"
              icon="calendar_month"
              iconClass="bg-primary-fixed text-primary"
              title="Exams"
              description="Check upcoming examinations"
            />
            <QuickAccessCard
              to="/notices"
              icon="campaign"
              iconClass="bg-purple-100 text-purple-700"
              title="Notices"
              description="View campus announcements"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-container text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[21px]">
                info
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-on-surface">
                    Academic record information
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Your student identity and academic details are loaded from
                    CampusCopilot records. Academic changes should be handled
                    through the appropriate administrative process.
                  </p>
                </div>
                <div className="hidden md:block text-right shrink-0">
                  <p className="text-[10px] uppercase font-bold tracking-wide text-on-surface-variant">
                    Profile Completeness
                  </p>
                  <p className="text-sm font-bold text-primary mt-0.5">
                    {profileCompleteness}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StudentPageLayout>
  );
}

function RecordCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[22px]">
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide font-bold text-on-surface-variant">
          {label}
        </p>
        <p className="mt-1 text-sm font-bold text-on-surface break-words">
          {value}
        </p>
      </div>
    </div>
  );
}

function MetricCard({ icon, iconClass, label, value, subtitle }) {
  return (
    <div className="min-h-[170px] rounded-xl border border-outline-variant bg-surface-container-low px-4 py-4 flex flex-col items-center justify-center text-center">
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center ${iconClass}`}
      >
        <span className="material-symbols-outlined text-[23px]">
          {icon}
        </span>
      </div>
      <p className="text-xs font-bold text-on-surface mt-3">{label}</p>
      <p className="text-2xl font-extrabold text-primary mt-1">{value}</p>
      <p className="text-[10px] text-on-surface-variant mt-2">{subtitle}</p>
    </div>
  );
}

function SecurityRow({ icon, label, children, last = false }) {
  return (
    <div
      className={`min-h-[51px] px-5 flex items-center justify-between gap-4 ${
        last ? "" : "border-b border-outline-variant"
      }`}
    >
      <div className="flex items-center gap-3 shrink-0">
        <span className="material-symbols-outlined text-primary text-[21px]">
          {icon}
        </span>
        <span className="text-xs text-on-surface">{label}</span>
      </div>
      <div className="min-w-0 flex justify-end">{children}</div>
    </div>
  );
}

function QuickAccessCard({ to, icon, iconClass, title, description }) {
  return (
    <Link
      to={to}
      className="min-h-[78px] rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 flex items-center gap-3 hover:bg-surface-container transition-colors"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
      >
        <span className="material-symbols-outlined text-[21px]">
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-on-surface">{title}</p>
        <p className="text-[10px] text-on-surface-variant mt-0.5 leading-4">
          {description}
        </p>
      </div>
    </Link>
  );
}