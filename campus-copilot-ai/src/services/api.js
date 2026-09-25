const API_BASE_URL = "http://localhost:5000/api";

export function getToken() {
  return localStorage.getItem("campus_token") || "";
}

export function getAuthHeader() {
  const token = getToken();

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

function apiError(
  message,
  status = 0,
  code = "",
  retryAfter = null
) {
  const error = new Error(message);

  error.status = status;
  error.code = code;
  error.retryAfter = retryAfter;

  return error;
}

function retryAfterSeconds(response) {
  const value = response.headers.get("Retry-After");

  if (!value || !value.trim()) {
    return null;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds);
  }

  const date = Date.parse(value);

  return Number.isFinite(date)
    ? Math.max(0, Math.ceil((date - Date.now()) / 1000))
    : null;
}

async function request(
  path,
  {
    method = "GET",
    body,
    signal,
    authenticated = true,
    failureMessage = "The request could not be completed.",
  } = {}
) {
  const token = authenticated ? getToken() : "";

  if (authenticated && !token) {
    throw apiError(
      "Please log in to continue.",
      401,
      "AUTH_TOKEN_REQUIRED"
    );
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,

      headers:
        body === undefined
          ? authenticated
            ? getAuthHeader()
            : {}
          : {
              "Content-Type": "application/json",
              ...(authenticated ? getAuthHeader() : {}),
            },

      ...(body === undefined
        ? {}
        : { body: JSON.stringify(body) }),

      cache: "no-store",
    });
  } catch (error) {
    if (signal?.aborted || error.name === "AbortError") {
      throw error;
    }

    throw apiError(
      "Unable to reach the server. Check your connection and try again.",
      0,
      "NETWORK_ERROR"
    );
  }

  let data;
  let validJson = true;

  try {
    data = await response.json();
  } catch (error) {
    if (signal?.aborted || error.name === "AbortError") {
      throw error;
    }

    validJson = false;
  }

  if (authenticated && getToken() !== token) {
    throw apiError(
      "Your login session has changed. Please log in again.",
      401,
      "AUTH_SESSION_CHANGED"
    );
  }

  if (!response.ok) {
    const code =
      typeof data?.code === "string" ? data.code : "";

    const serverMessage =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
        ? data.message
        : "";

    const message =
      response.status >= 500
        ? `${failureMessage} The service is temporarily unavailable. Please try again later.`
        : serverMessage || failureMessage;

    throw apiError(
      message,
      response.status,
      code,
      retryAfterSeconds(response)
    );
  }

  if (
    !validJson ||
    data === null ||
    typeof data !== "object"
  ) {
    throw apiError(
      "The server returned an invalid response. Please try again.",
      response.status,
      "INVALID_RESPONSE"
    );
  }

  return data;
}

function saveSession(data) {
  if (
    typeof data.token !== "string" ||
    !data.token.trim() ||
    !data.user ||
    typeof data.user !== "object" ||
    Array.isArray(data.user)
  ) {
    throw apiError(
      "The server did not return a valid login session.",
      200,
      "INVALID_AUTH_RESPONSE"
    );
  }

  localStorage.setItem("campus_token", data.token);
  localStorage.setItem(
    "campus_user",
    JSON.stringify(data.user)
  );

  return data;
}

export const authService = {
  async register(userData) {
    const data = await request("/auth/register", {
      method: "POST",
      body: userData,
      authenticated: false,
      failureMessage: "Registration failed.",
    });

    return saveSession(data);
  },

  async login(email, password) {
    const data = await request("/auth/login", {
      method: "POST",
      body: { email, password },
      authenticated: false,
      failureMessage: "Login failed.",
    });

    return saveSession(data);
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem("campus_user");
      const user = raw ? JSON.parse(raw) : null;

      return (
        user &&
        typeof user === "object" &&
        !Array.isArray(user)
      )
        ? user
        : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return getToken();
  },

  async getMe() {
    return request("/auth/me", {
      failureMessage: "Unable to verify user session.",
    });
  },

  logout() {
    localStorage.removeItem("campus_token");
    localStorage.removeItem("campus_user");
  },
};

export const aiService = {
  async sendChatMessage(
    message,
    history = [],
    context = {},
    options = {}
  ) {
    const data = await request("/ai/chat", {
      method: "POST",
      body: { message, history, context },
      signal: options.signal,
      failureMessage: "Failed to get AI response.",
    });

    if (
      typeof data.reply !== "string" ||
      !data.reply.trim()
    ) {
      throw apiError(
        "CampusCopilot returned an empty or invalid reply. Please try again.",
        200,
        "INVALID_AI_RESPONSE"
      );
    }

    return data;
  },

  async getPerformanceAnalytics(studentRoll) {
    return request("/ai/analytics", {
      method: "POST",

      body:
        studentRoll === undefined
          ? {}
          : { studentRoll },

      failureMessage:
        "Failed to load AI performance analytics.",
    });
  },

  async summarizeNotice(title, noticeText) {
    return request("/ai/summarize-notice", {
      method: "POST",
      body: { title, noticeText },
      failureMessage: "Failed to summarize notice.",
    });
  },

  async generateStudyPlan(
    subjects,
    daysUntilExam,
    dailyHours
  ) {
    return request("/ai/study-plan", {
      method: "POST",
      body: {
        subjects,
        daysUntilExam,
        dailyHours,
      },
      failureMessage: "Failed to generate study plan.",
    });
  },
};

function cleanStudentRoll(rollNumber) {
  const roll = String(rollNumber || "").trim();

  if (!roll) {
    throw new Error("Student roll number is required.");
  }

  return encodeURIComponent(roll);
}

function safeWeekCount(weeks) {
  const parsed = Number.parseInt(weeks, 10);

  return Number.isFinite(parsed)
    ? Math.min(52, Math.max(1, parsed))
    : 8;
}

export const attendanceService = {
  async getAttendance(rollNumber) {
    return request(
      `/attendance/${cleanStudentRoll(rollNumber)}`,
      {
        failureMessage: "Failed to fetch attendance.",
      }
    );
  },

  async getAttendanceTrend(rollNumber, weeks = 8) {
    return request(
      `/attendance/${cleanStudentRoll(
        rollNumber
      )}/trend?weeks=${safeWeekCount(weeks)}`,
      {
        failureMessage: "Unable to load attendance trend.",
      }
    );
  },

  async getAttendanceTrendHistory(rollNumber, weeks = 8) {
    return request(
      `/attendance/${cleanStudentRoll(
        rollNumber
      )}/trend-history?weeks=${safeWeekCount(weeks)}`,
      {
        failureMessage:
          "Unable to load attendance history.",
      }
    );
  },

  async updateAttendance(records) {
    return request("/attendance/update", {
      method: "POST",
      body: { records },
      failureMessage: "Failed to update attendance.",
    });
  },
};

async function getStudentCollection(
  resource,
  rollNumber
) {
  return request(
    `/${resource}/${cleanStudentRoll(rollNumber)}`,
    {
      failureMessage: `Failed to fetch ${resource}.`,
    }
  );
}

export const assignmentService = {
  async getAssignments(rollNumber) {
    return getStudentCollection(
      "assignments",
      rollNumber
    );
  },
};

export const timetableService = {
  async getTimetable(rollNumber) {
    return getStudentCollection(
      "timetable",
      rollNumber
    );
  },
};

export const noticeService = {
  async getNotices() {
    return request("/notices", {
      failureMessage: "Failed to fetch notices.",
    });
  },

  async publishNotice(noticeData) {
    return request("/notices", {
      method: "POST",
      body: noticeData,
      failureMessage: "Failed to publish notice.",
    });
  },
};

export const studentService = {
  async getStudents() {
    return request("/students", {
      failureMessage: "Failed to fetch students.",
    });
  },

  async updateStudent(rollNumber, studentData) {
    return request(
      `/students/${cleanStudentRoll(rollNumber)}`,
      {
        method: "PUT",
        body: studentData,
        failureMessage: "Failed to update student.",
      }
    );
  },
};