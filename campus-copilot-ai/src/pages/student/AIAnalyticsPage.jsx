import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

import {
  authService,
} from "../../services/api";

import StudentNotificationBell from "./StudentNotificationBell";
import StudentPageHero from "../../components/student/StudentPageHero";

const API_URL =
  "http://localhost:5000";

const CAMPUS_TIME_ZONE =
  "Asia/Kolkata";

const SUBJECT_COLORS = [
  "#008577",
  "#6d28d9",
  "#f59e0b",
  "#2563eb",
  "#64748b",
  "#be123c",
];

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
// BASIC HELPERS
// =====================================================

function clamp(
  value,
  minimum = 0,
  maximum = 100
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      number
    )
  );
}

function firstNumber(
  ...values
) {
  for (
    const value of values
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    const number =
      Number(value);

    if (
      Number.isFinite(
        number
      )
    ) {
      return number;
    }
  }

  return null;
}

function firstText(
  ...values
) {
  for (
    const value of values
  ) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim()
    ) {
      return String(
        value
      ).trim();
    }
  }

  return "";
}

function getInitials(
  name
) {
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
// AUTH HELPERS
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
    // Continue to localStorage.
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

// =====================================================
// JWT PAYLOAD
//
// We only use this to read the session email for UI
// resolution/fallback. The backend still verifies the JWT.
// =====================================================

function decodeJwtPayload(
  token
) {
  try {
    const parts =
      String(token || "")
        .split(".");

    if (
      parts.length < 2
    ) {
      return null;
    }

    let payload =
      parts[1]
        .replace(
          /-/g,
          "+"
        )
        .replace(
          /_/g,
          "/"
        );

    while (
      payload.length % 4
    ) {
      payload += "=";
    }

    const decoded =
      atob(payload);

    const json =
      decodeURIComponent(
        Array.from(
          decoded
        )
          .map(
            (character) =>
              `%${character
                .charCodeAt(0)
                .toString(16)
                .padStart(
                  2,
                  "0"
                )}`
          )
          .join("")
      );

    return JSON.parse(
      json
    );
  } catch {
    return null;
  }
}

function getSessionEmail(
  currentUser,
  token
) {
  const directEmail =
    firstText(
      currentUser?.email,
      currentUser?.EMAIL,
      currentUser
        ?.userEmail
    );

  if (directEmail) {
    return directEmail
      .toLowerCase();
  }

  const payload =
    decodeJwtPayload(
      token
    );

  return firstText(
    payload?.email,
    payload?.EMAIL,
    payload?.user?.email
  ).toLowerCase();
}

function extractStudentRoll(
  value
) {
  return firstText(
    value?.studentRoll,
    value?.rollNumber,
    value?.student_roll,
    value?.roll_number,
    value?.STUDENT_ROLL,
    value?.ROLL_NUMBER,
    value?.roll
  );
}

// =====================================================
// FETCH JSON
// =====================================================

async function fetchJson(
  url,
  {
    token = "",
    method = "GET",
    body,
    headers = {},
  } = {}
) {
  const requestHeaders = {
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization =
      `Bearer ${token}`;
  }

  let requestBody;

  if (
    body !== undefined
  ) {
    requestHeaders[
      "Content-Type"
    ] =
      "application/json";

    requestBody =
      JSON.stringify(
        body
      );
  }

  const response =
    await fetch(
      url,
      {
        method,
        headers:
          requestHeaders,
        body:
          requestBody,
      }
    );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let data = null;

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    try {
      data =
        await response.json();
    } catch {
      data = null;
    }
  }

  if (
    !response.ok
  ) {
    const error =
      new Error(
        data?.error ||
          data?.message ||
          `Request failed with status ${response.status}`
      );

    error.status =
      response.status;

    error.code =
      data?.code ||
      "";

    throw error;
  }

  return data;
}

// =====================================================
// RESOLVE STUDENT BY EMAIL
// =====================================================

async function resolveRollFromEmail(
  email,
  token
) {
  const cleanEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  if (!cleanEmail) {
    return "";
  }

  const data =
    await fetchJson(
      `${API_URL}/api/students/search?q=${encodeURIComponent(
        cleanEmail
      )}`,
      {
        token,
      }
    );

  const rows =
    Array.isArray(data)
      ? data
      : Array.isArray(
          data?.students
        )
      ? data.students
      : data
      ? [data]
      : [];

  const exactStudent =
    rows.find(
      (student) =>
        String(
          student.EMAIL ||
            student.email ||
            ""
        )
          .trim()
          .toLowerCase() ===
        cleanEmail
    );

  const selectedStudent =
    exactStudent ||
    (
      rows.length === 1
        ? rows[0]
        : null
    );

  return extractStudentRoll(
    selectedStudent
  );
}

// =====================================================
// DATE HELPERS
// =====================================================

function parseDate(
  value
) {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date
  ) {
    return value;
  }

  const text =
    String(value).trim();

  let match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) -
        1,
      Number(match[3])
    );
  }

  match =
    text.match(
      /^(\d{2})-(\d{2})-(\d{4})$/
    );

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) -
        1,
      Number(match[1])
    );
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function getCampusToday() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          CAMPUS_TIME_ZONE,

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  const values = {};

  formatter
    .formatToParts(
      new Date()
    )
    .forEach(
      (part) => {
        if (
          part.type !==
          "literal"
        ) {
          values[
            part.type
          ] =
            part.value;
        }
      }
    );

  return new Date(
    Number(
      values.year
    ),
    Number(
      values.month
    ) - 1,
    Number(
      values.day
    )
  );
}

function calculateDaysLeft(
  value
) {
  const date =
    parseDate(value);

  if (!date) {
    return null;
  }

  const today =
    getCampusToday();

  const todayUtc =
    Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const targetUtc =
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  return Math.round(
    (
      targetUtc -
      todayUtc
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
}

function formatShortDate(
  value
) {
  const date =
    parseDate(value);

  if (!date) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatLastUpdated(
  value
) {
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
  ).format(value);
}

// =====================================================
// READINESS
// =====================================================

function getReadinessStatus(
  score
) {
  if (
    score === null ||
    score === undefined
  ) {
    return {
      label:
        "Data unavailable",

      className:
        "text-on-surface-variant",
    };
  }

  if (
    score >= 85
  ) {
    return {
      label: "Strong",
      className:
        "text-secondary",
    };
  }

  if (
    score >= 75
  ) {
    return {
      label: "Stable",
      className:
        "text-green-700",
    };
  }

  if (
    score >= 65
  ) {
    return {
      label:
        "Needs Attention",

      className:
        "text-orange-600",
    };
  }

  return {
    label:
      "High Priority",

    className:
      "text-error",
  };
}

// =====================================================
// AI INSIGHT STYLE
// =====================================================

function getInsightStyle(
  type
) {
  const value =
    String(type || "")
      .trim()
      .toUpperCase();

  if (
    value ===
    "HIGH_IMPACT"
  ) {
    return {
      label:
        "High Impact",

      icon:
        "priority_high",

      badge:
        "bg-error-container text-error",

      iconBox:
        "bg-error-container text-error",
    };
  }

  if (
    value ===
    "WORKLOAD"
  ) {
    return {
      label:
        "Workload",

      icon:
        "assignment",

      badge:
        "bg-tertiary/10 text-tertiary",

      iconBox:
        "bg-tertiary/10 text-tertiary",
    };
  }

  if (
    value === "EXAM"
  ) {
    return {
      label:
        "Exam Priority",

      icon:
        "event",

      badge:
        "bg-primary/10 text-primary",

      iconBox:
        "bg-primary/10 text-primary",
    };
  }

  return {
    label:
      "Consistency",

    icon:
      "trending_up",

    badge:
      "bg-secondary-container text-secondary",

    iconBox:
      "bg-secondary-container text-secondary",
  };
}

// =====================================================
// SUBJECT ANALYTICS NORMALIZER
// =====================================================

function getAnalyticsSubjects(
  analytics
) {
  const candidates = [
    analytics?.subjects,
    analytics
      ?.subjectReadiness,
    analytics
      ?.subjectAnalytics,
    analytics
      ?.subjectPerformance,
    analytics
      ?.subjectMetrics,
    analytics
      ?.readinessBySubject,
  ];

  let raw = [];

  for (
    const candidate of
    candidates
  ) {
    if (
      Array.isArray(
        candidate
      )
    ) {
      raw = candidate;
      break;
    }

    if (
      candidate &&
      typeof candidate ===
        "object"
    ) {
      raw =
        Object.entries(
          candidate
        ).map(
          (
            [
              key,
              value,
            ]
          ) => {
            if (
              typeof value ===
                "number" ||
              typeof value ===
                "string"
            ) {
              return {
                subjectCode:
                  key,

                readinessScore:
                  value,
              };
            }

            return {
              ...(value ||
                {}),

              subjectCode:
                value
                  ?.subjectCode ||
                value
                  ?.SUBJECT_CODE ||
                key,
            };
          }
        );

      break;
    }
  }

  return raw.map(
    (
      subject,
      index
    ) => {
      const code =
        firstText(
          subject
            ?.subjectCode,
          subject
            ?.SUBJECT_CODE,
          subject?.code,
          subject
            ?.subject_code
        );

      const name =
        firstText(
          subject
            ?.subjectName,
          subject
            ?.SUBJECT_NAME,
          subject?.name,
          subject
            ?.subject_name,
          code
        );

      const readiness =
        firstNumber(
          subject
            ?.readinessScore,
          subject
            ?.READINESS_SCORE,
          subject
            ?.readinessIndex,
          subject
            ?.READINESS_INDEX,
          subject
            ?.readiness,
          subject?.score
        );

      const attendance =
        firstNumber(
          subject
            ?.attendancePercentage,
          subject
            ?.ATTENDANCE_PERCENTAGE,
          subject
            ?.attendancePercent,
          subject
            ?.attendance
        );

      const pending =
        firstNumber(
          subject
            ?.pendingAssignments,
          subject
            ?.PENDING_ASSIGNMENTS,
          subject
            ?.pendingCount
        );

      return {
        id:
          code ||
          name ||
          `subject-${index}`,

        code:
          code ||
          `SUB${index + 1}`,

        name:
          name ||
          code ||
          "Subject",

        readiness:
          readiness ===
          null
            ? null
            : clamp(
                readiness
              ),

        attendance:
          attendance ===
          null
            ? null
            : clamp(
                attendance
              ),

        pending:
          pending || 0,
      };
    }
  );
}

// =====================================================
// PAGE
// =====================================================

export default function AIAnalyticsPage() {
  const navigate =
    useNavigate();

  const currentUser =
    useMemo(
      () =>
        authService.getCurrentUser() ||
        {},
      []
    );

  // ===================================================
  // CORE STATE
  // ===================================================

  const [
    studentRoll,
    setStudentRoll,
  ] =
    useState("");

  const [
    analyticsResponse,
    setAnalyticsResponse,
  ] =
    useState(null);

  const [
    profile,
    setProfile,
  ] =
    useState(null);

  const [
    attendanceRows,
    setAttendanceRows,
  ] =
    useState([]);

  const [
    assignments,
    setAssignments,
  ] =
    useState([]);

  const [
    exams,
    setExams,
  ] =
    useState([]);

  const [
    timetable,
    setTimetable,
  ] =
    useState([]);

  // ===================================================
  // TREND STATE
  // ===================================================

  const [
    attendanceHistory,
    setAttendanceHistory,
  ] =
    useState([]);

  const [
    trendRange,
    setTrendRange,
  ] =
    useState("8");

  const [
    trendLoading,
    setTrendLoading,
  ] =
    useState(false);

  const [
    trendError,
    setTrendError,
  ] =
    useState("");

  // ===================================================
  // PAGE STATE
  // ===================================================

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState(
      new Date()
    );

  // ===================================================
  // PROFILE DISPLAY
  // ===================================================

  const displayName =
    profile?.NAME ||
    currentUser?.name ||
    currentUser
      ?.fullName ||
    "Student";

  const displayDepartment =
    profile
      ?.DEPARTMENT ||
    currentUser
      ?.department ||
    "Department unavailable";

  const displayRoll =
    profile
      ?.STUDENT_ROLL ||
    studentRoll ||
    "--";

  // ===================================================
  // LOAD CORE ANALYTICS
  // ===================================================

  const loadCoreData =
    useCallback(
      async (
        refreshOnly =
          false
      ) => {
        if (
          refreshOnly
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError("");

        try {
          // ---------------------------------------------
          // AUTH TOKEN
          // ---------------------------------------------

          const token =
            getAuthToken();

          if (!token) {
            throw new Error(
              "Your login session is unavailable. Please log in again."
            );
          }

          // ---------------------------------------------
          // TRY TO RESOLVE ROLL FROM CURRENT USER FIRST
          // ---------------------------------------------

          let resolvedRoll =
            extractStudentRoll(
              currentUser
            );

          const sessionEmail =
            getSessionEmail(
              currentUser,
              token
            );

          // ---------------------------------------------
          // EMAIL → STUDENT_ROLL FALLBACK
          //
          // This also lets the page work with older
          // analytics backends that expected studentRoll.
          // ---------------------------------------------

          if (
            !resolvedRoll &&
            sessionEmail
          ) {
            try {
              resolvedRoll =
                await resolveRollFromEmail(
                  sessionEmail,
                  token
                );
            } catch (
              resolveError
            ) {
              console.warn(
                "Student roll pre-resolution failed:",
                resolveError
              );
            }
          }

          // ---------------------------------------------
          // LOAD SECURE AI ANALYTICS
          //
          // Current secure backend derives student from JWT.
          //
          // studentRoll is also sent if we already resolved
          // it, allowing compatibility with an older backend.
          // ---------------------------------------------

          const analyticsData =
            await fetchJson(
              `${API_URL}/api/ai/analytics`,
              {
                token,

                method:
                  "POST",

                body:
                  resolvedRoll
                    ? {
                        studentRoll:
                          resolvedRoll,
                      }
                    : {},
              }
            );

          // ---------------------------------------------
          // BACKEND RETURNED VERIFIED STUDENT ROLL
          // ---------------------------------------------

          const backendRoll =
            extractStudentRoll(
              analyticsData
            );

          if (
            backendRoll
          ) {
            resolvedRoll =
              backendRoll;
          }

          // ---------------------------------------------
          // ONE LAST EMAIL FALLBACK
          // ---------------------------------------------

          if (
            !resolvedRoll &&
            sessionEmail
          ) {
            resolvedRoll =
              await resolveRollFromEmail(
                sessionEmail,
                token
              );
          }

          if (
            !resolvedRoll
          ) {
            throw new Error(
              "CampusCopilot could not resolve your student profile from the current login session."
            );
          }

          setStudentRoll(
            resolvedRoll
          );

          setAnalyticsResponse(
            analyticsData
          );

          // ---------------------------------------------
          // LOAD SUPPORTING REAL DATA
          // ---------------------------------------------

          const results =
            await Promise.allSettled(
              [
                fetchJson(
                  `${API_URL}/api/students/${encodeURIComponent(
                    resolvedRoll
                  )}`,
                  {
                    token,
                  }
                ),

                fetchJson(
                  `${API_URL}/api/attendance/${encodeURIComponent(
                    resolvedRoll
                  )}`,
                  {
                    token,
                  }
                ),

                fetchJson(
                  `${API_URL}/api/assignments/${encodeURIComponent(
                    resolvedRoll
                  )}`,
                  {
                    token,
                  }
                ),

                fetchJson(
                  `${API_URL}/api/exams/${encodeURIComponent(
                    resolvedRoll
                  )}`,
                  {
                    token,
                  }
                ),

                fetchJson(
                  `${API_URL}/api/timetable/${encodeURIComponent(
                    resolvedRoll
                  )}`,
                  {
                    token,
                  }
                ),
              ]
            );

          // PROFILE

          if (
            results[0]
              .status ===
            "fulfilled"
          ) {
            setProfile(
              results[0].value
            );
          }

          // ATTENDANCE

          if (
            results[1]
              .status ===
              "fulfilled" &&
            Array.isArray(
              results[1].value
            )
          ) {
            setAttendanceRows(
              results[1].value
            );
          } else if (
            !refreshOnly
          ) {
            setAttendanceRows(
              []
            );
          }

          // ASSIGNMENTS

          if (
            results[2]
              .status ===
              "fulfilled" &&
            Array.isArray(
              results[2].value
            )
          ) {
            setAssignments(
              results[2].value
            );
          } else if (
            !refreshOnly
          ) {
            setAssignments(
              []
            );
          }

          // EXAMS

          if (
            results[3]
              .status ===
              "fulfilled" &&
            Array.isArray(
              results[3].value
            )
          ) {
            setExams(
              results[3].value
            );
          } else if (
            !refreshOnly
          ) {
            setExams([]);
          }

          // TIMETABLE

          if (
            results[4]
              .status ===
              "fulfilled" &&
            Array.isArray(
              results[4].value
            )
          ) {
            setTimetable(
              results[4].value
            );
          } else if (
            !refreshOnly
          ) {
            setTimetable(
              []
            );
          }

          setLastUpdated(
            new Date()
          );

          return resolvedRoll;
        } catch (err) {
          console.error(
            "AI analytics load error:",
            err
          );

          setError(
            err.message ||
              "Unable to load AI analytics."
          );

          return "";
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        currentUser,
      ]
    );

  // ===================================================
  // INITIAL CORE LOAD
  // ===================================================

  useEffect(() => {
    loadCoreData(
      false
    );
  }, [
    loadCoreData,
  ]);

  // ===================================================
  // LOAD ATTENDANCE TREND
  //
  // IMPORTANT:
  // Changing chart range does NOT call /api/ai/analytics
  // again, avoiding unnecessary AI/rate-limit usage.
  // ===================================================

  const loadTrendData =
    useCallback(
      async (
        roll,
        showLoading = true
      ) => {
        if (!roll) {
          return;
        }

        if (
          showLoading
        ) {
          setTrendLoading(
            true
          );
        }

        setTrendError("");

        try {
          const token =
            getAuthToken();

          const weeks =
            trendRange ===
            "semester"
              ? 26
              : Number(
                  trendRange
                ) || 8;

          const data =
            await fetchJson(
              `${API_URL}/api/attendance/${encodeURIComponent(
                roll
              )}/trend-history?weeks=${weeks}`,
              {
                token,
              }
            );

          const rows =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data?.data
                )
              ? data.data
              : [];

          setAttendanceHistory(
            rows
          );
        } catch (err) {
          console.warn(
            "Attendance trend error:",
            err
          );

          setAttendanceHistory(
            []
          );

          setTrendError(
            err.message ||
              "Attendance history is unavailable."
          );
        } finally {
          setTrendLoading(
            false
          );
        }
      },
      [
        trendRange,
      ]
    );

  useEffect(() => {
    if (
      !studentRoll
    ) {
      return;
    }

    loadTrendData(
      studentRoll,
      true
    );
  }, [
    studentRoll,
    trendRange,
    loadTrendData,
  ]);

  // ===================================================
  // REFRESH ALL
  // ===================================================

  async function handleRefresh() {
    const roll =
      await loadCoreData(
        true
      );

    if (roll) {
      await loadTrendData(
        roll,
        false
      );
    }
  }

  // ===================================================
  // ANALYTICS OBJECT
  // ===================================================

  const analytics =
    analyticsResponse
      ?.analytics ||
    {};

  const insights =
    Array.isArray(
      analyticsResponse
        ?.insights
    )
      ? analyticsResponse
          .insights
      : [];

  // ===================================================
  // ATTENDANCE SUMMARY
  // ===================================================

  const attendanceSummary =
    useMemo(() => {
      let attended = 0;
      let total = 0;

      const subjects = [];

      attendanceRows.forEach(
        (
          row,
          index
        ) => {
          const attendedClasses =
            Number(
              row.ATTENDED_CLASSES ??
                row.attended_classes
            ) || 0;

          const totalClasses =
            Number(
              row.TOTAL_CLASSES ??
                row.total_classes
            ) || 0;

          attended +=
            attendedClasses;

          total +=
            totalClasses;

          const percentage =
            totalClasses > 0
              ? Number(
                  (
                    (
                      attendedClasses /
                      totalClasses
                    ) *
                    100
                  ).toFixed(
                    1
                  )
                )
              : null;

          const code =
            firstText(
              row.SUBJECT_CODE,
              row.subject_code
            );

          subjects.push(
            {
              id:
                code ||
                index,

              code,

              name:
                firstText(
                  row.SUBJECT_NAME,
                  row.subject_name,
                  code
                ),

              percentage,
            }
          );
        }
      );

      return {
        attended,
        total,

        percentage:
          total > 0
            ? Number(
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
            : null,

        subjects,
      };
    }, [
      attendanceRows,
    ]);

  // ===================================================
  // ASSIGNMENT STATS
  // ===================================================

  const assignmentStats =
    useMemo(() => {
      const pending =
        assignments.filter(
          (
            assignment
          ) =>
            String(
              assignment.STATUS ??
                assignment.status ??
                "pending"
            )
              .trim()
              .toLowerCase() ===
            "pending"
        );

      const completed =
        assignments.filter(
          (
            assignment
          ) => {
            const status =
              String(
                assignment.STATUS ??
                  assignment.status ??
                  ""
              )
                .trim()
                .toLowerCase();

            return (
              status ===
                "completed" ||
              status ===
                "submitted"
            );
          }
        );

      const deadlines =
        pending
          .map(
            (
              assignment,
              index
            ) => {
              const dueDate =
                assignment.DUE_DATE ??
                assignment.due_date ??
                assignment.dueDate ??
                null;

              return {
                id:
                  assignment.ID ??
                  assignment.id ??
                  index,

                title:
                  firstText(
                    assignment.TITLE,
                    assignment.title
                  ) ||
                  "Assignment",

                subject:
                  firstText(
                    assignment.SUBJECT_NAME,
                    assignment.subject_name,
                    assignment.SUBJECT_CODE,
                    assignment.subject_code
                  ),

                code:
                  firstText(
                    assignment.SUBJECT_CODE,
                    assignment.subject_code
                  ),

                dueDate,

                daysLeft:
                  calculateDaysLeft(
                    dueDate
                  ),
              };
            }
          )
          .filter(
            (
              assignment
            ) =>
              assignment
                .daysLeft !==
                null &&
              assignment
                .daysLeft >=
                0
          )
          .sort(
            (a, b) =>
              a.daysLeft -
              b.daysLeft
          );

      const dueSoon =
        deadlines.filter(
          (
            assignment
          ) =>
            assignment.daysLeft <=
            7
        );

      return {
        pending,
        completed,
        deadlines,
        dueSoon,

        completionRate:
          assignments.length >
          0
            ? Number(
                (
                  (
                    completed.length /
                    assignments.length
                  ) *
                  100
                ).toFixed(
                  1
                )
              )
            : null,
      };
    }, [
      assignments,
    ]);

  // ===================================================
  // NEXT EXAM
  // ===================================================

  const nextExam =
    useMemo(() => {
      const normalized =
        exams
          .map(
            (
              exam,
              index
            ) => {
              const examDate =
                exam.EXAM_DATE ??
                exam.exam_date ??
                exam.date ??
                null;

              return {
                id:
                  exam.ID ??
                  exam.id ??
                  index,

                subject:
                  firstText(
                    exam.SUBJECT_NAME,
                    exam.subject_name,
                    exam.SUBJECT_CODE,
                    exam.subject_code
                  ),

                code:
                  firstText(
                    exam.SUBJECT_CODE,
                    exam.subject_code
                  ),

                type:
                  firstText(
                    exam.EXAM_TYPE,
                    exam.exam_type
                  ) ||
                  "Exam",

                examDate,

                daysLeft:
                  calculateDaysLeft(
                    examDate
                  ),
              };
            }
          )
          .filter(
            (exam) =>
              exam.daysLeft !==
                null &&
              exam.daysLeft >=
                0
          )
          .sort(
            (a, b) =>
              a.daysLeft -
              b.daysLeft
          );

      return (
        normalized[0] ||
        null
      );
    }, [
      exams,
    ]);

  // ===================================================
  // TODAY CLASSES
  // ===================================================

  const classesToday =
    useMemo(() => {
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

      return timetable.filter(
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
    }, [
      timetable,
    ]);

  // ===================================================
  // SUBJECT ANALYTICS
  // ===================================================

  const analyticsSubjects =
    useMemo(
      () =>
        getAnalyticsSubjects(
          analytics
        ),
      [
        analytics,
      ]
    );

  // ===================================================
  // READINESS SCORE
  // ===================================================

  const backendReadinessScore =
    firstNumber(
      analytics
        ?.studyReadinessScore,

      analytics
        ?.readinessScore,

      analytics
        ?.readinessIndex,

      analytics
        ?.overallReadiness,

      analytics
        ?.overallReadinessScore,

      analytics
        ?.studyReadiness
        ?.score,

      analytics
        ?.readiness
        ?.score,

      analytics
        ?.summary
        ?.readinessScore
    );

  const subjectReadinessValues =
    analyticsSubjects
      .map(
        (subject) =>
          subject.readiness
      )
      .filter(
        (value) =>
          value !== null
      );

  const finalReadinessScore =
    backendReadinessScore !==
    null
      ? Math.round(
          clamp(
            backendReadinessScore
          )
        )
      : subjectReadinessValues
          .length >
        0
      ? Math.round(
          subjectReadinessValues.reduce(
            (
              total,
              value
            ) =>
              total +
              value,
            0
          ) /
            subjectReadinessValues
              .length
        )
      : null;

  const readinessStatus =
    getReadinessStatus(
      finalReadinessScore
    );

  // ===================================================
  // MERGE SUBJECT DATA
  // ===================================================

  const subjectMetrics =
    useMemo(() => {
      const map =
        new Map();

      attendanceSummary
        .subjects
        .forEach(
          (subject) => {
            const key =
              subject.code ||
              subject.name;

            if (!key) {
              return;
            }

            map.set(
              key,
              {
                code:
                  subject.code,

                name:
                  subject.name,

                attendance:
                  subject.percentage,

                readiness:
                  null,

                pending: 0,
              }
            );
          }
        );

      analyticsSubjects.forEach(
        (subject) => {
          const key =
            subject.code ||
            subject.name;

          const previous =
            map.get(key) ||
            {
              code:
                subject.code,

              name:
                subject.name,

              attendance:
                null,

              readiness:
                null,

              pending: 0,
            };

          map.set(
            key,
            {
              ...previous,

              code:
                subject.code ||
                previous.code,

              name:
                subject.name ||
                previous.name,

              attendance:
                subject.attendance ??
                previous.attendance,

              readiness:
                subject.readiness,

              pending:
                subject.pending ??
                previous.pending,
            }
          );
        }
      );

      return Array.from(
        map.values()
      );
    }, [
      analyticsSubjects,
      attendanceSummary,
    ]);

  // ===================================================
  // WORKLOAD PRESSURE
  // ===================================================

  const workload =
    useMemo(() => {
      const pending =
        assignmentStats
          .pending.length;

      const dueSoon =
        assignmentStats
          .dueSoon.length;

      if (
        dueSoon >= 3 ||
        pending >= 5
      ) {
        return {
          label: "High",

          helper:
            "Several near-term tasks need attention.",

          badge:
            "Needs Attention",

          className:
            "text-error",

          iconClass:
            "bg-error-container text-error",
        };
      }

      if (
        dueSoon >= 1 ||
        pending >= 2
      ) {
        return {
          label:
            "Medium",

          helper:
            "Your workload is manageable with planning.",

          badge:
            "Manageable",

          className:
            "text-orange-600",

          iconClass:
            "bg-orange-100 text-orange-600",
        };
      }

      return {
        label: "Low",

        helper:
          "No major near-term assignment pressure.",

        badge:
          "Balanced",

        className:
          "text-secondary",

        iconClass:
          "bg-secondary-container text-secondary",
      };
    }, [
      assignmentStats,
    ]);

  // ===================================================
  // TREND DATA
  // ===================================================

  const trendData =
    useMemo(() => {
      return attendanceHistory
        .map(
          (
            item,
            index
          ) => {
            const percentage =
              firstNumber(
                item.percentage,
                item.PERCENTAGE,
                item.attendancePercentage,
                item.ATTENDANCE_PERCENTAGE
              );

            return {
              label:
                firstText(
                  item.label,
                  item.LABEL,
                  item.date,
                  item.DATE
                ) ||
                `Point ${index + 1}`,

              attendance:
                percentage,
            };
          }
        )
        .filter(
          (item) =>
            item.attendance !==
            null
        );
    }, [
      attendanceHistory,
    ]);

  // ===================================================
  // SUBJECT CHART
  // ===================================================

  const subjectChartData =
    useMemo(() => {
      return subjectMetrics
        .map(
          (
            subject,
            index
          ) => {
            const value =
              subject.readiness ??
              subject.attendance;

            if (
              value === null ||
              value ===
                undefined
            ) {
              return null;
            }

            return {
              ...subject,

              value:
                clamp(value),

              source:
                subject.readiness !==
                null
                  ? "Readiness"
                  : "Attendance",

              color:
                SUBJECT_COLORS[
                  index %
                    SUBJECT_COLORS
                      .length
                ],
            };
          }
        )
        .filter(Boolean);
    }, [
      subjectMetrics,
    ]);

  const subjectAverage =
    subjectChartData.length >
    0
      ? Math.round(
          subjectChartData.reduce(
            (
              total,
              subject
            ) =>
              total +
              subject.value,
            0
          ) /
            subjectChartData
              .length
        )
      : null;

  // ===================================================
  // SAFE SUBJECT RATE
  // ===================================================

  const safeSubjectRate =
    attendanceSummary
      .subjects.length >
    0
      ? Number(
          (
            (
              attendanceSummary
                .subjects
                .filter(
                  (
                    subject
                  ) =>
                    subject.percentage !==
                      null &&
                    subject.percentage >=
                      75
                ).length /
              attendanceSummary
                .subjects
                .length
            ) *
            100
          ).toFixed(
            1
          )
        )
      : null;

  // ===================================================
  // ACADEMIC BALANCE
  // ===================================================

  const academicBalance =
    useMemo(() => {
      const rows = [];

      if (
        attendanceSummary
          .percentage !==
        null
      ) {
        rows.push({
          metric:
            "Attendance",

          value:
            attendanceSummary
              .percentage,
        });
      }

      if (
        assignmentStats
          .completionRate !==
        null
      ) {
        rows.push({
          metric:
            "Assignments",

          value:
            assignmentStats
              .completionRate,
        });
      }

      if (
        finalReadinessScore !==
        null
      ) {
        rows.push({
          metric:
            "Readiness",

          value:
            finalReadinessScore,
        });
      }

      if (
        safeSubjectRate !==
        null
      ) {
        rows.push({
          metric:
            "Safe Subjects",

          value:
            safeSubjectRate,
        });
      }

      return rows;
    }, [
      attendanceSummary,
      assignmentStats,
      finalReadinessScore,
      safeSubjectRate,
    ]);

  // ===================================================
  // GROUNDED STUDY TIP
  // ===================================================

  const studyTip =
    useMemo(() => {
      if (
        assignmentStats
          .dueSoon.length >
        0
      ) {
        return `${assignmentStats.dueSoon.length} pending assignment(s) are due within the next 7 days. Start with the nearest deadline.`;
      }

      if (
        attendanceSummary
          .percentage !==
          null &&
        attendanceSummary
          .percentage <
          75
      ) {
        return `Your current overall attendance is ${attendanceSummary.percentage}%. Prioritize upcoming classes to move above the 75% attendance threshold.`;
      }

      if (
        nextExam
      ) {
        if (
          nextExam.daysLeft ===
          0
        ) {
          return `${nextExam.subject} is scheduled today. Focus on a concise final review and exam readiness.`;
        }

        return `${nextExam.subject} is your next exam in ${nextExam.daysLeft} day(s). Use the remaining preparation time systematically.`;
      }

      return "No urgent academic issue is currently detected from the available CampusCopilot data.";
    }, [
      assignmentStats,
      attendanceSummary,
      nextExam,
    ]);

  const primaryInsight =
    insights[0] ||
    null;

  // ===================================================
  // LOGOUT
  // ===================================================

  function handleLogout() {
    authService.logout();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  }

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">

        <div className="text-center">

          <span className="material-symbols-outlined text-5xl text-primary animate-pulse">
            insights
          </span>

          <p className="mt-3 text-on-surface-variant">
            Loading CampusCopilot analytics...
          </p>

        </div>

      </div>
    );
  }

  // ===================================================
  // ERROR
  // ===================================================

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">

        <div className="max-w-md text-center">

          <span className="material-symbols-outlined text-5xl text-error">
            error
          </span>

          <h2 className="mt-3 text-xl font-bold text-error">
            Unable to Load AI Analytics
          </h2>

          <p className="mt-2 text-on-surface-variant">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadCoreData(
                false
              )
            }
            className="mt-5 h-10 px-5 rounded-lg bg-primary text-on-primary font-semibold"
          >
            Try Again
          </button>

        </div>

      </div>
    );
  }

  // ===================================================
  // PAGE
  // ===================================================

  return (
    <div className="min-h-screen bg-background text-on-background flex font-body-md">

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      <aside className="hidden lg:flex w-[280px] shrink-0 h-screen sticky top-0 bg-surface border-r border-outline-variant flex-col">

        {/* BRAND */}
        <div className="px-md pt-md pb-sm">
          <span className="font-headline-lg-mobile font-bold text-primary">CampusCopilot</span>
        </div>

        {/* PROFILE */}
        <Link
          to="/profile"
          className="px-md py-md hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center gap-sm">
            <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <div className="font-title-md font-semibold text-on-surface truncate">
                {displayName}
              </div>
              <div className="font-body-sm text-on-surface-variant leading-5 truncate">
                {displayDepartment}
              </div>
              <div className="font-label-caps text-outline mt-0.5">
                ID: {displayRoll}
              </div>
            </div>
          </div>
        </Link>

        {/* NAVIGATION */}
        <div className="px-2 flex flex-col gap-1">
          <Link to="/dashboard" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">dashboard</span>
            Home
          </Link>
          <Link to="/timetable" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">calendar_month</span>
            Timetable
          </Link>
          <Link to="/attendance" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors">
            <span className="material-symbols-outlined">analytics</span>
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
          <Link to="/ai-analytics" className="bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-semibold flex items-center gap-sm">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
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
                {attendanceSummary.percentage !== null ? `${attendanceSummary.percentage}%` : "--"}
              </span>
            </Link>
            <Link to="/assignments" className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">assignment</span>
                </div>
                <span className="font-body-sm text-on-surface">Pending Tasks</span>
              </div>
              <span className="font-body-sm font-bold text-error">{assignmentStats.pending.length}</span>
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">school</span>
                </div>
                <span className="font-body-sm text-on-surface">Classes Today</span>
              </div>
              <span className="font-body-sm font-bold text-primary">{classesToday}</span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* PROFILE / LOGOUT */}
        <div className="mx-2 px-2 py-sm border-t border-outline-variant">
          <Link to="/profile" className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm">
            <span className="material-symbols-outlined">account_circle</span>
            Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-error px-4 py-2.5 rounded-xl hover:bg-error-container/20 flex items-center gap-sm text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <div className="flex-1 min-w-0 flex flex-col">

        {/* MOBILE HEADER */}
        <header className="lg:hidden sticky top-0 z-40 bg-surface border-b border-outline-variant px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0">
              {getInitials(displayName)}
            </div>
            <span className="font-headline-lg-mobile font-bold text-primary">CampusCopilot</span>
          </div>
          <StudentNotificationBell />
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="w-full max-w-[1650px] mx-auto px-4 md:px-6 xl:px-8 py-5 pb-[90px] lg:pb-8">

          {/* =================================================
              BLUE HERO
          ================================================= */}

          <div className="mb-5">

            <StudentPageHero
              eyebrow="CAMPUSCOPILOT INTELLIGENCE"
              title="AI Performance Analytics"
              subtitle="Understand your academic performance through real attendance, assignment, examination, and CampusCopilot readiness data."
            />

          </div>

          {/* =================================================
              FOUR SUMMARY CARDS
          ================================================= */}

          <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 mb-5">

            {/* READINESS */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 min-h-[165px]">

              <h2 className="font-bold text-on-surface">
                Study Readiness Score
              </h2>

              <div className="mt-4 flex items-center gap-5">

                <div
                  className="w-[100px] h-[100px] rounded-full p-[8px] shrink-0"
                  style={{
                    background:
                      finalReadinessScore !==
                      null
                        ? `conic-gradient(#006a61 ${
                            finalReadinessScore *
                            3.6
                          }deg, #e5e7eb 0deg)`
                        : "#e5e7eb",
                  }}
                >

                  <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">

                    <div className="text-3xl font-bold text-primary">
                      {finalReadinessScore ??
                        "--"}
                    </div>

                    <div className="text-xs text-on-surface-variant">
                      / 100
                    </div>

                  </div>

                </div>

                <div>

                  <div
                    className={`text-sm font-bold ${readinessStatus.className}`}
                  >
                    {
                      readinessStatus.label
                    }
                  </div>

                  <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                    CampusCopilot advisory readiness index based on your available academic data.
                  </p>

                </div>

              </div>

            </article>

            {/* ATTENDANCE */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 min-h-[165px]">

              <h2 className="font-bold">
                Attendance Overview
              </h2>

              <div className="mt-5 flex items-center gap-4">

                <div className="w-14 h-14 rounded-full bg-secondary-container text-secondary flex items-center justify-center">

                  <span className="material-symbols-outlined text-[30px]">
                    monitoring
                  </span>

                </div>

                <div>

                  <div className="text-3xl font-bold">

                    {attendanceSummary
                      .percentage !==
                    null
                      ? `${attendanceSummary.percentage}%`
                      : "--"}

                  </div>

                  <div
                    className={`mt-2 text-xs font-semibold ${
                      attendanceSummary
                        .percentage !==
                        null &&
                      attendanceSummary
                        .percentage >=
                        75
                        ? "text-secondary"
                        : "text-error"
                    }`}
                  >

                    {attendanceSummary
                      .percentage ===
                    null
                      ? "No attendance data"
                      : attendanceSummary
                          .percentage >=
                        75
                      ? "Safe zone"
                      : "Needs attention"}

                  </div>

                  {attendanceSummary
                    .total >
                    0 && (
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {attendanceSummary.attended} of{" "}
                      {attendanceSummary.total} classes attended
                    </p>
                  )}

                </div>

              </div>

            </article>

            {/* ASSIGNMENTS */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 min-h-[165px]">

              <h2 className="font-bold">
                Pending Assignments
              </h2>

              <div className="mt-5 flex items-center gap-4">

                <div className="w-14 h-14 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center">

                  <span className="material-symbols-outlined text-[30px]">
                    assignment
                  </span>

                </div>

                <div>

                  <div className="text-3xl font-bold">
                    {
                      assignmentStats
                        .pending.length
                    }
                  </div>

                  <div
                    className={`mt-2 text-xs font-semibold ${
                      assignmentStats
                        .dueSoon.length >
                      0
                        ? "text-error"
                        : "text-secondary"
                    }`}
                  >

                    {assignmentStats
                      .dueSoon.length >
                    0
                      ? `${assignmentStats.dueSoon.length} due within 7 days`
                      : "No tasks due within 7 days"}

                  </div>

                  <p className="mt-1 text-xs text-on-surface-variant">
                    Based on your real assignment records.
                  </p>

                </div>

              </div>

            </article>

            {/* WORKLOAD */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 min-h-[165px]">

              <h2 className="font-bold">
                Workload Pressure
              </h2>

              <div className="mt-5 flex items-center gap-4">

                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${workload.iconClass}`}
                >

                  <span className="material-symbols-outlined text-[28px]">
                    pending_actions
                  </span>

                </div>

                <div>

                  <div className="text-2xl font-bold">
                    {
                      workload.label
                    }
                  </div>

                  <div
                    className={`mt-2 text-xs font-semibold ${workload.className}`}
                  >
                    {
                      workload.badge
                    }
                  </div>

                  <p className="mt-1 text-xs text-on-surface-variant">
                    {
                      workload.helper
                    }
                  </p>

                </div>

              </div>

            </article>

          </section>

          {/* =================================================
              MAIN ANALYTICS GRID
          ================================================= */}

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">

            {/* =================================================
                PERFORMANCE TREND
            ================================================= */}

            <article className="xl:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 min-h-[360px]">

              <div className="flex items-center justify-between gap-3">

                <div>

                  <h2 className="font-bold text-lg">
                    Performance Trend
                  </h2>

                  <p className="text-xs text-on-surface-variant mt-1">
                    Real attendance history recorded by CampusCopilot.
                  </p>

                </div>

                <select
                  value={
                    trendRange
                  }
                  onChange={(
                    event
                  ) =>
                    setTrendRange(
                      event.target
                        .value
                    )
                  }
                  className="h-9 px-3 rounded-lg border border-outline-variant bg-surface text-xs font-semibold outline-none"
                >

                  <option value="4">
                    Last 4 Weeks
                  </option>

                  <option value="8">
                    Last 8 Weeks
                  </option>

                  <option value="semester">
                    This Semester
                  </option>

                </select>

              </div>

              <div className="mt-5 h-[255px]">

                {trendLoading ? (
                  <div className="h-full rounded-xl bg-surface-container-low flex items-center justify-center">

                    <span className="material-symbols-outlined text-primary animate-spin">
                      progress_activity
                    </span>

                  </div>
                ) : trendData.length >
                  0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <LineChart
                      data={
                        trendData
                      }
                      margin={{
                        top: 10,
                        right: 15,
                        left: -15,
                        bottom: 5,
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={
                          false
                        }
                      />

                      <XAxis
                        dataKey="label"
                        tick={{
                          fontSize: 10,
                        }}
                      />

                      <YAxis
                        domain={[
                          0,
                          100,
                        ]}
                        tick={{
                          fontSize: 10,
                        }}
                        tickFormatter={(
                          value
                        ) =>
                          `${value}%`
                        }
                      />

                      <Tooltip
                        formatter={(
                          value
                        ) => [
                          `${value}%`,
                          "Attendance",
                        ]}
                      />

                      <ReferenceLine
                        y={75}
                        strokeDasharray="5 5"
                        label={{
                          value:
                            "75%",
                          position:
                            "insideTopRight",
                          fontSize: 10,
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="attendance"
                        stroke="#006a61"
                        strokeWidth={2}
                        dot={{
                          r: 4,
                        }}
                        activeDot={{
                          r: 6,
                        }}
                        connectNulls
                      />

                    </LineChart>

                  </ResponsiveContainer>
                ) : (
                  <div className="h-full rounded-xl bg-surface-container-low flex flex-col items-center justify-center text-center p-6">

                    <span className="material-symbols-outlined text-4xl text-outline">
                      show_chart
                    </span>

                    <div className="mt-2 font-semibold">
                      Trend tracking has started
                    </div>

                    <div className="mt-1 text-xs text-on-surface-variant max-w-[320px]">

                      {trendError ||
                        "More chart points will appear as new attendance snapshots are recorded."}

                    </div>

                  </div>
                )}

              </div>

            </article>

            {/* =================================================
                SUBJECT PERFORMANCE
            ================================================= */}

            <article className="xl:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 min-h-[360px]">

              <h2 className="font-bold text-lg">
                Subject Performance
              </h2>

              <p className="text-xs text-on-surface-variant mt-1">
                Readiness index where available; otherwise current attendance.
              </p>

              {subjectChartData.length >
              0 ? (
                <>
                  <div className="mt-3 grid grid-cols-[150px_minmax(0,1fr)] items-center">

                    <div className="h-[170px] relative">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <PieChart>

                          <Pie
                            data={
                              subjectChartData
                            }
                            dataKey="value"
                            nameKey="code"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={2}
                          >

                            {subjectChartData.map(
                              (
                                entry
                              ) => (
                                <Cell
                                  key={
                                    entry.id
                                  }
                                  fill={
                                    entry.color
                                  }
                                />
                              )
                            )}

                          </Pie>

                        </PieChart>

                      </ResponsiveContainer>

                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">

                        <span className="text-[10px] text-on-surface-variant">
                          Overall
                        </span>

                        <span className="text-2xl font-bold">
                          {subjectAverage ??
                            "--"}
                          %
                        </span>

                      </div>

                    </div>

                    <div className="space-y-3">

                      {subjectChartData
                        .slice(
                          0,
                          6
                        )
                        .map(
                          (
                            subject
                          ) => (
                            <div
                              key={
                                subject.id
                              }
                              className="flex items-center justify-between gap-2 text-xs"
                            >

                              <div className="flex items-center gap-2 min-w-0">

                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      subject.color,
                                  }}
                                />

                                <div className="min-w-0">

                                  <div className="truncate">
                                    {
                                      subject.code
                                    }
                                  </div>

                                  <div className="text-[9px] text-outline">
                                    {
                                      subject.source
                                    }
                                  </div>

                                </div>

                              </div>

                              <span className="font-bold">
                                {
                                  subject.value
                                }
                                %
                              </span>

                            </div>
                          )
                        )}

                    </div>

                  </div>

                  <Link
                    to="/attendance"
                    className="mt-4 h-10 rounded-lg border border-outline-variant flex items-center justify-center text-xs font-semibold text-primary hover:bg-primary/5"
                  >
                    View Detailed Performance
                  </Link>

                </>
              ) : (
                <div className="mt-5 h-[240px] rounded-xl bg-surface-container-low flex items-center justify-center text-center text-sm text-on-surface-variant p-6">
                  No subject analytics are currently available.
                </div>
              )}

            </article>

            {/* =================================================
                CAMPUSCOPILOT SUGGESTION
            ================================================= */}

            <aside className="xl:col-span-3 rounded-xl overflow-hidden bg-gradient-to-br from-[#4f2bd9] via-[#5b21b6] to-[#0f766e] text-white min-h-[250px] p-5 relative">

              <div className="relative z-10">

                <div className="flex items-center gap-2 text-sm font-semibold">

                  <span
                    className="material-symbols-outlined text-[19px]"
                    style={{
                      fontVariationSettings:
                        "'FILL' 1",
                    }}
                  >
                    auto_awesome
                  </span>

                  CampusCopilot Suggestion

                </div>

                <p className="mt-5 text-sm leading-6 text-white/90 max-w-[270px]">

                  {primaryInsight
                    ?.description ||
                    studyTip}

                </p>

                <Link
                  to={
                    nextExam
                      ? `/ai-chat?subject=${encodeURIComponent(
                          nextExam.subject
                        )}`
                      : "/ai-chat"
                  }
                  className="mt-5 inline-flex h-10 px-4 rounded-lg bg-white/15 border border-white/15 items-center gap-2 text-xs font-semibold hover:bg-white/20"
                >

                  View Study Plan

                  <span className="material-symbols-outlined text-[17px]">
                    arrow_forward
                  </span>

                </Link>

              </div>

              <div className="absolute right-5 bottom-4 w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">

                <span className="material-symbols-outlined text-[48px] text-white/90">
                  smart_toy
                </span>

              </div>

            </aside>

            {/* =================================================
                AI INSIGHTS
            ================================================= */}

            <article className="xl:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-4">

              <div className="flex items-center justify-between gap-3">

                <h2 className="font-bold text-lg">
                  AI Insights
                </h2>

                <span className="text-[10px] font-semibold text-secondary">
                  Grounded
                </span>

              </div>

              <div className="mt-3 space-y-2">

                {insights.length >
                0 ? (
                  insights.map(
                    (
                      insight,
                      index
                    ) => {
                      const style =
                        getInsightStyle(
                          insight.type
                        );

                      return (
                        <div
                          key={`${insight.type}-${index}`}
                          className="rounded-xl border border-outline-variant bg-surface px-3 py-3 flex items-start gap-3"
                        >

                          <div
                            className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${style.iconBox}`}
                          >

                            <span className="material-symbols-outlined text-[18px]">
                              {
                                style.icon
                              }
                            </span>

                          </div>

                          <div className="min-w-0">

                            <div className="flex items-center gap-2 flex-wrap">

                              <div className="font-semibold text-sm">
                                {
                                  insight.title
                                }
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${style.badge}`}
                              >
                                {
                                  style.label
                                }
                              </span>

                            </div>

                            <div className="text-xs text-on-surface-variant mt-1 leading-5">
                              {
                                insight.description
                              }
                            </div>

                          </div>

                        </div>
                      );
                    }
                  )
                ) : (
                  <div className="rounded-xl bg-surface-container-low p-5 text-sm text-on-surface-variant">
                    No AI recommendations are currently available.
                  </div>
                )}

              </div>

            </article>

            {/* =================================================
                ACADEMIC BALANCE
            ================================================= */}

            <article className="xl:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl p-5">

              <h2 className="font-bold text-lg">
                Academic Balance
              </h2>

              <p className="text-xs text-on-surface-variant mt-1">
                CampusCopilot indicators based on real portal data — not GPA or grades.
              </p>

              {academicBalance.length >=
              3 ? (
                <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-4 mt-3">

                  <div className="h-[250px]">

                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >

                      <RadarChart
                        data={
                          academicBalance
                        }
                      >

                        <PolarGrid />

                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{
                            fontSize: 10,
                          }}
                        />

                        <PolarRadiusAxis
                          domain={[
                            0,
                            100,
                          ]}
                          tick={
                            false
                          }
                          axisLine={
                            false
                          }
                        />

                        <Radar
                          dataKey="value"
                          stroke="#5200b5"
                          fill="#5200b5"
                          fillOpacity={
                            0.18
                          }
                        />

                      </RadarChart>

                    </ResponsiveContainer>

                  </div>

                  <div className="space-y-4 self-center">

                    {academicBalance.map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.metric
                          }
                        >

                          <div className="flex items-center justify-between gap-3 text-xs">

                            <span className="text-on-surface-variant">
                              {
                                item.metric
                              }
                            </span>

                            <span className="font-bold">
                              {Number(
                                item.value
                              ).toFixed(
                                0
                              )}
                              %
                            </span>

                          </div>

                          <div className="mt-1.5 h-1.5 rounded-full bg-surface-container-high overflow-hidden">

                            <div
                              className="h-full rounded-full bg-tertiary"
                              style={{
                                width:
                                  `${clamp(
                                    item.value
                                  )}%`,
                              }}
                            />

                          </div>

                        </div>
                      )
                    )}

                  </div>

                </div>
              ) : (
                <div className="mt-4 min-h-[220px] bg-surface-container-low rounded-xl flex items-center justify-center text-sm text-on-surface-variant text-center p-6">
                  More academic data is required before CampusCopilot can display this balance chart.
                </div>
              )}

            </article>

            {/* =================================================
                DEADLINES + STUDY TIP
            ================================================= */}

            <aside className="xl:col-span-3 space-y-4">

              {/* DEADLINES */}

              <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">

                <div className="flex items-center justify-between">

                  <h2 className="font-bold">
                    Upcoming Deadlines
                  </h2>

                  <Link
                    to="/assignments"
                    className="text-xs font-semibold text-primary"
                  >
                    View All
                  </Link>

                </div>

                <div className="mt-3 space-y-2">

                  {assignmentStats
                    .deadlines
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        assignment,
                        index
                      ) => (
                        <div
                          key={
                            assignment.id
                          }
                          className="rounded-lg bg-surface-container-low p-3 flex items-center gap-3"
                        >

                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              index ===
                              0
                                ? "bg-error-container text-error"
                                : index ===
                                  1
                                ? "bg-tertiary/10 text-tertiary"
                                : "bg-orange-100 text-orange-600"
                            }`}
                          >

                            <span className="material-symbols-outlined text-[19px]">
                              assignment
                            </span>

                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="text-xs font-bold truncate">
                              {
                                assignment.title
                              }
                            </div>

                            <div className="text-[10px] text-on-surface-variant truncate mt-0.5">
                              {
                                assignment.subject
                              }
                            </div>

                          </div>

                          <div className="text-right shrink-0">

                            <div
                              className={`text-xs font-bold ${
                                assignment.daysLeft <=
                                2
                                  ? "text-error"
                                  : "text-orange-600"
                              }`}
                            >

                              {assignment.daysLeft ===
                              0
                                ? "Today"
                                : `${assignment.daysLeft} Days`}

                            </div>

                            <div className="text-[9px] text-outline mt-0.5">
                              {formatShortDate(
                                assignment.dueDate
                              )}
                            </div>

                          </div>

                        </div>
                      )
                    )}

                  {assignmentStats
                    .deadlines
                    .length ===
                    0 && (
                    <div className="py-5 text-center text-xs text-on-surface-variant">
                      No upcoming assignment deadlines.
                    </div>
                  )}

                </div>

              </article>

              {/* STUDY TIP */}

              <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">

                <div className="flex items-center justify-between">

                  <h2 className="font-bold">
                    AI Study Tip
                  </h2>

                  <span className="text-[10px] font-semibold text-secondary">
                    Grounded
                  </span>

                </div>

                <div className="mt-3 rounded-lg bg-tertiary/5 p-3">

                  <div className="flex items-start gap-2">

                    <span className="material-symbols-outlined text-tertiary text-[20px]">
                      format_quote
                    </span>

                    <p className="text-xs leading-5 text-on-surface-variant">
                      {studyTip}
                    </p>

                  </div>

                  <div className="mt-3 text-right text-[10px] text-outline">
                    — CampusCopilot
                  </div>

                </div>

              </article>

            </aside>

          </section>

          {/* =================================================
              ACADEMIC OUTLOOK
          ================================================= */}

          {nextExam && (
            <section className="mt-4 rounded-xl bg-gradient-to-r from-primary-container via-[#4338a8] to-tertiary-container text-white px-5 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">

              <div>

                <div className="text-[10px] font-bold tracking-widest text-cyan-200 uppercase">
                  Academic Outlook
                </div>

                <h2 className="mt-2 text-xl font-bold">
                  Next Exam:{" "}
                  {nextExam.subject}
                </h2>

                <p className="text-xs text-white/80 mt-1">

                  {nextExam.type}{" "}
                  on{" "}
                  {formatShortDate(
                    nextExam.examDate
                  )}

                  {nextExam.daysLeft !==
                    null &&
                    ` • ${
                      nextExam.daysLeft ===
                      0
                        ? "Today"
                        : `${nextExam.daysLeft} day(s) remaining`
                    }.`}

                </p>

                <p className="text-xs text-white/70 mt-3">

                  Overall attendance:{" "}

                  {attendanceSummary
                    .percentage !==
                  null
                    ? `${attendanceSummary.percentage}%`
                    : "--"}

                  {" • "}

                  Pending assignments:{" "}

                  {
                    assignmentStats
                      .pending.length
                  }

                </p>

              </div>

              <Link
                to={`/ai-chat?subject=${encodeURIComponent(
                  nextExam.subject
                )}`}
                className="h-10 px-5 rounded-lg bg-white text-primary font-semibold text-xs inline-flex items-center justify-center gap-2"
              >

                <span className="material-symbols-outlined text-[18px]">
                  auto_awesome
                </span>

                Optimize Study Schedule

              </Link>

            </section>
          )}

          {/* =================================================
              COPILOT RECOMMENDATION
          ================================================= */}

          {primaryInsight && (
            <section className="mt-4 rounded-xl border border-tertiary/20 bg-tertiary/10 p-5">

              <div className="flex items-center gap-2 font-bold">

                <span className="material-symbols-outlined text-tertiary">
                  smart_toy
                </span>

                Copilot Recommendation

              </div>

              <div className="mt-4">

                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    getInsightStyle(
                      primaryInsight.type
                    ).badge
                  }`}
                >
                  {
                    getInsightStyle(
                      primaryInsight.type
                    ).label
                  }
                </span>

                <h3 className="mt-3 text-lg font-bold">
                  {
                    primaryInsight.title
                  }
                </h3>

                <p className="mt-1 text-sm leading-6 text-on-surface-variant max-w-[900px]">
                  {
                    primaryInsight.description
                  }
                </p>

                <div className="mt-4 flex flex-col sm:flex-row gap-2 max-w-[500px]">

                  <Link
                    to={`/ai-chat?q=${encodeURIComponent(
                      `Help me act on this recommendation: ${primaryInsight.title}. ${primaryInsight.description}`
                    )}`}
                    className="h-10 flex-1 rounded-lg bg-primary text-on-primary flex items-center justify-center gap-2 text-xs font-semibold"
                  >

                    <span className="material-symbols-outlined text-[18px]">
                      smart_toy
                    </span>

                    Ask Copilot

                  </Link>

                  <button
                    type="button"
                    disabled={
                      refreshing
                    }
                    onClick={
                      handleRefresh
                    }
                    className="h-10 flex-1 rounded-lg border border-primary text-primary flex items-center justify-center gap-2 text-xs font-semibold disabled:opacity-60"
                  >

                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        refreshing
                          ? "animate-spin"
                          : ""
                      }`}
                    >
                      refresh
                    </span>

                    {refreshing
                      ? "Refreshing..."
                      : "Refresh Insight"}

                  </button>

                </div>

              </div>

            </section>
          )}

          {/* =================================================
              FOOTER
          ================================================= */}

          <footer className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

            <div className="flex items-start gap-2 text-[11px] text-on-surface-variant">

              <span className="material-symbols-outlined text-primary text-[17px] shrink-0">
                info
              </span>

              <span>

                Analytics are based on available CampusCopilot academic records.

                {" "}

                Study Readiness is an advisory index, not a university grade, GPA, SGPA, or CGPA.

                {" "}

                Last updated:{" "}

                {formatLastUpdated(
                  lastUpdated
                )}

              </span>

            </div>

            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={
                handleRefresh
              }
              className="inline-flex items-center gap-2 text-xs font-semibold text-primary disabled:opacity-60 shrink-0"
            >

              <span
                className={`material-symbols-outlined text-[18px] ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              >
                refresh
              </span>

              Refresh Data

            </button>

          </footer>

        </main>

      </div>

      {/* =================================================
          MOBILE NAV
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
            to="/attendance"
            className="flex flex-col items-center text-on-surface-variant"
          >

            <span className="material-symbols-outlined">
              analytics
            </span>

            <span className="text-[10px]">
              Attendance
            </span>

          </Link>

          <Link
            to="/ai-analytics"
            className="flex flex-col items-center text-primary font-semibold"
          >

            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              insights
            </span>

            <span className="text-[10px]">
              AI Analytics
            </span>

          </Link>

          <Link
            to="/resources"
            className="flex flex-col items-center text-on-surface-variant"
          >

            <span className="material-symbols-outlined">
              folder_open
            </span>

            <span className="text-[10px]">
              Resources
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