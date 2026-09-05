const API_BASE_URL =
  "http://localhost:5000/api";


// =====================================================
// AUTH TOKEN HELPERS
// =====================================================

export function getToken() {
  return (
    localStorage.getItem(
      "campus_token"
    ) || ""
  );
}


export function getAuthHeader() {
  const token =
    getToken();

  return token
    ? {
        Authorization:
          `Bearer ${token}`,
      }
    : {};
}


// =====================================================
// SAFE JSON RESPONSE
// =====================================================

async function readJson(
  response
) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}


// =====================================================
// AUTH SERVICE
// =====================================================

export const authService = {

  // ---------------------------------------------------
  // REGISTER
  // ---------------------------------------------------

  async register(
    userData
  ) {
    const res =
      await fetch(
        `${API_BASE_URL}/auth/register`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              userData
            ),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Registration failed"
      );
    }


    if (data.token) {
      localStorage.setItem(
        "campus_token",
        data.token
      );


      localStorage.setItem(
        "campus_user",
        JSON.stringify(
          data.user
        )
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // LOGIN
  // ---------------------------------------------------

  async login(
    email,
    password
  ) {
    const res =
      await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              email,
              password,
            }),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Login failed"
      );
    }


    if (data.token) {
      localStorage.setItem(
        "campus_token",
        data.token
      );


      localStorage.setItem(
        "campus_user",
        JSON.stringify(
          data.user
        )
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // CURRENT USER
  // ---------------------------------------------------

  getCurrentUser() {
    try {
      const userStr =
        localStorage.getItem(
          "campus_user"
        );


      return userStr
        ? JSON.parse(
            userStr
          )
        : null;

    } catch {
      return null;
    }
  },


  // ---------------------------------------------------
  // TOKEN
  // ---------------------------------------------------

  getToken() {
    return getToken();
  },


  // ---------------------------------------------------
  // GET CURRENT USER FROM BACKEND
  // ---------------------------------------------------

  async getMe() {
    const res =
      await fetch(
        `${API_BASE_URL}/auth/me`,
        {
          headers:
            getAuthHeader(),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Unable to verify user session"
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------

  logout() {
    localStorage.removeItem(
      "campus_token"
    );


    localStorage.removeItem(
      "campus_user"
    );
  },
};


// =====================================================
// AI SERVICE
// =====================================================

export const aiService = {

  // ---------------------------------------------------
  // CHAT
  // ---------------------------------------------------

  async sendChatMessage(
    message,
    history = [],
    context = {}
  ) {
    const res =
      await fetch(
        `${API_BASE_URL}/ai/chat`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...getAuthHeader(),
          },

          body:
            JSON.stringify({
              message,
              history,
              context,
            }),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Failed to get AI response"
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // PERFORMANCE ANALYTICS
  // ---------------------------------------------------

  async getPerformanceAnalytics(
    studentRoll
  ) {
    const res =
      await fetch(
        `${API_BASE_URL}/ai/analytics`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...getAuthHeader(),
          },

          body:
            JSON.stringify({
              studentRoll,
            }),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Failed to load AI performance analytics"
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // NOTICE SUMMARY
  // ---------------------------------------------------

  async summarizeNotice(
    title,
    noticeText
  ) {
    const res =
      await fetch(
        `${API_BASE_URL}/ai/summarize-notice`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...getAuthHeader(),
          },

          body:
            JSON.stringify({
              title,
              noticeText,
            }),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Failed to summarize notice"
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // STUDY PLAN
  // ---------------------------------------------------

  async generateStudyPlan(
    subjects,
    daysUntilExam,
    dailyHours
  ) {
    const res =
      await fetch(
        `${API_BASE_URL}/ai/study-plan`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...getAuthHeader(),
          },

          body:
            JSON.stringify({
              subjects,
              daysUntilExam,
              dailyHours,
            }),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Failed to generate study plan"
      );
    }


    return data;
  },
};


// =====================================================
// ATTENDANCE SERVICE
// =====================================================

export const attendanceService = {

  // ---------------------------------------------------
  // GET ATTENDANCE
  // ---------------------------------------------------

  async getAttendance(
    rollNumber
  ) {
    const cleanRoll =
      String(
        rollNumber ||
          ""
      ).trim();


    if (!cleanRoll) {
      throw new Error(
        "Student roll number is required."
      );
    }


    const res =
      await fetch(
        `${API_BASE_URL}/attendance/${encodeURIComponent(
          cleanRoll
        )}`,
        {
          headers:
            getAuthHeader(),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Failed to fetch attendance"
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // ATTENDANCE TREND
  // ---------------------------------------------------

  async getAttendanceTrend(
    rollNumber,
    weeks = 8
  ) {
    const cleanRoll =
      String(
        rollNumber ||
          ""
      ).trim();


    if (!cleanRoll) {
      throw new Error(
        "Student roll number is required."
      );
    }


    const parsedWeeks =
      Number.parseInt(
        weeks,
        10
      );


    const safeWeeks =
      Number.isFinite(
        parsedWeeks
      )
        ? Math.min(
            52,
            Math.max(
              1,
              parsedWeeks
            )
          )
        : 8;


    const res =
      await fetch(
        `${API_BASE_URL}/attendance/${encodeURIComponent(
          cleanRoll
        )}/trend?weeks=${safeWeeks}`,
        {
          headers:
            getAuthHeader(),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Unable to load attendance trend."
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // TREND HISTORY
  // ---------------------------------------------------

  async getAttendanceTrendHistory(
    rollNumber,
    weeks = 8
  ) {
    const cleanRoll =
      String(
        rollNumber ||
          ""
      ).trim();


    if (!cleanRoll) {
      throw new Error(
        "Student roll number is required."
      );
    }


    const parsedWeeks =
      Number.parseInt(
        weeks,
        10
      );


    const safeWeeks =
      Number.isFinite(
        parsedWeeks
      )
        ? Math.min(
            52,
            Math.max(
              1,
              parsedWeeks
            )
          )
        : 8;


    const res =
      await fetch(
        `${API_BASE_URL}/attendance/${encodeURIComponent(
          cleanRoll
        )}/trend-history?weeks=${safeWeeks}`,
        {
          headers:
            getAuthHeader(),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Unable to load attendance history."
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // UPDATE ATTENDANCE
  // ---------------------------------------------------

  async updateAttendance(
    records
  ) {
    const res =
      await fetch(
        `${API_BASE_URL}/attendance/update`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...getAuthHeader(),
          },

          body:
            JSON.stringify({
              records,
            }),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Failed to update attendance"
      );
    }


    return data;
  },
};


// =====================================================
// COMMON STUDENT COLLECTION FETCHER
// =====================================================

async function getStudentCollection(
  resource,
  rollNumber
) {
  const cleanRoll =
    String(
      rollNumber ||
        ""
    ).trim();


  if (!cleanRoll) {
    throw new Error(
      "Student roll number is required."
    );
  }


  const res =
    await fetch(
      `${API_BASE_URL}/${resource}/${encodeURIComponent(
        cleanRoll
      )}`,
      {
        headers:
          getAuthHeader(),
      }
    );


  const data =
    await readJson(
      res
    );


  if (!res.ok) {
    throw new Error(
      data.error ||
        data.message ||
        `Failed to fetch ${resource}`
    );
  }


  return data;
}


// =====================================================
// ASSIGNMENT SERVICE
// =====================================================

export const assignmentService = {

  async getAssignments(
    rollNumber
  ) {
    return getStudentCollection(
      "assignments",
      rollNumber
    );
  },
};


// =====================================================
// TIMETABLE SERVICE
// =====================================================

export const timetableService = {

  async getTimetable(
    rollNumber
  ) {
    return getStudentCollection(
      "timetable",
      rollNumber
    );
  },
};


// =====================================================
// NOTICE SERVICE
// =====================================================

export const noticeService = {

  // ---------------------------------------------------
  // GET NOTICES
  // ---------------------------------------------------

  async getNotices() {
    const res =
      await fetch(
        `${API_BASE_URL}/notices`,
        {
          headers:
            getAuthHeader(),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Failed to fetch notices"
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // PUBLISH NOTICE
  // ---------------------------------------------------

  async publishNotice(
    noticeData
  ) {
    const res =
      await fetch(
        `${API_BASE_URL}/notices`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...getAuthHeader(),
          },

          body:
            JSON.stringify(
              noticeData
            ),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Failed to publish notice"
      );
    }


    return data;
  },
};


// =====================================================
// STUDENT SERVICE
// =====================================================

export const studentService = {

  // ---------------------------------------------------
  // GET STUDENTS
  // ---------------------------------------------------

  async getStudents() {
    const res =
      await fetch(
        `${API_BASE_URL}/students`,
        {
          headers:
            getAuthHeader(),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Failed to fetch students"
      );
    }


    return data;
  },


  // ---------------------------------------------------
  // UPDATE STUDENT
  // ---------------------------------------------------

  async updateStudent(
    rollNumber,
    studentData
  ) {
    const cleanRoll =
      String(
        rollNumber ||
          ""
      ).trim();


    if (!cleanRoll) {
      throw new Error(
        "Student roll number is required."
      );
    }


    const res =
      await fetch(
        `${API_BASE_URL}/students/${encodeURIComponent(
          cleanRoll
        )}`,
        {
          method:
            "PUT",

          headers: {
            "Content-Type":
              "application/json",

            ...getAuthHeader(),
          },

          body:
            JSON.stringify(
              studentData
            ),
        }
      );


    const data =
      await readJson(
        res
      );


    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Failed to update student"
      );
    }


    return data;
  },
};