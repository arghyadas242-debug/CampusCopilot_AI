import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { authService, getAuthHeader } from "../../services/api";
import CampusCopilotBrand from "../../components/student/CampusCopilotBrand";
import StudentNotificationBell from "./StudentNotificationBell";
import StudentPageHero from "../../components/student/StudentPageHero";

const API_URL = "http://localhost:5000";
const CAMPUS_TIME_ZONE = "Asia/Kolkata";

const NAV_ITEMS = [
  { label: "Home", path: "/dashboard", icon: "dashboard" },
  { label: "Timetable", path: "/timetable", icon: "calendar_month" },
  { label: "Attendance", path: "/attendance", icon: "analytics" },
  { label: "Assignments", path: "/assignments", icon: "assignment" },
  { label: "Exams", path: "/exams", icon: "description" },
  { label: "Notices", path: "/notices", icon: "campaign" },
  { label: "AI Analytics", path: "/ai-analytics", icon: "insights" },
  { label: "Resources", path: "/resources", icon: "folder_open" },
  { label: "Digital ID", path: "/student-id", icon: "badge" },
];

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length
    ? parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
    : "ST";
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatNoticeDate(value) {
  const date = parseDate(value);
  if (!date) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: CAMPUS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getCampusYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function isNoticeInCurrentMonth(value) {
  const date = parseDate(value);
  if (!date) return false;

  const notice = getCampusYearMonth(date);
  const current = getCampusYearMonth();
  return notice.year === current.year && notice.month === current.month;
}

function cleanSummary(items) {
  return items
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAiSummary(value) {
  if (!value) return [];
  if (Array.isArray(value)) return cleanSummary(value);

  if (typeof value === "object") {
    return Array.isArray(value.summary) ? cleanSummary(value.summary) : [];
  }

  if (typeof value !== "string") return [];
  const text = value.trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return cleanSummary(parsed);
    if (Array.isArray(parsed?.summary)) return cleanSummary(parsed.summary);
    if (typeof parsed !== "string") return [];
    return parsed.trim() ? [parsed.trim()] : [];
  } catch {
    return text
      .split(/\r?\n|\s*•\s*/)
      .map((item) => item.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  }
}

function normalizeCategory(category, tag) {
  const categoryText = String(category || "").trim().toLowerCase();
  const tagText = String(tag || "").trim().toLowerCase();

  if (categoryText.includes("exam") || tagText.includes("exam")) return "exam";
  if (categoryText.includes("event") || tagText === "event") return "event";
  if (categoryText.includes("academic") || tagText === "academic") return "academic";
  if (
    categoryText.includes("important") ||
    categoryText.includes("urgent") ||
    tagText === "important" ||
    tagText === "urgent"
  ) {
    return "important";
  }
  return "general";
}

function getTagColor(tag) {
  const value = String(tag || "").trim().toUpperCase();
  if (["URGENT", "IMPORTANT", "EXAM"].includes(value)) {
    return "bg-error-container text-error";
  }
  if (value === "EVENT") return "bg-green-100 text-green-700";
  if (value === "ACADEMIC") return "bg-tertiary/10 text-tertiary";
  if (value === "TEST") return "bg-purple-100 text-purple-700";
  return "bg-primary/10 text-primary";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRows(value) {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error("Invalid records received from the server.");
  }
  return value;
}

function normalizeAttachments(row) {
  const raw = row.ATTACHMENTS ?? row.attachments;
  if (Array.isArray(raw)) return raw.filter(isRecord);

  const url =
    row.ATTACHMENT_URL ?? row.attachmentUrl ?? row.attachment_url ?? null;

  if (!url) return [];

  return [{
    name:
      row.ATTACHMENT_NAME ??
      row.attachmentName ??
      row.attachment_name ??
      "Attachment",
    type:
      row.ATTACHMENT_TYPE ??
      row.attachmentType ??
      row.attachment_type ??
      "Document",
    url,
  }];
}

function getAttachmentUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("This attachment has no valid URL.");
  }

  const url = new URL(value.trim(), `${API_URL}/`);

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("This attachment URL is not supported.");
  }
  return url;
}

function responseError(status) {
  const error = new Error(
    status === 401
      ? "Please log in again to access your records."
      : status === 403
      ? "Access denied. Your session may be invalid or you may not have permission."
      : "Unable to load the requested data. Please try again."
  );
  error.status = status;
  return error;
}

async function requestJson(path, signal) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: getAuthHeader(),
    signal,
  });

  if (!response.ok) throw responseError(response.status);

  try {
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Invalid response received from the server.");
  }
}

function readCount(value) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  ) {
    throw new Error("Invalid attendance totals.");
  }

  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) {
    throw new Error("Invalid attendance totals.");
  }
  return count;
}

export default function NoticesPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const studentRoll = String(
    currentUser?.rollNumber ||
    currentUser?.studentRoll ||
    currentUser?.roll_number ||
    currentUser?.student_roll ||
    ""
  ).trim();

  const [notices, setNotices] = useState([]);
  const [selectedNoticeId, setSelectedNoticeId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarError, setSidebarError] = useState("");
  const [fileError, setFileError] = useState("");
  const [bookmarkError, setBookmarkError] = useState("");
  const [openingFile, setOpeningFile] = useState(false);

  const [profile, setProfile] = useState(null);
  const [attendancePercentage, setAttendancePercentage] = useState(null);
  const [pendingTasks, setPendingTasks] = useState(null);
  const [classesToday, setClassesToday] = useState(null);

  const fileRequest = useRef(null);

  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("campuscopilot_notice_bookmarks") || "[]"
      );
      return Array.isArray(stored)
        ? stored.filter((id) => typeof id === "string" || typeof id === "number")
        : [];
    } catch {
      return [];
    }
  });

  const displayName =
    profile?.NAME || currentUser?.name || currentUser?.fullName || "Student";
  const displayDepartment =
    profile?.DEPARTMENT || currentUser?.department || "Department unavailable";
  const displayRoll = profile?.STUDENT_ROLL || studentRoll;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setLoading(true);
    setError("");
    setSidebarError("");
    setNotices([]);
    setSelectedNoticeId(null);
    setProfile(null);
    setAttendancePercentage(null);
    setPendingTasks(null);
    setClassesToday(null);

    async function loadPage() {
      try {
        const data = await requestJson("/api/notices", controller.signal);
        if (!active) return;

        const rows = requireRows(Array.isArray(data) ? data : data?.notices);
        const ids = new Set();

        const formatted = rows.map((row) => {
          const id = row.ID ?? row.id;

          if (
            !["string", "number"].includes(typeof id) ||
            !String(id).trim() ||
            (typeof id === "number" && !Number.isFinite(id)) ||
            ids.has(String(id))
          ) {
            throw new Error("Invalid notice identifiers received.");
          }
          ids.add(String(id));

          const tag = String(row.TAG ?? row.tag ?? "GENERAL").trim().toUpperCase();
          const category = row.CATEGORY ?? row.category ?? "General";
          const createdAt =
            row.CREATED_AT ?? row.createdAt ?? row.created_at ?? null;

          return {
            id,
            title: row.TITLE ?? row.title ?? "Campus Notice",
            author: row.AUTHOR ?? row.author ?? "University Administration",
            tag,
            rawCategory: String(category || "General"),
            category: normalizeCategory(category, tag),
            content: row.CONTENT ?? row.content ?? "",
            summary: parseAiSummary(
              row.AI_SUMMARY ?? row.aiSummary ?? row.ai_summary ?? row.summary
            ),
            createdAt,
            formattedDate: formatNoticeDate(createdAt),
            attachments: normalizeAttachments(row),
          };
        });

        if (studentRoll) {
          const roll = encodeURIComponent(studentRoll);
          const results = await Promise.allSettled(
            ["students", "attendance", "assignments", "timetable"].map(
              (resource) =>
                requestJson(`/api/${resource}/${roll}`, controller.signal)
            )
          );

          if (!active) return;

          const authFailure = results.find(
            (result) =>
              result.status === "rejected" &&
              [401, 403].includes(result.reason?.status)
          );
          if (authFailure) throw authFailure.reason;

          const failures = [];

          function readOptional(index, label, parse) {
            const result = results[index];
            if (result.status !== "fulfilled") {
              failures.push(label);
              return null;
            }
            try {
              return parse(result.value);
            } catch {
              failures.push(label);
              return null;
            }
          }

          setProfile(readOptional(0, "Profile", (value) => {
            if (
              !isRecord(value) ||
              !value.NAME ||
              String(value.STUDENT_ROLL ?? "").trim() !== studentRoll
            ) {
              throw new Error("Invalid profile.");
            }
            return value;
          }));

          setAttendancePercentage(readOptional(1, "Attendance", (value) => {
            let attended = 0;
            let total = 0;

            requireRows(value).forEach((row) => {
              const a = readCount(row.ATTENDED_CLASSES ?? row.attended_classes);
              const t = readCount(row.TOTAL_CLASSES ?? row.total_classes);
              if (a > t) throw new Error("Invalid attendance.");
              attended += a;
              total += t;
            });

            if (!Number.isFinite(attended) || !Number.isFinite(total)) {
              throw new Error("Invalid attendance.");
            }
            return total > 0
              ? Number(((attended / total) * 100).toFixed(1))
              : null;
          }));

          setPendingTasks(readOptional(2, "Assignments", (value) =>
            requireRows(value).filter(
              (assignment) =>
                String(assignment.STATUS ?? assignment.status ?? "")
                  .trim().toLowerCase() === "pending"
            ).length
          ));

          setClassesToday(readOptional(3, "Timetable", (value) => {
            const weekday = new Intl.DateTimeFormat("en-US", {
              timeZone: CAMPUS_TIME_ZONE,
              weekday: "long",
            }).format(new Date()).toLowerCase();

            return requireRows(value).filter(
              (row) =>
                String(row.DAY_OF_WEEK ?? row.day_of_week ?? "")
                  .trim().toLowerCase() === weekday
            ).length;
          }));

          setSidebarError(
            failures.length ? `Could not load: ${failures.join(", ")}.` : ""
          );
        } else {
          setSidebarError("Student roll number unavailable. Please log in again.");
        }

        setNotices(formatted);
        setSelectedNoticeId(formatted[0]?.id ?? null);
      } catch (err) {
        if (!active || err.name === "AbortError") return;
        setNotices([]);
        setSelectedNoticeId(null);
        setProfile(null);
        setAttendancePercentage(null);
        setPendingTasks(null);
        setClassesToday(null);
        setError(err.message || "Unable to load campus notices.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPage();

    return () => {
      active = false;
      controller.abort();
    };
  }, [studentRoll]);

  useEffect(() => {
    setOpeningFile(false);
    setFileError("");

    return () => {
      const pending = fileRequest.current;
      fileRequest.current = null;
      if (pending) {
        pending.controller.abort();
        pending.preview?.close();
      }
    };
  }, [studentRoll]);

  const filteredNotices = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    const result = notices.filter((notice) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "important"
          ? ["URGENT", "IMPORTANT"].includes(notice.tag) ||
            notice.category === "important"
          : notice.category === filter);

      return matchesFilter && (
        !cleanSearch ||
        [
          notice.title,
          notice.author,
          notice.tag,
          notice.rawCategory,
          notice.content,
        ].some((value) => String(value || "").toLowerCase().includes(cleanSearch))
      );
    });

    return result.sort((first, second) => {
      const a = parseDate(first.createdAt)?.getTime() || 0;
      const b = parseDate(second.createdAt)?.getTime() || 0;
      return sortOrder === "latest" ? b - a : a - b;
    });
  }, [notices, filter, search, sortOrder]);

  useEffect(() => {
    if (!filteredNotices.length) {
      setSelectedNoticeId(null);
      return;
    }
    if (!filteredNotices.some((notice) => String(notice.id) === String(selectedNoticeId))) {
      setSelectedNoticeId(filteredNotices[0].id);
    }
  }, [filteredNotices, selectedNoticeId]);

  const selectedNotice = useMemo(
    () =>
      filteredNotices.find(
        (notice) => String(notice.id) === String(selectedNoticeId)
      ) || filteredNotices[0] || null,
    [filteredNotices, selectedNoticeId]
  );

  const noticesThisMonth = useMemo(
    () => notices.filter((notice) => isNoticeInCurrentMonth(notice.createdAt)).length,
    [notices]
  );

  const categoryCount = useMemo(
    () => new Set(notices.map((notice) => notice.category).filter(Boolean)).size,
    [notices]
  );

  function isBookmarked(id) {
    return bookmarkedIds.some((saved) => String(saved) === String(id));
  }

  function toggleBookmark(id) {
    const next = isBookmarked(id)
      ? bookmarkedIds.filter((saved) => String(saved) !== String(id))
      : [...bookmarkedIds, id];

    try {
      localStorage.setItem("campuscopilot_notice_bookmarks", JSON.stringify(next));
      setBookmarkedIds(next);
      setBookmarkError("");
    } catch {
      setBookmarkError("Could not save bookmarks in this browser.");
    }
  }

  async function openAttachment(value, name) {
    if (fileRequest.current) return;
    setFileError("");

    let url;
    try {
      url = getAttachmentUrl(value);
    } catch (err) {
      setFileError(err.message);
      return;
    }

    // External links must never receive the CampusCopilot token.
    if (url.origin !== new URL(API_URL).origin) {
      const link = document.createElement("a");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    const preview = window.open("about:blank", "_blank");
    if (preview) preview.opener = null;

    const controller = new AbortController();
    const request = { controller, preview };
    fileRequest.current = request;
    setOpeningFile(true);

    try {
      const response = await fetch(url.href, {
        headers: getAuthHeader(),
        signal: controller.signal,
        redirect: "error",
      });

      if (!response.ok) throw responseError(response.status);
      const blob = await response.blob();

      if (fileRequest.current !== request) return;

      const objectUrl = URL.createObjectURL(blob);
      const mime = blob.type.split(";")[0].toLowerCase();
      const canPreview = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "image/avif",
        "text/plain",
      ].includes(mime);

      // Active document formats are downloaded instead of rendered.
      if (canPreview && preview && !preview.closed) {
        preview.location.replace(objectUrl);
      } else {
        preview?.close();
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = String(name || "attachment").replace(/[\\/\r\n]/g, "_");
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      preview?.close();
      if (fileRequest.current === request && err.name !== "AbortError") {
        setFileError(err.message || "Unable to open attachment.");
      }
    } finally {
      if (fileRequest.current === request) {
        fileRequest.current = null;
        setOpeningFile(false);
      }
    }
  }

  function handleLogout() {
    authService.logout();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-primary animate-pulse">
            campaign
          </span>
          <p className="mt-3 text-on-surface-variant">Loading campus notices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center" role="alert">
          <span className="material-symbols-outlined text-5xl text-error">error</span>
          <h2 className="mt-3 text-xl font-bold text-error">Unable to Load Notices</h2>
          <p className="mt-2 text-on-surface-variant">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex font-body-md">
      <aside className="hidden lg:flex w-[280px] shrink-0 h-screen sticky top-0 bg-surface border-r border-outline-variant flex-col">
        <div className="px-md pt-md pb-sm"><CampusCopilotBrand /></div>

        <Link to="/profile" className="px-md py-md hover:bg-surface-container-low transition-colors">
          <div className="flex items-center gap-sm">
            <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <div className="font-title-md font-semibold text-on-surface">{displayName}</div>
              <div className="font-body-sm text-on-surface-variant leading-5">{displayDepartment}</div>
              <div className="font-label-caps text-outline mt-0.5">ID: {displayRoll || "--"}</div>
            </div>
          </div>
        </Link>

        <nav className="px-2 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.path === "/notices";
            return (
              <Link
                key={item.path}
                to={item.path}
                className={active
                  ? "bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-semibold flex items-center gap-sm"
                  : "text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"}
              >
                <span className="material-symbols-outlined"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 mt-md rounded-xl border border-outline-variant bg-surface-container-lowest p-sm">
          <div className="font-label-caps text-outline mb-sm">TODAY SUMMARY</div>
          {sidebarError && <p role="alert" className="text-xs text-error mb-sm">{sidebarError}</p>}
          <div className="space-y-3">
            <Link to="/attendance" className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-secondary-container text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">monitoring</span>
                </div>
                <span className="font-body-sm text-on-surface">Attendance</span>
              </div>
              <span className="font-body-sm font-bold text-secondary">
                {attendancePercentage !== null ? `${attendancePercentage}%` : "--"}
              </span>
            </Link>
            <Link to="/assignments" className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-error-container text-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">assignment</span>
                </div>
                <span className="font-body-sm text-on-surface">Pending Tasks</span>
              </div>
              <span className="font-body-sm font-bold text-error">{pendingTasks ?? "--"}</span>
            </Link>
            <Link to="/timetable" className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">school</span>
                </div>
                <span className="font-body-sm text-on-surface">Classes Today</span>
              </div>
              <span className="font-body-sm font-bold text-primary">{classesToday ?? "--"}</span>
            </Link>
          </div>
        </div>

        <div className="flex-1" />
        <div className="mx-2 px-2 py-sm border-t border-outline-variant">
          <Link to="/profile" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm">
            <span className="material-symbols-outlined">account_circle</span>Profile
          </Link>
          <button type="button" onClick={handleLogout}
            className="w-full text-error px-4 py-2.5 rounded-xl hover:bg-error-container/20 flex items-center gap-sm text-left">
            <span className="material-symbols-outlined">logout</span>Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-50 h-[64px] bg-surface border-b border-outline-variant px-margin-mobile flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Link to="/profile" className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
              {getInitials(displayName)}
            </Link>
            <span className="font-headline-lg-mobile font-bold text-primary">CampusCopilot</span>
          </div>
          <StudentNotificationBell />
        </header>

        <main className="w-full px-margin-mobile md:px-lg py-md pb-[90px] lg:pb-lg">
          <div className="mb-md">
            <StudentPageHero eyebrow="CAMPUS NOTICES" title="Campus Notices"
              subtitle="Official circulars, events, and AI summaries." />
          </div>

          {bookmarkError && <p role="alert" className="mb-md text-sm text-error">{bookmarkError}</p>}
          {fileError && <p role="alert" className="mb-md text-sm text-error">{fileError}</p>}
          {openingFile && <p role="status" className="mb-md text-sm text-on-surface-variant">Opening attachment...</p>}

          <section className="mb-md">
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="relative w-full xl:w-[320px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                <input type="text" value={search} onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search notices..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
                {[
                  { key: "all", label: "All", icon: "grid_view" },
                  { key: "exam", label: "Exam", icon: "calendar_month" },
                  { key: "event", label: "Event", icon: "celebration" },
                  { key: "academic", label: "Academic", icon: "menu_book" },
                  { key: "important", label: "Important", icon: "error" },
                ].map((item) => (
                  <button key={item.key} type="button" onClick={() => setFilter(item.key)}
                    className={`h-10 px-4 rounded-xl border flex items-center gap-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                      filter === item.key
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-surface-container-lowest text-on-surface border-outline-variant hover:bg-surface-container-low"
                    }`}>
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}
                className="xl:ml-auto h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm font-semibold outline-none">
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[330px_minmax(0,1fr)_260px] gap-md items-start">
            <aside className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
                <span className="font-title-md font-bold text-sm">All Announcements</span>
                <span className="text-xs text-outline">{filteredNotices.length}</span>
              </div>
              <div className="divide-y divide-outline-variant max-h-[720px] overflow-y-auto">
                {filteredNotices.length === 0 && (
                  <div className="p-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline">search_off</span>
                    <p className="text-sm text-on-surface-variant mt-2">
                      {notices.length ? "No notices match your search." : "No notices have been published."}
                    </p>
                  </div>
                )}
                {filteredNotices.map((notice) => {
                  const selected = String(selectedNotice?.id) === String(notice.id);
                  return (
                    <button key={notice.id} type="button" onClick={() => setSelectedNoticeId(notice.id)}
                      className={`w-full text-left p-4 border-l-[3px] transition-colors ${
                        selected ? "bg-primary/5 border-primary" : "border-transparent hover:bg-surface-container-low"
                      }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold ${getTagColor(notice.tag)}`}>{notice.tag}</span>
                          <h3 className="mt-2 text-sm font-bold text-on-surface leading-5">{notice.title}</h3>
                          <div className="mt-2 text-[11px] text-on-surface-variant">
                            <div>{notice.author}</div>
                            <div className="mt-0.5 text-outline">{notice.formattedDate}</div>
                          </div>
                        </div>
                        {isBookmarked(notice.id) && (
                          <span className="material-symbols-outlined text-[18px] text-primary shrink-0"
                            style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="min-w-0">
              {!selectedNotice ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
                  <span className="material-symbols-outlined text-5xl text-outline">campaign</span>
                  <h2 className="font-bold text-lg mt-2">No Notice Selected</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Select an announcement to view its details.</p>
                </div>
              ) : (
                <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md md:p-lg">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${getTagColor(selectedNotice.tag)}`}>{selectedNotice.tag}</span>
                        <span className="text-xs text-outline">Circular #{selectedNotice.id}</span>
                      </div>
                      <h2 className="mt-3 text-xl md:text-2xl font-bold text-on-surface">{selectedNotice.title}</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">person</span>{selectedNotice.author}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>{selectedNotice.formattedDate}
                        </span>
                      </div>
                    </div>
                    <button type="button" onClick={() => toggleBookmark(selectedNotice.id)}
                      className={`h-10 px-4 rounded-lg border flex items-center gap-2 text-sm font-semibold shrink-0 transition-colors ${
                        isBookmarked(selectedNotice.id)
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-surface text-on-surface border-outline-variant hover:bg-surface-container-low"
                      }`}>
                      <span className="material-symbols-outlined text-[18px]"
                        style={isBookmarked(selectedNotice.id) ? { fontVariationSettings: "'FILL' 1" } : undefined}>bookmark</span>
                      {isBookmarked(selectedNotice.id) ? "Bookmarked" : "Bookmark"}
                    </button>
                  </div>

                  <div className="mt-md rounded-xl border border-primary/15 bg-primary/5 p-md">
                    <div className="flex items-center gap-2 text-tertiary font-bold text-sm">
                      <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[19px]">auto_awesome</span>
                      </div>
                      CampusCopilot AI Key Highlights (TL;DR)
                    </div>
                    {selectedNotice.summary.length > 0 ? (
                      <ul className="mt-3 space-y-2.5">
                        {selectedNotice.summary.map((point, index) => (
                          <li key={`${selectedNotice.id}-${index}`} className="flex items-start gap-2 text-sm text-on-surface">
                            <span className="material-symbols-outlined text-secondary text-[18px] mt-[1px] shrink-0">check_circle</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-on-surface-variant">No AI summary was added to this notice.</p>
                    )}
                  </div>

                  <div className="mt-md pt-md border-t border-outline-variant">
                    <div className="text-sm md:text-[15px] leading-7 text-on-surface whitespace-pre-wrap">
                      {selectedNotice.content || "No notice content was provided."}
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-outline-variant">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">attach_file</span>
                      </div>
                      <div>
                        <h3 className="font-title-md font-bold text-on-surface leading-tight">Official Attachments</h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">Files and documents published with this notice</p>
                      </div>
                    </div>

                    {selectedNotice.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedNotice.attachments.map((attachment, index) => {
                          const name = attachment.name ?? attachment.FILE_NAME ?? "Attachment";
                          const type = attachment.type ?? attachment.FILE_TYPE ?? "Document";
                          const url = attachment.url ?? attachment.FILE_URL ?? null;
                          const card = (
                            <div className="min-h-[72px] px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-colors flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-error-container text-error flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-[21px]">description</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-on-surface truncate">{name}</div>
                                  <div className="text-xs text-on-surface-variant mt-0.5">{type}</div>
                                </div>
                              </div>
                              {url && <span className="material-symbols-outlined text-primary shrink-0">download</span>}
                            </div>
                          );

                          return url ? (
                            <button key={`${selectedNotice.id}-${index}`} type="button"
                              onClick={() => openAttachment(url, name)}
                              disabled={openingFile}
                              className="block w-full text-left disabled:opacity-60">
                              {card}
                            </button>
                          ) : <div key={`${selectedNotice.id}-${index}`}>{card}</div>;
                        })}
                      </div>
                    ) : (
                      <div className="min-h-[72px] rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">attach_file</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-on-surface">No attachments available</div>
                          <div className="text-xs text-on-surface-variant mt-0.5">No official document was uploaded with this notice.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )}
            </section>

            <aside className="space-y-md">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                <h3 className="font-title-md font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">info</span>Notice Overview
                </h3>
                {selectedNotice && (
                  <div className="mt-md space-y-4">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-[17px]">description</span>Notice ID
                      </span>
                      <span className="font-semibold">#{selectedNotice.id}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-[17px]">category</span>Category
                      </span>
                      <span className="font-semibold text-right">{selectedNotice.rawCategory}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-[17px]">label</span>Tag
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getTagColor(selectedNotice.tag)}`}>{selectedNotice.tag}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-[17px]">person</span>Published By
                      </span>
                      <span className="font-semibold text-right">{selectedNotice.author}</span>
                    </div>
                    <div className="pt-3 border-t border-outline-variant">
                      <div className="text-xs text-outline">Published On</div>
                      <div className="text-sm font-semibold mt-1">{selectedNotice.formattedDate}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                <h3 className="font-title-md font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">monitoring</span>Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-3 mt-md">
                  <div className="rounded-xl border border-outline-variant p-3 text-center">
                    <div className="text-xs text-on-surface-variant">Total Notices</div>
                    <div className="text-2xl font-bold text-primary mt-1">{notices.length}</div>
                  </div>
                  <div className="rounded-xl border border-outline-variant p-3 text-center">
                    <div className="text-xs text-on-surface-variant">This Month</div>
                    <div className="text-2xl font-bold text-secondary mt-1">{noticesThisMonth}</div>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-surface-container-low p-3 flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">Categories</span>
                  <span className="text-sm font-bold text-primary">{categoryCount}</span>
                </div>
                <div className="mt-2 rounded-xl bg-surface-container-low p-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-on-surface-variant">Saved Notices</span>
                    <div className="text-[10px] text-outline mt-0.5">Saved on this browser</div>
                  </div>
                  <span className="text-sm font-bold text-primary">{bookmarkedIds.length}</span>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-[64px] bg-surface border-t border-outline-variant">
        <div className="h-full flex items-center justify-around">
          {[
            { path: "/dashboard", icon: "dashboard", label: "Home" },
            { path: "/timetable", icon: "calendar_month", label: "Timetable" },
            { path: "/assignments", icon: "assignment", label: "Tasks" },
            { path: "/notices", icon: "campaign", label: "Notices" },
            { path: "/profile", icon: "account_circle", label: "Profile" },
          ].map((item) => (
            <Link key={item.path} to={item.path}
              className={`flex flex-col items-center ${
                item.path === "/notices" ? "text-primary font-semibold" : "text-on-surface-variant"
              }`}>
              <span className="material-symbols-outlined"
                style={item.path === "/notices" ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {item.icon}
              </span>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}