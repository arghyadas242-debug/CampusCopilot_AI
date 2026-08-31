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
import StudentPageHero from "../../components/student/StudentPageHero";
import StudentNotificationBell from "./StudentNotificationBell";

const API_ORIGIN =
  "http://localhost:5000";

const API_BASE_URL =
  `${API_ORIGIN}/api`;

// =====================================================
// HELPERS
// =====================================================

function getInitials(name) {
  const parts = String(
    name || ""
  )
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

function startOfDay(date) {
  const copy =
    new Date(date);

  copy.setHours(
    0,
    0,
    0,
    0
  );

  return copy;
}

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

  const text =
    String(value).trim();

  // DD-MM-YYYY

  const ddmmyyyy =
    text.match(
      /^(\d{2})-(\d{2})-(\d{4})$/
    );

  if (ddmmyyyy) {
    return new Date(
      Number(
        ddmmyyyy[3]
      ),
      Number(
        ddmmyyyy[2]
      ) - 1,
      Number(
        ddmmyyyy[1]
      )
    );
  }

  // YYYY-MM-DD

  const yyyymmdd =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (yyyymmdd) {
    return new Date(
      Number(
        yyyymmdd[1]
      ),
      Number(
        yyyymmdd[2]
      ) - 1,
      Number(
        yyyymmdd[3]
      )
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

// =====================================================

function formatDate(value) {
  const date =
    parseDate(value);

  if (!date) {
    return "No due date";
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

// =====================================================

function formatDateWithDay(
  value
) {
  const date =
    parseDate(value);

  if (!date) {
    return "No due date";
  }

  const datePart =
    date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );

  const weekday =
    date.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
      }
    );

  return `${datePart} (${weekday})`;
}

// =====================================================

function formatDateTime(value) {
  if (!value) {
    return "Submission time unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

// =====================================================

function getDaysUntil(value) {
  const dueDate =
    parseDate(value);

  if (!dueDate) {
    return null;
  }

  const today =
    startOfDay(
      new Date()
    );

  const due =
    startOfDay(
      dueDate
    );

  return Math.ceil(
    (
      due.getTime() -
      today.getTime()
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
}

// =====================================================

function getPriorityClasses(
  priority
) {
  const normalized =
    String(
      priority || ""
    )
      .trim()
      .toLowerCase();

  if (
    normalized === "high"
  ) {
    return "bg-error-container text-error";
  }

  if (
    normalized === "low"
  ) {
    return "bg-green-100 text-green-700";
  }

  return "bg-secondary-container text-secondary";
}

// =====================================================

function getAuthToken() {
  try {
    if (
      typeof authService.getToken ===
      "function"
    ) {
      const serviceToken =
        authService.getToken();

      if (serviceToken) {
        return serviceToken;
      }
    }
  } catch {
    // Continue with storage.
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

function getAuthHeaders(
  json = false
) {
  const token =
    getAuthToken();

  const headers = {};

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  if (json) {
    headers[
      "Content-Type"
    ] =
      "application/json";
  }

  return headers;
}

// =====================================================

function buildProtectedUrl(
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
    return `${API_ORIGIN}${text}`;
  }

  return `${API_ORIGIN}/${text}`;
}

// =====================================================
// PAGE
// =====================================================

export default function AssignmentsPage() {
  const navigate =
    useNavigate();

  const currentUser =
    authService.getCurrentUser();

  const studentRoll =
    String(
      currentUser?.rollNumber ||
        currentUser?.studentRoll ||
        currentUser?.roll_number ||
        ""
    ).trim();

  const studentName =
    currentUser?.name ||
    currentUser?.fullName ||
    "Student";

  const department =
    currentUser?.department ||
    "Department unavailable";

  // =====================================================
  // PAGE STATE
  // =====================================================

  const [
    activeTab,
    setActiveTab,
  ] =
    useState(
      "upcoming"
    );

  const [
    assignments,
    setAssignments,
  ] =
    useState([]);

  const [
    studentProfile,
    setStudentProfile,
  ] =
    useState(null);

  const [
    attendancePercentage,
    setAttendancePercentage,
  ] =
    useState(null);

  const [
    classesToday,
    setClassesToday,
  ] =
    useState(0);

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

  const [
    updatingId,
    setUpdatingId,
  ] =
    useState(null);

  // =====================================================
  // FILE SUBMISSION STATE
  // =====================================================

  const [
    uploadAssignment,
    setUploadAssignment,
  ] =
    useState(null);

  const [
    uploadMode,
    setUploadMode,
  ] =
    useState("submit");

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState(null);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    uploadError,
    setUploadError,
  ] =
    useState("");

  const [
    pageMessage,
    setPageMessage,
  ] =
    useState("");

  const [
    openingFileId,
    setOpeningFileId,
  ] =
    useState(null);

  // =====================================================
  // DISPLAY PROFILE
  // =====================================================

  const displayName =
    studentProfile?.NAME ||
    studentName;

  const displayDepartment =
    studentProfile?.DEPARTMENT ||
    department;

  const displayRoll =
    studentProfile?.STUDENT_ROLL ||
    studentRoll;

  // =====================================================
  // REQUEST JSON
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
        // Keep default.
      }

      throw new Error(
        message
      );
    }

    return response.json();
  }

  // =====================================================
  // GET FILE STATE FOR ASSIGNMENT
  // =====================================================

  async function getAssignmentFileState(
    assignmentId
  ) {
    return requestJson(
      `${API_BASE_URL}/assignment-files/${encodeURIComponent(
        assignmentId
      )}/state`
    );
  }

  // =====================================================
  // LOAD REAL DATA
  // =====================================================

  useEffect(() => {
    if (!studentRoll) {
      setError(
        "Student roll number was not found. Please log in again."
      );

      setLoading(false);

      return;
    }

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const results =
          await Promise.allSettled(
            [
              requestJson(
                `${API_BASE_URL}/assignments/${encodeURIComponent(
                  studentRoll
                )}`
              ),

              requestJson(
                `${API_BASE_URL}/students/${encodeURIComponent(
                  studentRoll
                )}`
              ),

              requestJson(
                `${API_BASE_URL}/attendance/${encodeURIComponent(
                  studentRoll
                )}`
              ),

              requestJson(
                `${API_BASE_URL}/timetable/${encodeURIComponent(
                  studentRoll
                )}`
              ),
            ]
          );

        // =================================================
        // ASSIGNMENTS
        // =================================================

        const assignmentResult =
          results[0];

        if (
          assignmentResult.status !==
          "fulfilled"
        ) {
          throw new Error(
            "Failed to load assignments."
          );
        }

        if (
          !Array.isArray(
            assignmentResult.value
          )
        ) {
          throw new Error(
            "Invalid assignment data received."
          );
        }

        const formatted =
          assignmentResult.value.map(
            (item) => ({
              id:
                item.ID ??
                item.id,

              title:
                item.TITLE ||
                item.title ||
                "Untitled Assignment",

              description:
                item.DESCRIPTION ||
                item.description ||
                "",

              subjectCode:
                item.SUBJECT_CODE ||
                item.subject_code ||
                "",

              subjectName:
                item.SUBJECT_NAME ||
                item.subject_name ||
                item.SUBJECT_CODE ||
                "",

              dueDate:
                item.DUE_DATE ||
                item.due_date ||
                null,

              priority:
                String(
                  item.PRIORITY ||
                    item.priority ||
                    "medium"
                ).toLowerCase(),

              status:
                String(
                  item.STATUS ||
                    item.status ||
                    "pending"
                ).toLowerCase(),

              fileState:
                null,

              fileStateLoading:
                true,

              fileStateError:
                "",
            })
          );

        setAssignments(
          formatted
        );

        // =================================================
        // LOAD REAL ATTACHMENT + SUBMISSION STATE
        // =================================================

        const withFileStates =
          await Promise.all(
            formatted.map(
              async (
                assignment
              ) => {
                try {
                  const state =
                    await getAssignmentFileState(
                      assignment.id
                    );

                  return {
                    ...assignment,

                    fileState:
                      state,

                    fileStateLoading:
                      false,

                    fileStateError:
                      "",
                  };
                } catch (
                  stateError
                ) {
                  console.warn(
                    `Unable to load file state for assignment ${assignment.id}:`,
                    stateError
                  );

                  return {
                    ...assignment,

                    fileState:
                      null,

                    fileStateLoading:
                      false,

                    fileStateError:
                      stateError.message,
                  };
                }
              }
            )
          );

        setAssignments(
          withFileStates
        );

        // =================================================
        // PROFILE
        // =================================================

        if (
          results[1].status ===
          "fulfilled"
        ) {
          setStudentProfile(
            results[1].value
          );
        }

        // =================================================
        // ATTENDANCE
        // =================================================

        if (
          results[2].status ===
            "fulfilled" &&
          Array.isArray(
            results[2].value
          )
        ) {
          let attended = 0;
          let total = 0;

          results[2].value.forEach(
            (row) => {
              attended +=
                Number(
                  row.ATTENDED_CLASSES
                ) || 0;

              total +=
                Number(
                  row.TOTAL_CLASSES
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
                ).toFixed(1)
              )
            );
          }
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
          const today =
            new Date()
              .toLocaleDateString(
                "en-US",
                {
                  weekday:
                    "long",
                }
              )
              .toLowerCase();

          const count =
            results[3].value.filter(
              (row) =>
                String(
                  row.DAY_OF_WEEK ||
                    row.day_of_week ||
                    ""
                )
                  .trim()
                  .toLowerCase() ===
                today
            ).length;

          setClassesToday(
            count
          );
        }
      } catch (err) {
        console.error(
          "Assignments page error:",
          err
        );

        setError(
          err.message ||
            "Unable to load assignments."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPage();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentRoll]);

  // =====================================================
  // REFRESH ONE SUBMISSION STATE
  // =====================================================

  async function refreshFileState(
    assignmentId
  ) {
    try {
      const state =
        await getAssignmentFileState(
          assignmentId
        );

      setAssignments(
        (previous) =>
          previous.map(
            (assignment) =>
              assignment.id ===
              assignmentId
                ? {
                    ...assignment,

                    fileState:
                      state,

                    fileStateLoading:
                      false,

                    fileStateError:
                      "",
                  }
                : assignment
          )
      );

      return state;
    } catch (err) {
      console.error(
        "Refresh file state error:",
        err
      );

      setAssignments(
        (previous) =>
          previous.map(
            (assignment) =>
              assignment.id ===
              assignmentId
                ? {
                    ...assignment,

                    fileStateLoading:
                      false,

                    fileStateError:
                      err.message,
                  }
                : assignment
          )
      );

      throw err;
    }
  }

  // =====================================================
  // REAL DERIVED STATS
  // =====================================================

  const pendingAssignments =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            assignment.status ===
            "pending"
        ),
      [assignments]
    );

  const completedAssignments =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            assignment.status ===
              "completed" ||
            assignment.status ===
              "submitted"
        ),
      [assignments]
    );

  const overdueAssignments =
    useMemo(() => {
      const today =
        startOfDay(
          new Date()
        );

      return pendingAssignments.filter(
        (
          assignment
        ) => {
          const due =
            parseDate(
              assignment.dueDate
            );

          if (!due) {
            return false;
          }

          return (
            startOfDay(
              due
            ) < today
          );
        }
      );
    }, [
      pendingAssignments,
    ]);

  const daysToNextDeadline =
    useMemo(() => {
      const values =
        pendingAssignments
          .map(
            (
              assignment
            ) =>
              getDaysUntil(
                assignment.dueDate
              )
          )
          .filter(
            (value) =>
              value !==
                null &&
              value >= 0
          )
          .sort(
            (a, b) =>
              a - b
          );

      return values.length >
        0
        ? values[0]
        : null;
    }, [
      pendingAssignments,
    ]);

  const nextDeadline =
    useMemo(() => {
      const candidates =
        pendingAssignments
          .map(
            (
              assignment
            ) => ({
              ...assignment,

              remaining:
                getDaysUntil(
                  assignment.dueDate
                ),
            })
          )
          .filter(
            (
              assignment
            ) =>
              assignment.remaining !==
                null &&
              assignment.remaining >=
                0
          )
          .sort(
            (a, b) =>
              a.remaining -
              b.remaining
          );

      return (
        candidates[0] ||
        null
      );
    }, [
      pendingAssignments,
    ]);

  const filteredAssignments =
    activeTab ===
    "upcoming"
      ? pendingAssignments
      : completedAssignments;

  // =====================================================
  // UPDATE ASSIGNMENT STATUS
  // =====================================================

  async function handleStatusToggle(
    assignment
  ) {
    const completed =
      assignment.status ===
        "completed" ||
      assignment.status ===
        "submitted";

    const newStatus =
      completed
        ? "pending"
        : "completed";

    try {
      setUpdatingId(
        assignment.id
      );

      const response =
        await fetch(
          `${API_BASE_URL}/assignments/${encodeURIComponent(
            assignment.id
          )}/status`,
          {
            method:
              "PATCH",

            headers:
              getAuthHeaders(
                true
              ),

            body:
              JSON.stringify(
                {
                  status:
                    newStatus,
                }
              ),
          }
        );

      if (!response.ok) {
        let message =
          "Failed to update assignment status.";

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

      setAssignments(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              assignment.id
                ? {
                    ...item,

                    status:
                      newStatus,
                  }
                : item
          )
      );

      setPageMessage(
        newStatus ===
          "completed"
          ? "Assignment marked as done."
          : "Assignment restored to pending."
      );
    } catch (err) {
      console.error(
        "Assignment status error:",
        err
      );

      alert(
        err.message ||
          "Unable to update assignment."
      );
    } finally {
      setUpdatingId(
        null
      );
    }
  }

  // =====================================================
  // OPEN SUBMISSION MODAL
  // =====================================================

  function openUploadModal(
    assignment,
    mode
  ) {
    setUploadAssignment(
      assignment
    );

    setUploadMode(
      mode
    );

    setSelectedFile(
      null
    );

    setUploadError(
      ""
    );
  }

  // =====================================================
  // CLOSE SUBMISSION MODAL
  // =====================================================

  function closeUploadModal() {
    if (uploading) {
      return;
    }

    setUploadAssignment(
      null
    );

    setSelectedFile(
      null
    );

    setUploadError(
      ""
    );
  }

  // =====================================================
  // VALIDATE SELECTED FILE
  // =====================================================

  function handleFileSelection(
    event
  ) {
    const file =
      event.target
        .files?.[0];

    setUploadError(
      ""
    );

    if (!file) {
      setSelectedFile(
        null
      );

      return;
    }

    const extension =
      `.${file.name
        .split(".")
        .pop()
        ?.toLowerCase()}`;

    const allowed = [
      ".pdf",
      ".doc",
      ".docx",
      ".zip",
    ];

    if (
      !allowed.includes(
        extension
      )
    ) {
      event.target.value =
        "";

      setSelectedFile(
        null
      );

      setUploadError(
        "Only PDF, DOC, DOCX and ZIP files are allowed."
      );

      return;
    }

    const maxSize =
      10 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {
      event.target.value =
        "";

      setSelectedFile(
        null
      );

      setUploadError(
        "File size must not exceed 10 MB."
      );

      return;
    }

    setSelectedFile(
      file
    );
  }

  // =====================================================
  // SUBMIT / REPLACE FILE
  // =====================================================

  async function handleUploadSubmit(
    event
  ) {
    event.preventDefault();

    if (
      !uploadAssignment
    ) {
      return;
    }

    if (!selectedFile) {
      setUploadError(
        "Please select a file."
      );

      return;
    }

    try {
      setUploading(
        true
      );

      setUploadError(
        ""
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile
      );

      const response =
        await fetch(
          `${API_BASE_URL}/assignment-files/${encodeURIComponent(
            uploadAssignment.id
          )}/submit`,
          {
            method:
              uploadMode ===
              "replace"
                ? "PUT"
                : "POST",

            headers:
              getAuthHeaders(),

            body:
              formData,
          }
        );

      if (!response.ok) {
        let message =
          "Unable to submit assignment.";

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
          // Keep default.
        }

        throw new Error(
          message
        );
      }

      await response.json();

      await refreshFileState(
        uploadAssignment.id
      );

      setPageMessage(
        uploadMode ===
          "replace"
          ? "Submission replaced successfully."
          : "Assignment submitted successfully."
      );

      setUploadAssignment(
        null
      );

      setSelectedFile(
        null
      );
    } catch (err) {
      console.error(
        "Assignment upload error:",
        err
      );

      setUploadError(
        err.message ||
          "Unable to upload assignment."
      );
    } finally {
      setUploading(
        false
      );
    }
  }

  // =====================================================
  // OPEN PROTECTED FILE
  // =====================================================

  async function openProtectedFile(
    assignmentId,
    fileUrl
  ) {
    if (!fileUrl) {
      return;
    }

    const newWindow =
      window.open(
        "",
        "_blank"
      );

    if (!newWindow) {
      alert(
        "Please allow pop-ups for CampusCopilot."
      );

      return;
    }

    try {
      setOpeningFileId(
        assignmentId
      );

      newWindow.document.title =
        "Loading file...";

      newWindow.document.body.innerHTML =
        `
        <p style="
          font-family: Arial, sans-serif;
          padding: 24px;
        ">
          Loading CampusCopilot file...
        </p>
        `;

      const response =
        await fetch(
          buildProtectedUrl(
            fileUrl
          ),
          {
            headers:
              getAuthHeaders(),
          }
        );

      if (!response.ok) {
        let message =
          "Unable to open file.";

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

      const blob =
        await response.blob();

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      newWindow.location.replace(
        objectUrl
      );

      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        120000
      );
    } catch (err) {
      console.error(
        "Open assignment file error:",
        err
      );

      try {
        newWindow.close();
      } catch {
        // Ignore.
      }

      alert(
        err.message ||
          "Unable to open file."
      );
    } finally {
      setOpeningFileId(
        null
      );
    }
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
            assignment
          </span>

          <p className="mt-3 text-on-surface-variant">
            Loading assignments...
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

        <div className="text-center max-w-md">

          <span className="material-symbols-outlined text-5xl text-error">
            error
          </span>

          <h2 className="text-xl font-bold text-error mt-3">
            Unable to Load Assignments
          </h2>

          <p className="text-on-surface-variant mt-2">
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
                ID: {displayRoll}
              </div>

            </div>

          </div>

        </Link>

        {/* NAVIGATION */}

        <nav className="px-2 flex flex-col gap-1">

          <Link
            to="/dashboard"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >

            <span className="material-symbols-outlined">
              dashboard
            </span>

            Home

          </Link>

          <Link
            to="/timetable"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >

            <span className="material-symbols-outlined">
              calendar_month
            </span>

            Timetable

          </Link>

          <Link
            to="/attendance"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >

            <span className="material-symbols-outlined">
              analytics
            </span>

            Attendance

          </Link>

          <Link
            to="/assignments"
            className="bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-semibold flex items-center gap-sm"
          >

            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              assignment
            </span>

            Assignments

          </Link>

          <Link
            to="/exams"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >

            <span className="material-symbols-outlined">
              description
            </span>

            Exams

          </Link>

          <Link
            to="/notices"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >

            <span className="material-symbols-outlined">
              campaign
            </span>

            Notices

          </Link>

          <Link
            to="/ai-analytics"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >

            <span className="material-symbols-outlined">
              insights
            </span>

            AI Analytics

          </Link>

          <Link
            to="/resources"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >

            <span className="material-symbols-outlined">
              folder_open
            </span>

            Resources

          </Link>

          <Link
            to="/student-id"
            className="text-on-surface-variant px-4 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-sm transition-colors"
          >

            <span className="material-symbols-outlined">
              badge
            </span>

            Digital ID

          </Link>

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

            {/* PENDING */}

            <div className="flex items-center justify-between gap-2">

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">

                  <span className="material-symbols-outlined text-[16px]">
                    assignment
                  </span>

                </div>

                <span className="font-body-sm text-on-surface">
                  Pending Tasks
                </span>

              </div>

              <span className="font-body-sm font-bold text-error">
                {pendingAssignments.length}
              </span>

            </div>

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
                {classesToday}
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

        {/* CONTENT */}

        <main className="w-full px-margin-mobile md:px-lg py-md pb-[90px] lg:pb-lg">

          {/* HERO */}

          <div className="mb-md">

            <StudentPageHero
              eyebrow="ASSIGNMENT TRACKER"
              title="Assignments & Tasks"
              subtitle="Manage your academic submissions, project deliverables, and lab reports."
            />

          </div>

          {/* SUCCESS MESSAGE */}

          {pageMessage && (
            <div className="mb-md rounded-xl border border-green-200 bg-green-50 text-green-700 px-4 py-3 flex items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <span className="material-symbols-outlined text-[20px]">
                  check_circle
                </span>

                <span className="font-body-sm font-medium">
                  {pageMessage}
                </span>

              </div>

              <button
                type="button"
                onClick={() =>
                  setPageMessage(
                    ""
                  )
                }
                className="text-green-700"
              >

                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>

              </button>

            </div>
          )}

          {/* =================================================
              TABS
          ================================================= */}

          <section className="flex items-center gap-md border-b border-outline-variant mb-md">

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "upcoming"
                )
              }
              className={`px-2 pb-3 font-title-md font-semibold border-b-2 ${
                activeTab ===
                "upcoming"
                  ? "text-primary border-primary"
                  : "text-on-surface-variant border-transparent hover:text-primary"
              }`}
            >

              Upcoming (
              {
                pendingAssignments.length
              }
              )

            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "completed"
                )
              }
              className={`px-2 pb-3 font-title-md font-semibold border-b-2 ${
                activeTab ===
                "completed"
                  ? "text-primary border-primary"
                  : "text-on-surface-variant border-transparent hover:text-primary"
              }`}
            >

              Completed (
              {
                completedAssignments.length
              }
              )

            </button>

          </section>

          {/* =================================================
              STAT CARDS
          ================================================= */}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-md mb-md">

            {/* UPCOMING */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl min-h-[112px] p-md flex items-center gap-md">

              <div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">

                <span className="material-symbols-outlined text-[26px]">
                  assignment
                </span>

              </div>

              <div>

                <div className="text-3xl font-bold text-primary">
                  {pendingAssignments.length}
                </div>

                <div className="font-body-md text-on-surface-variant">
                  Upcoming Tasks
                </div>

              </div>

            </article>

            {/* COMPLETED */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl min-h-[112px] p-md flex items-center gap-md">

              <div className="w-12 h-12 rounded-xl bg-secondary-container text-secondary flex items-center justify-center">

                <span className="material-symbols-outlined text-[26px]">
                  task_alt
                </span>

              </div>

              <div>

                <div className="text-3xl font-bold text-secondary">
                  {completedAssignments.length}
                </div>

                <div className="font-body-md text-on-surface-variant">
                  Completed
                </div>

              </div>

            </article>

            {/* OVERDUE */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl min-h-[112px] p-md flex items-center gap-md">

              <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center">

                <span className="material-symbols-outlined text-[26px]">
                  schedule
                </span>

              </div>

              <div>

                <div className="text-3xl font-bold text-error">
                  {overdueAssignments.length}
                </div>

                <div className="font-body-md text-on-surface-variant">
                  Overdue
                </div>

              </div>

            </article>

            {/* NEXT DEADLINE */}

            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl min-h-[112px] p-md flex items-center gap-md">

              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">

                <span className="material-symbols-outlined text-[26px]">
                  calendar_month
                </span>

              </div>

              <div>

                <div className="text-3xl font-bold text-primary">

                  {daysToNextDeadline !==
                  null
                    ? daysToNextDeadline
                    : "--"}

                </div>

                <div className="font-body-md text-on-surface-variant">

                  {daysToNextDeadline ===
                  1
                    ? "Day to Next Deadline"
                    : "Days to Next Deadline"}

                </div>

                {nextDeadline && (
                  <div className="font-body-sm text-outline mt-1">

                    {formatDate(
                      nextDeadline.dueDate
                    )}

                  </div>
                )}

              </div>

            </article>

          </section>

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {filteredAssignments.length ===
            0 && (
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">

              <span className="material-symbols-outlined text-5xl text-outline">
                assignment_turned_in
              </span>

              <h2 className="font-title-md font-bold text-on-surface mt-3">

                {activeTab ===
                "upcoming"
                  ? "No upcoming assignments"
                  : "No completed assignments"}

              </h2>

              <p className="font-body-sm text-on-surface-variant mt-1">

                {activeTab ===
                "upcoming"
                  ? "You currently have no pending assignments."
                  : "Completed assignments will appear here."}

              </p>

            </section>
          )}

          {/* =================================================
              ASSIGNMENT LIST
          ================================================= */}

          <section className="space-y-md">

            {filteredAssignments.map(
              (
                assignment
              ) => {
                const isCompleted =
                  assignment.status ===
                    "completed" ||
                  assignment.status ===
                    "submitted";

                const daysRemaining =
                  getDaysUntil(
                    assignment.dueDate
                  );

                const overdue =
                  !isCompleted &&
                  daysRemaining !==
                    null &&
                  daysRemaining <
                    0;

                const fileState =
                  assignment.fileState;

                const attachmentUrl =
                  fileState
                    ?.attachmentUrl ||
                  null;

                const submission =
                  fileState
                    ?.submission ||
                  null;

                const hasSubmitted =
                  Boolean(
                    fileState
                      ?.submitted &&
                      submission
                  );

                return (
                  <article
                    key={
                      assignment.id
                    }
                    className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md hover:shadow-sm transition-shadow"
                  >

                    {/* =================================================
                        ASSIGNMENT HEADER
                    ================================================= */}

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                      <span
                        className={`self-start inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClasses(
                          assignment.priority
                        )}`}
                      >

                        {assignment.priority
                          .charAt(0)
                          .toUpperCase() +
                          assignment.priority.slice(
                            1
                          )}{" "}
                        Priority

                      </span>

                      <div className="flex flex-wrap items-center gap-3">

                        <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">

                          <span className="material-symbols-outlined text-[18px]">
                            calendar_today
                          </span>

                          {formatDate(
                            assignment.dueDate
                          )}

                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isCompleted
                              ? "bg-green-100 text-green-700"
                              : overdue
                              ? "bg-error-container text-error"
                              : "bg-tertiary/10 text-tertiary"
                          }`}
                        >

                          {isCompleted
                            ? "Completed"
                            : overdue
                            ? "Overdue"
                            : "Pending"}

                        </span>

                      </div>

                    </div>

                    {/* TITLE */}

                    <h2 className="font-title-md text-xl font-bold text-on-surface mt-sm">

                      {assignment.title}

                    </h2>

                    {/* SUBJECT */}

                    <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant">

                      <span className="material-symbols-outlined text-[18px]">
                        menu_book
                      </span>

                      <span className="font-body-sm">

                        {assignment.subjectName}

                        {assignment.subjectCode &&
                          ` (${assignment.subjectCode})`}

                      </span>

                    </div>

                    {/* DESCRIPTION */}

                    {assignment.description && (
                      <p className="font-body-md text-on-surface-variant mt-sm">

                        {assignment.description}

                      </p>
                    )}

                    {/* =================================================
                        ASSIGNMENT ATTACHMENT
                    ================================================= */}

                    <div className="mt-md">

                      <div className="font-label-caps text-outline mb-2">
                        ASSIGNMENT FILE
                      </div>

                      {assignment.fileStateLoading ? (
                        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 flex items-center gap-2 text-sm text-on-surface-variant">

                          <span className="material-symbols-outlined text-[18px] animate-pulse">
                            progress_activity
                          </span>

                          Checking attachment...

                        </div>
                      ) : attachmentUrl ? (
                        <button
                          type="button"
                          disabled={
                            openingFileId ===
                            assignment.id
                          }
                          onClick={() =>
                            openProtectedFile(
                              assignment.id,
                              attachmentUrl
                            )
                          }
                          className="w-full sm:w-auto min-w-[210px] rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 px-4 py-3 flex items-center gap-3 text-left transition-colors disabled:opacity-60"
                        >

                          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">

                            <span className="material-symbols-outlined text-[20px]">
                              attach_file
                            </span>

                          </div>

                          <div className="min-w-0">

                            <div className="font-title-md text-sm font-semibold text-primary">

                              {openingFileId ===
                              assignment.id
                                ? "Opening..."
                                : "View Assignment"}

                            </div>

                            <div className="text-xs text-on-surface-variant">
                              File provided by faculty
                            </div>

                          </div>

                        </button>
                      ) : (
                        <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-3 flex items-center gap-2 text-sm text-on-surface-variant">

                          <span className="material-symbols-outlined text-[18px]">
                            attach_file
                          </span>

                          No assignment attachment has been uploaded.

                        </div>
                      )}

                    </div>

                    {/* =================================================
                        STUDENT SUBMISSION
                    ================================================= */}

                    <div className="mt-md rounded-xl border border-outline-variant bg-surface-container-low p-md">

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                        <div className="min-w-0">

                          <div className="flex items-center gap-2">

                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                hasSubmitted
                                  ? "bg-green-100 text-green-700"
                                  : "bg-tertiary/10 text-tertiary"
                              }`}
                            >

                              <span className="material-symbols-outlined text-[20px]">

                                {hasSubmitted
                                  ? "task_alt"
                                  : "upload_file"}

                              </span>

                            </div>

                            <div>

                              <div className="font-title-md font-bold text-on-surface">

                                {hasSubmitted
                                  ? "Assignment Submitted"
                                  : "Your Submission"}

                              </div>

                              <div className="text-xs text-on-surface-variant mt-0.5">

                                {hasSubmitted
                                  ? formatDateTime(
                                      submission.submittedAt
                                    )
                                  : "Upload your completed assignment before the deadline."}

                              </div>

                            </div>

                          </div>

                          {hasSubmitted && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-on-surface-variant">

                              <span className="material-symbols-outlined text-[18px]">
                                description
                              </span>

                              <span className="font-medium truncate max-w-[500px]">
                                {submission.fileName}
                              </span>

                            </div>
                          )}

                        </div>

                        {/* SUBMISSION ACTIONS */}

                        <div className="flex flex-wrap items-center gap-2">

                          {hasSubmitted ? (
                            <>
                              <button
                                type="button"
                                disabled={
                                  openingFileId ===
                                  `submission-${assignment.id}`
                                }
                                onClick={() =>
                                  openProtectedFile(
                                    `submission-${assignment.id}`,
                                    submission.fileUrl
                                  )
                                }
                                className="h-10 px-4 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container-high text-on-surface font-semibold text-sm flex items-center gap-2 disabled:opacity-60"
                              >

                                <span className="material-symbols-outlined text-[18px]">
                                  visibility
                                </span>

                                View Submission

                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openUploadModal(
                                    assignment,
                                    "replace"
                                  )
                                }
                                className="h-10 px-4 rounded-lg bg-secondary-container text-on-secondary-container hover:opacity-90 font-semibold text-sm flex items-center gap-2"
                              >

                                <span className="material-symbols-outlined text-[18px]">
                                  upload
                                </span>

                                Replace Submission

                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openUploadModal(
                                  assignment,
                                  "submit"
                                )
                              }
                              className="h-10 px-5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold text-sm flex items-center gap-2 shadow-sm"
                            >

                              <span className="material-symbols-outlined text-[18px]">
                                upload_file
                              </span>

                              Submit Assignment

                            </button>
                          )}

                        </div>

                      </div>

                    </div>

                    {/* FILE STATE ERROR */}

                    {assignment.fileStateError && (
                      <p className="mt-2 text-xs text-error">

                        Submission information could not be loaded:{" "}
                        {assignment.fileStateError}

                      </p>
                    )}

                    {/* =================================================
                        FOOTER
                    ================================================= */}

                    <div className="mt-md pt-sm border-t border-outline-variant flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">

                        <span className="material-symbols-outlined text-[18px]">
                          event
                        </span>

                        <span>

                          {isCompleted
                            ? `Due: ${formatDateWithDay(
                                assignment.dueDate
                              )}`
                            : overdue
                            ? `Overdue — ${formatDateWithDay(
                                assignment.dueDate
                              )}`
                            : `Due: ${formatDateWithDay(
                                assignment.dueDate
                              )}`}

                        </span>

                      </div>

                      <div className="flex flex-wrap items-center gap-sm self-end sm:self-auto">

                        {/* ASK COPILOT */}

                        <Link
                          to={`/ai-chat?q=${encodeURIComponent(
                            `Help me with my assignment "${assignment.title}" for ${assignment.subjectName}.`
                          )}`}
                          className="inline-flex items-center gap-1.5 text-tertiary font-semibold text-sm hover:underline"
                        >

                          <span className="material-symbols-outlined text-[18px]">
                            smart_toy
                          </span>

                          Ask Copilot

                        </Link>

                        {/* MARK DONE */}

                        <button
                          type="button"
                          disabled={
                            updatingId ===
                            assignment.id
                          }
                          onClick={() =>
                            handleStatusToggle(
                              assignment
                            )
                          }
                          className={`h-10 px-5 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-60 ${
                            isCompleted
                              ? "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low"
                              : "bg-primary text-on-primary hover:bg-primary-container shadow-sm"
                          }`}
                        >

                          <span className="material-symbols-outlined text-[18px]">

                            {updatingId ===
                            assignment.id
                              ? "progress_activity"
                              : isCompleted
                              ? "undo"
                              : "done"}

                          </span>

                          {updatingId ===
                          assignment.id
                            ? "Updating..."
                            : isCompleted
                            ? "Restore"
                            : "Mark as Done"}

                        </button>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </section>

        </main>

      </div>

      {/* =================================================
          MOBILE NAVIGATION
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
            to="/assignments"
            className="flex flex-col items-center text-primary font-semibold"
          >

            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              assignment
            </span>

            <span className="text-[10px]">
              Tasks
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

      {/* =================================================
          SUBMISSION MODAL
      ================================================= */}

      {uploadAssignment && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">

          <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl border border-outline-variant overflow-hidden">

            {/* MODAL HEADER */}

            <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4">

              <div>

                <div className="font-label-caps text-tertiary mb-1">

                  {uploadMode ===
                  "replace"
                    ? "REPLACE SUBMISSION"
                    : "SUBMIT ASSIGNMENT"}

                </div>

                <h2 className="text-xl font-bold text-on-surface">

                  {uploadAssignment.title}

                </h2>

                <p className="text-sm text-on-surface-variant mt-1">

                  {uploadAssignment.subjectName}

                  {uploadAssignment.subjectCode &&
                    ` (${uploadAssignment.subjectCode})`}

                </p>

              </div>

              <button
                type="button"
                disabled={
                  uploading
                }
                onClick={
                  closeUploadModal
                }
                className="w-9 h-9 rounded-full hover:bg-surface-container-low flex items-center justify-center disabled:opacity-50"
              >

                <span className="material-symbols-outlined">
                  close
                </span>

              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleUploadSubmit
              }
              className="p-6"
            >

              {/* DUE DATE */}

              <div className="rounded-lg bg-surface-container-low border border-outline-variant px-4 py-3 flex items-center gap-3 mb-5">

                <span className="material-symbols-outlined text-primary">
                  event
                </span>

                <div>

                  <div className="text-xs text-outline">
                    Due date
                  </div>

                  <div className="text-sm font-semibold text-on-surface">
                    {formatDateWithDay(
                      uploadAssignment.dueDate
                    )}
                  </div>

                </div>

              </div>

              {/* FILE INPUT */}

              <label className="block">

                <span className="font-title-md font-semibold text-on-surface">
                  Select your file
                </span>

                <span className="block text-sm text-on-surface-variant mt-1">
                  PDF, DOC, DOCX or ZIP. Maximum file size: 10 MB.
                </span>

                <div className="mt-3 rounded-xl border-2 border-dashed border-outline-variant hover:border-primary bg-surface-container-low p-6 text-center cursor-pointer transition-colors">

                  <span className="material-symbols-outlined text-4xl text-primary">
                    cloud_upload
                  </span>

                  <div className="font-title-md font-semibold text-on-surface mt-2">

                    {selectedFile
                      ? selectedFile.name
                      : "Choose assignment file"}

                  </div>

                  <div className="text-xs text-outline mt-1">

                    {selectedFile
                      ? `${(
                          selectedFile.size /
                          1024 /
                          1024
                        ).toFixed(
                          2
                        )} MB`
                      : "Click to browse your computer"}

                  </div>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.zip"
                    onChange={
                      handleFileSelection
                    }
                    className="sr-only"
                  />

                </div>

              </label>

              {/* ERROR */}

              {uploadError && (
                <div className="mt-4 rounded-lg bg-error-container text-error px-4 py-3 text-sm flex gap-2">

                  <span className="material-symbols-outlined text-[18px]">
                    error
                  </span>

                  {uploadError}

                </div>
              )}

              {/* BUTTONS */}

              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  disabled={
                    uploading
                  }
                  onClick={
                    closeUploadModal
                  }
                  className="h-11 px-5 rounded-lg border border-outline-variant text-on-surface font-semibold hover:bg-surface-container-low disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    uploading ||
                    !selectedFile
                  }
                  className="h-11 px-5 rounded-lg bg-primary text-on-primary font-semibold flex items-center gap-2 hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed"
                >

                  <span className={`material-symbols-outlined text-[19px] ${
                    uploading
                      ? "animate-spin"
                      : ""
                  }`}>

                    {uploading
                      ? "progress_activity"
                      : "upload"}

                  </span>

                  {uploading
                    ? "Uploading..."
                    : uploadMode ===
                      "replace"
                    ? "Replace Submission"
                    : "Submit Assignment"}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}
