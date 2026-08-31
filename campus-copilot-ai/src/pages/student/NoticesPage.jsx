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

import CampusCopilotBrand from "../../components/student/CampusCopilotBrand";
import StudentNotificationBell from "./StudentNotificationBell";
import StudentPageHero from "../../components/student/StudentPageHero";

const API_URL =
  "http://localhost:5000";

const CAMPUS_TIME_ZONE =
  "Asia/Kolkata";

// =====================================================
// NAVIGATION
// =====================================================

const NAV_ITEMS = [
  {
    label: "Home",
    path: "/dashboard",
    icon: "dashboard",
  },
  {
    label: "Timetable",
    path: "/timetable",
    icon: "calendar_month",
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: "analytics",
  },
  {
    label: "Assignments",
    path: "/assignments",
    icon: "assignment",
  },
  {
    label: "Exams",
    path: "/exams",
    icon: "description",
  },
  {
    label: "Notices",
    path: "/notices",
    icon: "campaign",
  },
  {
    label: "AI Analytics",
    path: "/ai-analytics",
    icon: "insights",
  },
  {
    label: "Resources",
    path: "/resources",
    icon: "folder_open",
  },
  {
    label: "Digital ID",
    path: "/student-id",
    icon: "badge",
  },
];

// =====================================================
// AUTH
// =====================================================

function getAuthToken() {
  try {
    if (
      typeof authService.getToken ===
      "function"
    ) {
      const token =
        authService.getToken();

      if (token) {
        return token;
      }
    }
  } catch {
    // Continue with localStorage.
  }

  return (
    localStorage.getItem(
      "campus_token"
    ) ||
    localStorage.getItem(
      "token"
    ) ||
    ""
  );
}

function getAuthHeaders() {
  const token =
    getAuthToken();

  if (!token) {
    return {};
  }

  return {
    Authorization:
      `Bearer ${token}`,
  };
}

// =====================================================
// PROFILE
// =====================================================

function getInitials(name) {
  const parts =
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "ST";
  }

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase()
    )
    .join("");
}

// =====================================================
// DATE
// =====================================================

function parseDate(value) {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date
  ) {
    return value;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function formatNoticeDate(
  value
) {
  const date =
    parseDate(value);

  if (!date) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      timeZone:
        CAMPUS_TIME_ZONE,

      day: "2-digit",

      month: "short",

      year: "numeric",

      hour: "2-digit",

      minute: "2-digit",
    }
  ).format(date);
}

function getCampusYearMonth() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          CAMPUS_TIME_ZONE,

        year: "numeric",

        month: "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(
      new Date()
    );

  let year = null;
  let month = null;

  parts.forEach(
    (part) => {
      if (
        part.type === "year"
      ) {
        year =
          Number(
            part.value
          );
      }

      if (
        part.type === "month"
      ) {
        month =
          Number(
            part.value
          );
      }
    }
  );

  return {
    year,
    month,
  };
}

function isNoticeInCurrentMonth(
  value
) {
  const date =
    parseDate(value);

  if (!date) {
    return false;
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          CAMPUS_TIME_ZONE,

        year: "numeric",

        month: "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  let year = null;
  let month = null;

  parts.forEach(
    (part) => {
      if (
        part.type === "year"
      ) {
        year =
          Number(
            part.value
          );
      }

      if (
        part.type === "month"
      ) {
        month =
          Number(
            part.value
          );
      }
    }
  );

  const current =
    getCampusYearMonth();

  return (
    year === current.year &&
    month === current.month
  );
}

// =====================================================
// AI SUMMARY
// =====================================================

function parseAiSummary(
  value
) {
  if (!value) {
    return [];
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .map(
        (item) =>
          String(item)
            .trim()
      )
      .filter(Boolean);
  }

  const text =
    String(value).trim();

  if (!text) {
    return [];
  }

  // Try JSON first.

  try {
    const parsed =
      JSON.parse(text);

    if (
      Array.isArray(parsed)
    ) {
      return parsed
        .map(
          (item) =>
            String(item)
              .trim()
        )
        .filter(Boolean);
    }

    if (
      Array.isArray(
        parsed?.summary
      )
    ) {
      return parsed.summary
        .map(
          (item) =>
            String(item)
              .trim()
        )
        .filter(Boolean);
    }
  } catch {
    // Continue with plain text.
  }

  const lines =
    text
      .split(
        /\r?\n|\s*•\s*/
      )
      .map(
        (item) =>
          item
            .replace(
              /^[-*]\s*/,
              ""
            )
            .trim()
      )
      .filter(Boolean);

  return lines.length >
    0
    ? lines
    : [text];
}

// =====================================================
// CATEGORY
// =====================================================

function normalizeCategory(
  category,
  tag
) {
  const categoryText =
    String(
      category || ""
    )
      .trim()
      .toLowerCase();

  const tagText =
    String(
      tag || ""
    )
      .trim()
      .toLowerCase();

  if (
    categoryText.includes(
      "exam"
    ) ||
    tagText.includes(
      "exam"
    )
  ) {
    return "exam";
  }

  if (
    categoryText.includes(
      "event"
    ) ||
    tagText === "event"
  ) {
    return "event";
  }

  if (
    categoryText.includes(
      "academic"
    ) ||
    tagText ===
      "academic"
  ) {
    return "academic";
  }

  if (
    categoryText.includes(
      "important"
    ) ||
    categoryText.includes(
      "urgent"
    ) ||
    tagText ===
      "important" ||
    tagText ===
      "urgent"
  ) {
    return "important";
  }

  return "general";
}

// =====================================================
// TAG COLORS
// =====================================================

function getTagColor(tag) {
  const value =
    String(tag || "")
      .trim()
      .toUpperCase();

  if (
    value === "URGENT" ||
    value === "IMPORTANT" ||
    value === "EXAM"
  ) {
    return (
      "bg-error-container " +
      "text-error"
    );
  }

  if (
    value === "EVENT"
  ) {
    return (
      "bg-green-100 " +
      "text-green-700"
    );
  }

  if (
    value === "ACADEMIC"
  ) {
    return (
      "bg-tertiary/10 " +
      "text-tertiary"
    );
  }

  if (
    value === "TEST"
  ) {
    return (
      "bg-purple-100 " +
      "text-purple-700"
    );
  }

  return (
    "bg-primary/10 " +
    "text-primary"
  );
}

// =====================================================
// ATTACHMENTS
// =====================================================

function normalizeAttachments(
  row
) {
  const rawAttachments =
    row.ATTACHMENTS ??
    row.attachments;

  if (
    Array.isArray(
      rawAttachments
    )
  ) {
    return rawAttachments;
  }

  const directUrl =
    row.ATTACHMENT_URL ??
    row.attachmentUrl ??
    row.attachment_url ??
    null;

  if (!directUrl) {
    return [];
  }

  return [
    {
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

      url:
        directUrl,
    },
  ];
}

function buildAssetUrl(
  value
) {
  if (!value) {
    return "";
  }

  const text =
    String(value);

  if (
    /^https?:\/\//i.test(
      text
    )
  ) {
    return text;
  }

  if (
    text.startsWith("/")
  ) {
    return `${API_URL}${text}`;
  }

  return `${API_URL}/${text}`;
}

// =====================================================
// PAGE
// =====================================================

export default function NoticesPage() {
  const navigate =
    useNavigate();

  const currentUser =
    authService.getCurrentUser();

  const studentRoll =
    String(
      currentUser
        ?.rollNumber ||
        currentUser
          ?.studentRoll ||
        currentUser
          ?.roll_number ||
        ""
    ).trim();

  // =====================================================
  // NOTICE STATE
  // =====================================================

  const [
    notices,
    setNotices,
  ] =
    useState([]);

  const [
    selectedNoticeId,
    setSelectedNoticeId,
  ] =
    useState(null);

  const [
    filter,
    setFilter,
  ] =
    useState("all");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    sortOrder,
    setSortOrder,
  ] =
    useState("latest");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  // =====================================================
  // SIDEBAR STATE
  // =====================================================

  const [
    profile,
    setProfile,
  ] =
    useState(null);

  const [
    attendancePercentage,
    setAttendancePercentage,
  ] =
    useState(null);

  const [
    pendingTasks,
    setPendingTasks,
  ] =
    useState(null);

  const [
    classesToday,
    setClassesToday,
  ] =
    useState(null);

  // =====================================================
  // BOOKMARKS
  // =====================================================

  const [
    bookmarkedIds,
    setBookmarkedIds,
  ] =
    useState(() => {
      try {
        const stored =
          localStorage.getItem(
            "campuscopilot_notice_bookmarks"
          );

        if (!stored) {
          return [];
        }

        const parsed =
          JSON.parse(stored);

        return Array.isArray(
          parsed
        )
          ? parsed
          : [];
      } catch {
        return [];
      }
    });

  // =====================================================
  // PROFILE DISPLAY
  // =====================================================

  const displayName =
    profile?.NAME ||
    currentUser?.name ||
    currentUser
      ?.fullName ||
    "Student";

  const displayDepartment =
    profile?.DEPARTMENT ||
    currentUser
      ?.department ||
    "Department unavailable";

  const displayRoll =
    profile
      ?.STUDENT_ROLL ||
    studentRoll;

  // =====================================================
  // REQUEST
  // =====================================================

  async function requestJson(
    url
  ) {
    const response =
      await fetch(
        url,
        {
          headers:
            getAuthHeaders(),
        }
      );

    if (!response.ok) {
      let message =
        `Request failed with status ${response.status}`;

      try {
        const body =
          await response.json();

        if (
          body?.error
        ) {
          message =
            body.error;
        }
      } catch {
        // Keep fallback.
      }

      throw new Error(
        message
      );
    }

    return response.json();
  }

  // =====================================================
  // LOAD PAGE
  // =====================================================

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(
          true
        );

        setError(
          ""
        );

        // =================================================
        // LOAD REAL NOTICES
        // =================================================

        const response =
          await fetch(
            `${API_URL}/api/notices`,
            {
              headers:
                getAuthHeaders(),
            }
          );

        if (
          !response.ok
        ) {
          let message =
            "Unable to load campus notices.";

          try {
            const body =
              await response.json();

            if (
              body?.error
            ) {
              message =
                body.error;
            }
          } catch {
            // Keep message.
          }

          throw new Error(
            message
          );
        }

        const data =
          await response.json();

        const rows =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data?.notices
              )
            ? data.notices
            : [];

        // =================================================
        // NORMALIZE NOTICES
        // =================================================

        const formatted =
          rows.map(
            (
              row,
              index
            ) => {
              const id =
                row.ID ??
                row.id ??
                index + 1;

              const tag =
                String(
                  row.TAG ??
                    row.tag ??
                    "GENERAL"
                )
                  .trim()
                  .toUpperCase();

              const category =
                row.CATEGORY ??
                row.category ??
                "General";

              const createdAt =
                row.CREATED_AT ??
                row.createdAt ??
                row.created_at ??
                null;

              return {
                id,

                title:
                  row.TITLE ??
                  row.title ??
                  "Campus Notice",

                author:
                  row.AUTHOR ??
                  row.author ??
                  "University Administration",

                tag,

                rawCategory:
                  String(
                    category ||
                      "General"
                  ),

                category:
                  normalizeCategory(
                    category,
                    tag
                  ),

                content:
                  row.CONTENT ??
                  row.content ??
                  "",

                summary:
                  parseAiSummary(
                    row.AI_SUMMARY ??
                      row.aiSummary ??
                      row.ai_summary
                  ),

                createdAt,

                formattedDate:
                  formatNoticeDate(
                    createdAt
                  ),

                attachments:
                  normalizeAttachments(
                    row
                  ),
              };
            }
          );

        setNotices(
          formatted
        );

        setSelectedNoticeId(
          formatted[0]?.id ??
            null
        );

        // =================================================
        // STUDENT SIDEBAR DATA
        // =================================================

        if (!studentRoll) {
          return;
        }

        const results =
          await Promise.allSettled(
            [
              requestJson(
                `${API_URL}/api/students/${encodeURIComponent(
                  studentRoll
                )}`
              ),

              requestJson(
                `${API_URL}/api/attendance/${encodeURIComponent(
                  studentRoll
                )}`
              ),

              requestJson(
                `${API_URL}/api/assignments/${encodeURIComponent(
                  studentRoll
                )}`
              ),

              requestJson(
                `${API_URL}/api/timetable/${encodeURIComponent(
                  studentRoll
                )}`
              ),
            ]
          );

        // =================================================
        // PROFILE
        // =================================================

        if (
          results[0].status ===
          "fulfilled"
        ) {
          setProfile(
            results[0].value
          );
        }

        // =================================================
        // ATTENDANCE
        // =================================================

        if (
          results[1].status ===
            "fulfilled" &&
          Array.isArray(
            results[1].value
          )
        ) {
          let attended = 0;
          let total = 0;

          results[1].value.forEach(
            (row) => {
              attended +=
                Number(
                  row.ATTENDED_CLASSES ??
                    row.attended_classes
                ) || 0;

              total +=
                Number(
                  row.TOTAL_CLASSES ??
                    row.total_classes
                ) || 0;
            }
          );

          if (
            total > 0
          ) {
            setAttendancePercentage(
              Number(
                (
                  (
                    attended /
                    total
                  ) *
                  100
                ).toFixed(
                  1
                )
              )
            );
          }
        }

        // =================================================
        // PENDING TASKS
        // =================================================

        if (
          results[2].status ===
            "fulfilled" &&
          Array.isArray(
            results[2].value
          )
        ) {
          const count =
            results[2].value.filter(
              (
                assignment
              ) =>
                String(
                  assignment.STATUS ??
                    assignment.status ??
                    ""
                )
                  .trim()
                  .toLowerCase() ===
                "pending"
            ).length;

          setPendingTasks(
            count
          );
        }

        // =================================================
        // CLASSES TODAY
        // =================================================

        if (
          results[3].status ===
            "fulfilled" &&
          Array.isArray(
            results[3].value
          )
        ) {
          const weekday =
            new Intl.DateTimeFormat(
              "en-US",
              {
                timeZone:
                  CAMPUS_TIME_ZONE,

                weekday:
                  "long",
              }
            )
              .format(
                new Date()
              )
              .toLowerCase();

          const count =
            results[3].value.filter(
              (row) =>
                String(
                  row.DAY_OF_WEEK ??
                    row.day_of_week ??
                    ""
                )
                  .trim()
                  .toLowerCase() ===
                weekday
            ).length;

          setClassesToday(
            count
          );
        }
      } catch (err) {
        console.error(
          "Notice page load error:",
          err
        );

        setError(
          err.message ||
            "Unable to load campus notices."
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    loadPage();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    studentRoll,
  ]);

  // =====================================================
  // FILTER / SEARCH / SORT
  // =====================================================

  const filteredNotices =
    useMemo(() => {
      const cleanSearch =
        search
          .trim()
          .toLowerCase();

      const result =
        notices.filter(
          (notice) => {
            let matchesFilter =
              true;

            if (
              filter !==
              "all"
            ) {
              if (
                filter ===
                "important"
              ) {
                matchesFilter =
                  [
                    "URGENT",
                    "IMPORTANT",
                  ].includes(
                    notice.tag
                  ) ||
                  notice.category ===
                    "important";
              } else {
                matchesFilter =
                  notice.category ===
                  filter;
              }
            }

            if (
              !matchesFilter
            ) {
              return false;
            }

            if (
              !cleanSearch
            ) {
              return true;
            }

            return [
              notice.title,
              notice.author,
              notice.tag,
              notice.rawCategory,
              notice.content,
            ].some(
              (value) =>
                String(
                  value || ""
                )
                  .toLowerCase()
                  .includes(
                    cleanSearch
                  )
            );
          }
        );

      return [
        ...result,
      ].sort(
        (
          first,
          second
        ) => {
          const firstDate =
            parseDate(
              first.createdAt
            );

          const secondDate =
            parseDate(
              second.createdAt
            );

          const firstTime =
            firstDate
              ?.getTime() ||
            0;

          const secondTime =
            secondDate
              ?.getTime() ||
            0;

          return sortOrder ===
            "latest"
            ? secondTime -
                firstTime
            : firstTime -
                secondTime;
        }
      );
    }, [
      notices,
      filter,
      search,
      sortOrder,
    ]);

  // =====================================================
  // KEEP SELECTION VALID
  // =====================================================

  useEffect(() => {
    if (
      filteredNotices.length ===
      0
    ) {
      if (
        selectedNoticeId !==
        null
      ) {
        setSelectedNoticeId(
          null
        );
      }

      return;
    }

    const exists =
      filteredNotices.some(
        (notice) =>
          String(
            notice.id
          ) ===
          String(
            selectedNoticeId
          )
      );

    if (!exists) {
      setSelectedNoticeId(
        filteredNotices[0]
          .id
      );
    }
  }, [
    filteredNotices,
    selectedNoticeId,
  ]);

  // =====================================================
  // SELECTED NOTICE
  // =====================================================

  const selectedNotice =
    useMemo(() => {
      return (
        filteredNotices.find(
          (notice) =>
            String(
              notice.id
            ) ===
            String(
              selectedNoticeId
            )
        ) ||
        filteredNotices[0] ||
        null
      );
    }, [
      filteredNotices,
      selectedNoticeId,
    ]);

  // =====================================================
  // STATS
  // =====================================================

  const noticesThisMonth =
    useMemo(
      () =>
        notices.filter(
          (notice) =>
            isNoticeInCurrentMonth(
              notice.createdAt
            )
        ).length,
      [
        notices,
      ]
    );

  const categoryCount =
    useMemo(() => {
      return new Set(
        notices
          .map(
            (notice) =>
              notice.category
          )
          .filter(Boolean)
      ).size;
    }, [
      notices,
    ]);

  // =====================================================
  // BOOKMARK
  // =====================================================

  function isBookmarked(
    noticeId
  ) {
    return bookmarkedIds.some(
      (id) =>
        String(id) ===
        String(
          noticeId
        )
    );
  }

  function toggleBookmark(
    noticeId
  ) {
    setBookmarkedIds(
      (previous) => {
        const exists =
          previous.some(
            (id) =>
              String(id) ===
              String(
                noticeId
              )
          );

        const next =
          exists
            ? previous.filter(
                (id) =>
                  String(id) !==
                  String(
                    noticeId
                  )
              )
            : [
                ...previous,
                noticeId,
              ];

        localStorage.setItem(
          "campuscopilot_notice_bookmarks",
          JSON.stringify(
            next
          )
        );

        return next;
      }
    );
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
            campaign
          </span>

          <p className="mt-3 text-on-surface-variant">
            Loading campus notices...
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

        <div className="max-w-md text-center">

          <span className="material-symbols-outlined text-5xl text-error">
            error
          </span>

          <h2 className="mt-3 text-xl font-bold text-error">
            Unable to Load Notices
          </h2>

          <p className="mt-2 text-on-surface-variant">
            {error}
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="min-h-screen bg-background text-on-background flex font-body-md">

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      <aside className="hidden lg:flex w-[280px] shrink-0 h-screen sticky top-0 bg-surface border-r border-outline-variant flex-col">

        {/* BRAND */}

        <div className="px-md pt-md pb-sm">
          <CampusCopilotBrand />
        </div>

        {/* PROFILE */}

        <Link
          to="/profile"
          className="px-md py-md hover:bg-surface-container-low transition-colors"
        >

          <div className="flex items-center gap-sm">

            <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0">

              {getInitials(
                displayName
              )}

            </div>

            <div className="min-w-0">

              <div className="font-title-md font-semibold text-on-surface">
                {displayName}
              </div>

              <div className="font-body-sm text-on-surface-variant leading-5">
                {displayDepartment}
              </div>

              <div className="font-label-caps text-outline mt-0.5">
                ID:{" "}
                {displayRoll ||
                  "--"}
              </div>

            </div>

          </div>

        </Link>

        {/* NAVIGATION */}

        <nav className="px-2 flex flex-col gap-1">

          {NAV_ITEMS.map(
            (item) => {
              const active =
                item.path ===
                "/notices";

              return (
                <Link
                  key={
                    item.path
                  }
                  to={
                    item.path
                  }
                  className={
                    active
                      ? "bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-semibold flex items-center gap-sm"
                      : "text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
                  }
                >

                  <span
                    className="material-symbols-outlined"
                    style={
                      active
                        ? {
                            fontVariationSettings:
                              "'FILL' 1",
                          }
                        : undefined
                    }
                  >
                    {item.icon}
                  </span>

                  {item.label}

                </Link>
              );
            }
          )}

        </nav>

        {/* =================================================
            TODAY SUMMARY
        ================================================= */}

        <div className="mx-4 mt-md rounded-xl border border-outline-variant bg-surface-container-lowest p-sm">

          <div className="font-label-caps text-outline mb-sm">
            TODAY SUMMARY
          </div>

          <div className="space-y-3">

            {/* ATTENDANCE */}

            <Link
              to="/attendance"
              className="flex items-center justify-between gap-2"
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

            {/* TASKS */}

            <Link
              to="/assignments"
              className="flex items-center justify-between gap-2"
            >

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-error-container text-error flex items-center justify-center">

                  <span className="material-symbols-outlined text-[16px]">
                    assignment
                  </span>

                </div>

                <span className="font-body-sm text-on-surface">
                  Pending Tasks
                </span>

              </div>

              <span className="font-body-sm font-bold text-error">

                {pendingTasks !==
                null
                  ? pendingTasks
                  : "--"}

              </span>

            </Link>

            {/* CLASSES */}

            <Link
              to="/timetable"
              className="flex items-center justify-between gap-2"
            >

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                  <span className="material-symbols-outlined text-[16px]">
                    school
                  </span>

                </div>

                <span className="font-body-sm text-on-surface">
                  Classes Today
                </span>

              </div>

              <span className="font-body-sm font-bold text-primary">

                {classesToday !==
                null
                  ? classesToday
                  : "--"}

              </span>

            </Link>

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
            onClick={
              handleLogout
            }
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
          MAIN
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
                displayName
              )}

            </Link>

            <span className="font-headline-lg-mobile font-bold text-primary">
              CampusCopilot
            </span>

          </div>

          <StudentNotificationBell />

        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="w-full px-margin-mobile md:px-lg py-md pb-[90px] lg:pb-lg">

          {/* HERO */}

          <div className="mb-md">

            <StudentPageHero
              eyebrow="CAMPUS NOTICES"
              title="Campus Notices"
              subtitle="Official circulars, events, and AI summaries."
            />

          </div>

          {/* =================================================
              TOOLBAR
          ================================================= */}

          <section className="mb-md">

            <div className="flex flex-col xl:flex-row xl:items-center gap-3">

              {/* SEARCH */}

              <div className="relative w-full xl:w-[320px]">

                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                  search
                </span>

                <input
                  type="text"
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search notices..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm outline-none focus:border-primary"
                />

              </div>

              {/* FILTERS */}

              <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">

                {[
                  {
                    key: "all",
                    label: "All",
                    icon:
                      "grid_view",
                  },
                  {
                    key: "exam",
                    label: "Exam",
                    icon:
                      "calendar_month",
                  },
                  {
                    key: "event",
                    label: "Event",
                    icon:
                      "celebration",
                  },
                  {
                    key:
                      "academic",
                    label:
                      "Academic",
                    icon:
                      "menu_book",
                  },
                  {
                    key:
                      "important",
                    label:
                      "Important",
                    icon:
                      "error",
                  },
                ].map(
                  (item) => (
                    <button
                      key={
                        item.key
                      }
                      type="button"
                      onClick={() =>
                        setFilter(
                          item.key
                        )
                      }
                      className={`h-10 px-4 rounded-xl border flex items-center gap-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                        filter ===
                        item.key
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-surface-container-lowest text-on-surface border-outline-variant hover:bg-surface-container-low"
                      }`}
                    >

                      <span className="material-symbols-outlined text-[18px]">
                        {
                          item.icon
                        }
                      </span>

                      {
                        item.label
                      }

                    </button>
                  )
                )}

              </div>

              {/* SORT */}

              <select
                value={
                  sortOrder
                }
                onChange={(
                  event
                ) =>
                  setSortOrder(
                    event.target
                      .value
                  )
                }
                className="xl:ml-auto h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm font-semibold outline-none"
              >

                <option value="latest">
                  Latest First
                </option>

                <option value="oldest">
                  Oldest First
                </option>

              </select>

            </div>

          </section>

          {/* =================================================
              MAIN GRID
          ================================================= */}

          <div className="grid grid-cols-1 xl:grid-cols-[330px_minmax(0,1fr)_260px] gap-md items-start">

            {/* =================================================
                LEFT LIST
            ================================================= */}

            <aside className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">

              <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">

                <span className="font-title-md font-bold text-sm">
                  All Announcements
                </span>

                <span className="text-xs text-outline">
                  {
                    filteredNotices.length
                  }
                </span>

              </div>

              <div className="divide-y divide-outline-variant max-h-[720px] overflow-y-auto">

                {filteredNotices.length ===
                  0 && (
                  <div className="p-8 text-center">

                    <span className="material-symbols-outlined text-4xl text-outline">
                      search_off
                    </span>

                    <p className="text-sm text-on-surface-variant mt-2">
                      No notices match your search.
                    </p>

                  </div>
                )}

                {filteredNotices.map(
                  (
                    notice
                  ) => {
                    const selected =
                      String(
                        selectedNotice
                          ?.id
                      ) ===
                      String(
                        notice.id
                      );

                    return (
                      <button
                        key={
                          notice.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedNoticeId(
                            notice.id
                          )
                        }
                        className={`w-full text-left p-4 border-l-[3px] transition-colors ${
                          selected
                            ? "bg-primary/5 border-primary"
                            : "border-transparent hover:bg-surface-container-low"
                        }`}
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <span
                              className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold ${getTagColor(
                                notice.tag
                              )}`}
                            >
                              {
                                notice.tag
                              }
                            </span>

                            <h3 className="mt-2 text-sm font-bold text-on-surface leading-5">
                              {
                                notice.title
                              }
                            </h3>

                            <div className="mt-2 text-[11px] text-on-surface-variant">

                              <div>
                                {
                                  notice.author
                                }
                              </div>

                              <div className="mt-0.5 text-outline">
                                {
                                  notice.formattedDate
                                }
                              </div>

                            </div>

                          </div>

                          {isBookmarked(
                            notice.id
                          ) && (
                            <span
                              className="material-symbols-outlined text-[18px] text-primary shrink-0"
                              style={{
                                fontVariationSettings:
                                  "'FILL' 1",
                              }}
                            >
                              bookmark
                            </span>
                          )}

                        </div>

                      </button>
                    );
                  }
                )}

              </div>

            </aside>

            {/* =================================================
                NOTICE DETAIL
            ================================================= */}

            <section className="min-w-0">

              {!selectedNotice ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">

                  <span className="material-symbols-outlined text-5xl text-outline">
                    campaign
                  </span>

                  <h2 className="font-bold text-lg mt-2">
                    No Notice Selected
                  </h2>

                  <p className="text-sm text-on-surface-variant mt-1">
                    Select an announcement to view its details.
                  </p>

                </div>
              ) : (
                <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md md:p-lg">

                  {/* ===========================================
                      NOTICE HEADER
                  =========================================== */}

                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${getTagColor(
                            selectedNotice.tag
                          )}`}
                        >
                          {
                            selectedNotice.tag
                          }
                        </span>

                        <span className="text-xs text-outline">
                          Circular #
                          {
                            selectedNotice.id
                          }
                        </span>

                      </div>

                      <h2 className="mt-3 text-xl md:text-2xl font-bold text-primary leading-tight">

                        {
                          selectedNotice.title
                        }

                      </h2>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-on-surface-variant">

                        <span className="flex items-center gap-1.5">

                          <span className="material-symbols-outlined text-[18px] text-primary">
                            account_balance
                          </span>

                          {
                            selectedNotice.author
                          }

                        </span>

                        <span className="hidden sm:inline">
                          •
                        </span>

                        <span className="flex items-center gap-1.5">

                          <span className="material-symbols-outlined text-[18px] text-secondary">
                            calendar_today
                          </span>

                          {
                            selectedNotice.formattedDate
                          }

                        </span>

                      </div>

                    </div>

                    {/* BOOKMARK */}

                    <button
                      type="button"
                      onClick={() =>
                        toggleBookmark(
                          selectedNotice.id
                        )
                      }
                      className={`h-10 px-4 rounded-lg border flex items-center gap-2 text-sm font-semibold shrink-0 transition-colors ${
                        isBookmarked(
                          selectedNotice.id
                        )
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-surface text-on-surface border-outline-variant hover:bg-surface-container-low"
                      }`}
                    >

                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={
                          isBookmarked(
                            selectedNotice.id
                          )
                            ? {
                                fontVariationSettings:
                                  "'FILL' 1",
                              }
                            : undefined
                        }
                      >
                        bookmark
                      </span>

                      {isBookmarked(
                        selectedNotice.id
                      )
                        ? "Bookmarked"
                        : "Bookmark"}

                    </button>

                  </div>

                  {/* ===========================================
                      AI SUMMARY
                  =========================================== */}

                  <div className="mt-md rounded-xl border border-primary/15 bg-primary/5 p-md">

                    <div className="flex items-center gap-2 text-tertiary font-bold text-sm">

                      <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">

                        <span className="material-symbols-outlined text-[19px]">
                          auto_awesome
                        </span>

                      </div>

                      CampusCopilot AI Key Highlights (TL;DR)

                    </div>

                    {selectedNotice
                      .summary
                      .length >
                    0 ? (
                      <ul className="mt-3 space-y-2.5">

                        {selectedNotice.summary.map(
                          (
                            point,
                            index
                          ) => (
                            <li
                              key={`${selectedNotice.id}-${index}`}
                              className="flex items-start gap-2 text-sm text-on-surface"
                            >

                              <span className="material-symbols-outlined text-secondary text-[18px] mt-[1px] shrink-0">
                                check_circle
                              </span>

                              <span>
                                {
                                  point
                                }
                              </span>

                            </li>
                          )
                        )}

                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-on-surface-variant">
                        No AI summary was added to this notice.
                      </p>
                    )}

                  </div>

                  {/* ===========================================
                      CONTENT
                  =========================================== */}

                  <div className="mt-md pt-md border-t border-outline-variant">

                    <div className="text-sm md:text-[15px] leading-7 text-on-surface whitespace-pre-wrap">

                      {selectedNotice.content ||
                        "No notice content was provided."}

                    </div>

                  </div>

                  {/* ===========================================
                      OFFICIAL ATTACHMENTS
                      REDESIGNED / ALIGNED
                  =========================================== */}

                  <div className="mt-6 pt-5 border-t border-outline-variant">

                    {/* SECTION HEADER */}

                    <div className="flex items-center gap-3 mb-3">

                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">

                        <span className="material-symbols-outlined text-[20px]">
                          attach_file
                        </span>

                      </div>

                      <div>

                        <h3 className="font-title-md font-bold text-on-surface leading-tight">
                          Official Attachments
                        </h3>

                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Files and documents published with this notice
                        </p>

                      </div>

                    </div>

                    {/* REAL ATTACHMENTS */}

                    {selectedNotice
                      .attachments
                      .length >
                    0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                        {selectedNotice.attachments.map(
                          (
                            attachment,
                            index
                          ) => {
                            const name =
                              attachment.name ??
                              attachment.FILE_NAME ??
                              "Attachment";

                            const type =
                              attachment.type ??
                              attachment.FILE_TYPE ??
                              "Document";

                            const url =
                              attachment.url ??
                              attachment.FILE_URL ??
                              null;

                            const attachmentCard =
                              (
                                <div className="min-h-[72px] px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-colors flex items-center justify-between gap-4">

                                  <div className="flex items-center gap-3 min-w-0">

                                    {/* FILE ICON */}

                                    <div className="w-10 h-10 rounded-lg bg-error-container text-error flex items-center justify-center shrink-0">

                                      <span className="material-symbols-outlined text-[21px]">
                                        description
                                      </span>

                                    </div>

                                    {/* FILE INFO */}

                                    <div className="min-w-0">

                                      <div className="text-sm font-semibold text-on-surface truncate">
                                        {
                                          name
                                        }
                                      </div>

                                      <div className="text-xs text-on-surface-variant mt-0.5">
                                        {
                                          type
                                        }
                                      </div>

                                    </div>

                                  </div>

                                  {url && (
                                    <span className="material-symbols-outlined text-primary shrink-0">
                                      download
                                    </span>
                                  )}

                                </div>
                              );

                            if (url) {
                              return (
                                <a
                                  key={`${selectedNotice.id}-${index}`}
                                  href={buildAssetUrl(
                                    url
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block"
                                >
                                  {
                                    attachmentCard
                                  }
                                </a>
                              );
                            }

                            return (
                              <div
                                key={`${selectedNotice.id}-${index}`}
                              >
                                {
                                  attachmentCard
                                }
                              </div>
                            );
                          }
                        )}

                      </div>
                    ) : (
                      /* EMPTY STATE */

                      <div className="min-h-[72px] rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-3 flex items-center gap-3">

                        <div className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0">

                          <span className="material-symbols-outlined text-[20px]">
                            attach_file
                          </span>

                        </div>

                        <div>

                          <div className="text-sm font-medium text-on-surface">
                            No attachments available
                          </div>

                          <div className="text-xs text-on-surface-variant mt-0.5">
                            No official document was uploaded with this notice.
                          </div>

                        </div>

                      </div>
                    )}

                  </div>

                </article>
              )}

            </section>

            {/* =================================================
                RIGHT SIDEBAR
            ================================================= */}

            <aside className="space-y-md">

              {/* NOTICE OVERVIEW */}

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">

                <h3 className="font-title-md font-bold flex items-center gap-2">

                  <span className="material-symbols-outlined text-primary text-[20px]">
                    info
                  </span>

                  Notice Overview

                </h3>

                {selectedNotice && (
                  <div className="mt-md space-y-4">

                    {/* ID */}

                    <div className="flex justify-between gap-3 text-sm">

                      <span className="text-on-surface-variant flex items-center gap-2">

                        <span className="material-symbols-outlined text-[17px]">
                          description
                        </span>

                        Notice ID

                      </span>

                      <span className="font-semibold">
                        #
                        {
                          selectedNotice.id
                        }
                      </span>

                    </div>

                    {/* CATEGORY */}

                    <div className="flex justify-between gap-3 text-sm">

                      <span className="text-on-surface-variant flex items-center gap-2">

                        <span className="material-symbols-outlined text-[17px]">
                          category
                        </span>

                        Category

                      </span>

                      <span className="font-semibold text-right">
                        {
                          selectedNotice.rawCategory
                        }
                      </span>

                    </div>

                    {/* TAG */}

                    <div className="flex justify-between gap-3 text-sm">

                      <span className="text-on-surface-variant flex items-center gap-2">

                        <span className="material-symbols-outlined text-[17px]">
                          label
                        </span>

                        Tag

                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getTagColor(
                          selectedNotice.tag
                        )}`}
                      >
                        {
                          selectedNotice.tag
                        }
                      </span>

                    </div>

                    {/* AUTHOR */}

                    <div className="flex justify-between gap-3 text-sm">

                      <span className="text-on-surface-variant flex items-center gap-2">

                        <span className="material-symbols-outlined text-[17px]">
                          person
                        </span>

                        Published By

                      </span>

                      <span className="font-semibold text-right">
                        {
                          selectedNotice.author
                        }
                      </span>

                    </div>

                    {/* DATE */}

                    <div className="pt-3 border-t border-outline-variant">

                      <div className="text-xs text-outline">
                        Published On
                      </div>

                      <div className="text-sm font-semibold mt-1">
                        {
                          selectedNotice.formattedDate
                        }
                      </div>

                    </div>

                  </div>
                )}

              </div>

              {/* QUICK STATS */}

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">

                <h3 className="font-title-md font-bold flex items-center gap-2">

                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    monitoring
                  </span>

                  Quick Stats

                </h3>

                <div className="grid grid-cols-2 gap-3 mt-md">

                  {/* TOTAL */}

                  <div className="rounded-xl border border-outline-variant p-3 text-center">

                    <div className="text-xs text-on-surface-variant">
                      Total Notices
                    </div>

                    <div className="text-2xl font-bold text-primary mt-1">
                      {
                        notices.length
                      }
                    </div>

                  </div>

                  {/* MONTH */}

                  <div className="rounded-xl border border-outline-variant p-3 text-center">

                    <div className="text-xs text-on-surface-variant">
                      This Month
                    </div>

                    <div className="text-2xl font-bold text-secondary mt-1">
                      {
                        noticesThisMonth
                      }
                    </div>

                  </div>

                </div>

                {/* CATEGORY COUNT */}

                <div className="mt-3 rounded-xl bg-surface-container-low p-3 flex items-center justify-between">

                  <span className="text-sm text-on-surface-variant">
                    Categories
                  </span>

                  <span className="text-sm font-bold text-primary">
                    {
                      categoryCount
                    }
                  </span>

                </div>

                {/* LOCAL BOOKMARKS */}

                <div className="mt-2 rounded-xl bg-surface-container-low p-3 flex items-center justify-between">

                  <div>

                    <span className="text-sm text-on-surface-variant">
                      Saved Notices
                    </span>

                    <div className="text-[10px] text-outline mt-0.5">
                      Saved on this browser
                    </div>

                  </div>

                  <span className="text-sm font-bold text-primary">
                    {
                      bookmarkedIds.length
                    }
                  </span>

                </div>

              </div>

            </aside>

          </div>

        </main>

      </div>

      {/* =================================================
          MOBILE BOTTOM NAV
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
            to="/assignments"
            className="flex flex-col items-center text-on-surface-variant"
          >

            <span className="material-symbols-outlined">
              assignment
            </span>

            <span className="text-[10px]">
              Tasks
            </span>

          </Link>

          <Link
            to="/notices"
            className="flex flex-col items-center text-primary font-semibold"
          >

            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              campaign
            </span>

            <span className="text-[10px]">
              Notices
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
