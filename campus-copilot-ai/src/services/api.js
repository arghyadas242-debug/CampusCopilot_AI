const API_BASE_URL = "http://localhost:5000/api";

function getAuthHeader() {
  const token = localStorage.getItem("campus_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const authService = {
  async register(userData) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    if (data.token) {
      localStorage.setItem("campus_token", data.token);
      localStorage.setItem("campus_user", JSON.stringify(data.user));
    }
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    if (data.token) {
      localStorage.setItem("campus_token", data.token);
      localStorage.setItem("campus_user", JSON.stringify(data.user));
    }
    return data;
  },

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem("campus_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem("campus_token");
    localStorage.removeItem("campus_user");
  },
};

export const aiService = {
  async sendChatMessage(message, history = [], context = {}) {
    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ message, history, context }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to get AI response");
    return data;
  },

  async summarizeNotice(title, noticeText) {
    const res = await fetch(`${API_BASE_URL}/ai/summarize-notice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ title, noticeText }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to summarize notice");
    return data;
  },

  async generateStudyPlan(subjects, daysUntilExam, dailyHours) {
    const res = await fetch(`${API_BASE_URL}/ai/study-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ subjects, daysUntilExam, dailyHours }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate study plan");
    return data;
  },
};

export const attendanceService = {
  async getAttendance(rollNumber = "2026-CS-0042") {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${rollNumber}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return await res.json();
    } catch (e) {
      console.warn("Using offline fallback attendance data:", e.message);
      return null;
    }
  },

  async updateAttendance(records) {
    const res = await fetch(`${API_BASE_URL}/attendance/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ records }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update attendance");
    return data;
  },
};

export const noticeService = {
  async getNotices() {
    try {
      const res = await fetch(`${API_BASE_URL}/notices`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch notices");
      return await res.json();
    } catch (e) {
      console.warn("Using offline fallback notice data:", e.message);
      return null;
    }
  },

  async publishNotice(noticeData) {
    const res = await fetch(`${API_BASE_URL}/notices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(noticeData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to publish notice");
    return data;
  },
};

export const studentService = {
  async getStudents() {
    try {
      const res = await fetch(`${API_BASE_URL}/students`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async updateStudent(rollNumber, studentData) {
    const res = await fetch(`${API_BASE_URL}/students/${rollNumber}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(studentData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update student");
    return data;
  },
};

