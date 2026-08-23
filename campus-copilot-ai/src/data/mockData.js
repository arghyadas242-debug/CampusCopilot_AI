// Mock data for CampusCopilot AI

export const currentUser = {
  id: "STU-2024-001",
  name: "Arghya Das",
  email: "arghya.das@university.edu",
  department: "Computer Science & Engineering",
  semester: 6,
  year: "3rd Year",
  gpa: 8.7,
  avatar: null,
  phone: "+91 98765 43210",
  dob: "2003-05-15",
  enrollmentDate: "2022-08-01",
  address: "Kolkata, West Bengal",
  bloodGroup: "O+",
  accountStatus: "Active",
};

export const stats = {
  attendance: 87,
  gpa: 8.7,
  pendingTasks: 5,
  upcomingExams: 3,
  completedCredits: 102,
  totalCredits: 160,
};

export const courses = [
  { id: 1, code: "CS601", name: "Artificial Intelligence", faculty: "Dr. Sharma", credits: 4, room: "LH-301", color: "#6366f1" },
  { id: 2, code: "CS602", name: "Machine Learning", faculty: "Prof. Gupta", credits: 4, room: "LH-205", color: "#06b6d4" },
  { id: 3, code: "CS603", name: "Computer Networks", faculty: "Dr. Patel", credits: 3, room: "LH-102", color: "#f59e0b" },
  { id: 4, code: "CS604", name: "Software Engineering", faculty: "Prof. Roy", credits: 3, room: "LH-204", color: "#10b981" },
  { id: 5, code: "CS605", name: "Database Systems", faculty: "Dr. Singh", credits: 4, room: "LH-103", color: "#ef4444" },
  { id: 6, code: "MA601", name: "Numerical Methods", faculty: "Dr. Bose", credits: 3, room: "LH-401", color: "#8b5cf6" },
];

export const timetable = {
  Monday: [
    { time: "9:00 - 10:00", course: "Artificial Intelligence", room: "LH-301", type: "Lecture", color: "#6366f1" },
    { time: "10:00 - 11:00", course: "Machine Learning", room: "LH-205", type: "Lecture", color: "#06b6d4" },
    { time: "11:30 - 12:30", course: "Computer Networks", room: "LH-102", type: "Lecture", color: "#f59e0b" },
    { time: "2:00 - 4:00", course: "AI Lab", room: "Lab-3", type: "Lab", color: "#6366f1" },
  ],
  Tuesday: [
    { time: "9:00 - 10:00", course: "Software Engineering", room: "LH-204", type: "Lecture", color: "#10b981" },
    { time: "10:00 - 11:00", course: "Database Systems", room: "LH-103", type: "Lecture", color: "#ef4444" },
    { time: "11:30 - 12:30", course: "Numerical Methods", room: "LH-401", type: "Lecture", color: "#8b5cf6" },
    { time: "2:00 - 4:00", course: "ML Lab", room: "Lab-5", type: "Lab", color: "#06b6d4" },
  ],
  Wednesday: [
    { time: "9:00 - 10:00", course: "Artificial Intelligence", room: "LH-301", type: "Lecture", color: "#6366f1" },
    { time: "10:00 - 11:00", course: "Computer Networks", room: "LH-102", type: "Lecture", color: "#f59e0b" },
    { time: "11:30 - 12:30", course: "Machine Learning", room: "LH-205", type: "Lecture", color: "#06b6d4" },
    { time: "2:00 - 3:00", course: "Database Systems", room: "LH-103", type: "Tutorial", color: "#ef4444" },
  ],
  Thursday: [
    { time: "9:00 - 10:00", course: "Numerical Methods", room: "LH-401", type: "Lecture", color: "#8b5cf6" },
    { time: "10:00 - 11:00", course: "Software Engineering", room: "LH-204", type: "Lecture", color: "#10b981" },
    { time: "11:30 - 12:30", course: "Artificial Intelligence", room: "LH-301", type: "Lecture", color: "#6366f1" },
    { time: "2:00 - 4:00", course: "CN Lab", room: "Lab-2", type: "Lab", color: "#f59e0b" },
  ],
  Friday: [
    { time: "9:00 - 10:00", course: "Machine Learning", room: "LH-205", type: "Lecture", color: "#06b6d4" },
    { time: "10:00 - 11:00", course: "Database Systems", room: "LH-103", type: "Lecture", color: "#ef4444" },
    { time: "11:30 - 12:30", course: "Software Engineering", room: "LH-204", type: "Tutorial", color: "#10b981" },
  ],
  Saturday: [
    { time: "9:00 - 10:00", course: "Numerical Methods", room: "LH-401", type: "Tutorial", color: "#8b5cf6" },
    { time: "10:00 - 12:00", course: "SE Lab", room: "Lab-1", type: "Lab", color: "#10b981" },
  ],
};

export const assignments = [
  { id: 1, title: "Neural Network Implementation", course: "Artificial Intelligence", dueDate: "2026-08-28", status: "pending", priority: "high", description: "Implement a feedforward neural network from scratch using Python." },
  { id: 2, title: "Linear Regression Analysis", course: "Machine Learning", dueDate: "2026-08-30", status: "in-progress", priority: "medium", description: "Perform linear regression on the given dataset and report findings." },
  { id: 3, title: "TCP/IP Protocol Report", course: "Computer Networks", dueDate: "2026-08-25", status: "submitted", priority: "high", description: "Write a detailed report on TCP/IP protocol stack." },
  { id: 4, title: "UML Diagrams - Library System", course: "Software Engineering", dueDate: "2026-09-02", status: "pending", priority: "low", description: "Create UML class, sequence, and use case diagrams." },
  { id: 5, title: "SQL Query Optimization", course: "Database Systems", dueDate: "2026-09-05", status: "pending", priority: "medium", description: "Optimize the given SQL queries for better performance." },
  { id: 6, title: "Numerical Integration Methods", course: "Numerical Methods", dueDate: "2026-08-27", status: "submitted", priority: "low", description: "Compare Simpson's and Trapezoidal rule implementations." },
];

export const exams = [
  { id: 1, course: "Artificial Intelligence", date: "2026-09-15", time: "10:00 AM", venue: "Hall A", type: "Mid-Semester", duration: "2 hours" },
  { id: 2, course: "Machine Learning", date: "2026-09-17", time: "2:00 PM", venue: "Hall B", type: "Mid-Semester", duration: "2 hours" },
  { id: 3, course: "Computer Networks", date: "2026-09-19", time: "10:00 AM", venue: "Hall A", type: "Mid-Semester", duration: "1.5 hours" },
  { id: 4, course: "Software Engineering", date: "2026-09-22", time: "10:00 AM", venue: "Hall C", type: "Mid-Semester", duration: "2 hours" },
  { id: 5, course: "Database Systems", date: "2026-09-24", time: "2:00 PM", venue: "Hall A", type: "Mid-Semester", duration: "2 hours" },
  { id: 6, course: "Numerical Methods", date: "2026-09-26", time: "10:00 AM", venue: "Hall B", type: "Mid-Semester", duration: "1.5 hours" },
];

export const attendanceData = [
  { subject: "AI", present: 22, total: 25, percentage: 88, color: "#6366f1" },
  { subject: "ML", present: 20, total: 24, percentage: 83, color: "#06b6d4" },
  { subject: "CN", present: 18, total: 20, percentage: 90, color: "#f59e0b" },
  { subject: "SE", present: 16, total: 18, percentage: 89, color: "#10b981" },
  { subject: "DBMS", present: 19, total: 22, percentage: 86, color: "#ef4444" },
  { subject: "NM", present: 14, total: 16, percentage: 88, color: "#8b5cf6" },
];

export const recentActivity = [
  { id: 1, type: "assignment", message: "Submitted TCP/IP Protocol Report", time: "2 hours ago", icon: "FileText" },
  { id: 2, type: "attendance", message: "Attendance marked for AI class", time: "5 hours ago", icon: "CheckCircle" },
  { id: 3, type: "grade", message: "Received grade for ML Quiz 2: 92/100", time: "1 day ago", icon: "Award" },
  { id: 4, type: "announcement", message: "New announcement: Campus event this Saturday", time: "2 days ago", icon: "Bell" },
];

export const resources = [
  { id: 1, title: "AI Lecture Notes - Unit 3", type: "PDF", course: "Artificial Intelligence", size: "2.4 MB", uploadedBy: "Dr. Sharma", date: "2026-08-20", category: "Notes" },
  { id: 2, title: "ML Assignment Dataset", type: "CSV", course: "Machine Learning", size: "15 MB", uploadedBy: "Prof. Gupta", date: "2026-08-18", category: "Dataset" },
  { id: 3, title: "Network Protocols Reference", type: "PDF", course: "Computer Networks", size: "1.8 MB", uploadedBy: "Dr. Patel", date: "2026-08-15", category: "Reference" },
  { id: 4, title: "UML Tutorial Video", type: "Video", course: "Software Engineering", size: "120 MB", uploadedBy: "Prof. Roy", date: "2026-08-12", category: "Video" },
  { id: 5, title: "SQL Practice Questions", type: "PDF", course: "Database Systems", size: "800 KB", uploadedBy: "Dr. Singh", date: "2026-08-10", category: "Practice" },
  { id: 6, title: "Previous Year Papers - AI", type: "PDF", course: "Artificial Intelligence", size: "5.2 MB", uploadedBy: "Dr. Sharma", date: "2026-08-08", category: "Papers" },
];

export const collaborationGroups = [
  { id: 1, name: "AI Study Group", members: 8, lastActive: "10 min ago", avatar: "🤖", unread: 3 },
  { id: 2, name: "ML Project Team", members: 4, lastActive: "1 hour ago", avatar: "📊", unread: 0 },
  { id: 3, name: "Hackathon Squad", members: 5, lastActive: "3 hours ago", avatar: "💻", unread: 7 },
  { id: 4, name: "CN Lab Partners", members: 3, lastActive: "1 day ago", avatar: "🌐", unread: 1 },
];

export const discussionThreads = [
  { id: 1, title: "Backpropagation doubt - AI", author: "Rahul M.", replies: 12, lastReply: "30 min ago", resolved: false },
  { id: 2, title: "Best resources for CNN?", author: "Priya S.", replies: 8, lastReply: "2 hours ago", resolved: true },
  { id: 3, title: "Mid-sem prep strategy", author: "Amit K.", replies: 23, lastReply: "5 hours ago", resolved: false },
];

export const campusBuildings = [
  { id: 1, name: "Main Academic Block", code: "MAB", floors: 4, facilities: ["Lecture Halls", "Faculty Offices", "Seminar Rooms"], icon: "Building2" },
  { id: 2, name: "Science & Technology Center", code: "STC", floors: 3, facilities: ["Computer Labs", "Research Labs", "Project Rooms"], icon: "FlaskConical" },
  { id: 3, name: "Central Library", code: "LIB", floors: 3, facilities: ["Reading Hall", "Digital Library", "Discussion Rooms"], icon: "Library" },
  { id: 4, name: "Student Activity Center", code: "SAC", floors: 2, facilities: ["Auditorium", "Club Rooms", "Cafeteria"], icon: "Users" },
  { id: 5, name: "Sports Complex", code: "SC", floors: 1, facilities: ["Gymnasium", "Indoor Courts", "Swimming Pool"], icon: "Dumbbell" },
  { id: 6, name: "Administrative Building", code: "ADMIN", floors: 3, facilities: ["Registrar Office", "Finance", "Dean's Office"], icon: "Landmark" },
];

export const aiChatMessages = [
  { id: 1, role: "assistant", content: "Hello! I'm your CampusCopilot AI assistant. How can I help you today?" },
  { id: 2, role: "user", content: "What classes do I have tomorrow?" },
  { id: 3, role: "assistant", content: "Based on your timetable, tomorrow you have:\n\n• 9:00 - 10:00: Software Engineering (LH-204)\n• 10:00 - 11:00: Database Systems (LH-103)\n• 11:30 - 12:30: Numerical Methods (LH-401)\n• 2:00 - 4:00: ML Lab (Lab-5)\n\nWould you like me to set reminders for any of these?" },
];

export const aiSuggestedPrompts = [
  "What's my attendance percentage?",
  "Show my upcoming assignments",
  "When is my next exam?",
  "Suggest study resources for AI",
];

export const performanceData = {
  overallScore: 85,
  studyHours: { daily: 4.5, weekly: 28 },
  subjectScores: [
    { subject: "AI", score: 92 },
    { subject: "ML", score: 88 },
    { subject: "CN", score: 85 },
    { subject: "SE", score: 78 },
    { subject: "DBMS", score: 82 },
    { subject: "NM", score: 80 },
  ],
  weeklyStudy: [
    { day: "Mon", hours: 5 },
    { day: "Tue", hours: 4 },
    { day: "Wed", hours: 6 },
    { day: "Thu", hours: 3 },
    { day: "Fri", hours: 4.5 },
    { day: "Sat", hours: 3.5 },
    { day: "Sun", hours: 2 },
  ],
  strengths: ["Problem Solving", "Algorithm Design", "Data Analysis"],
  improvements: ["Time Management", "Numerical Methods", "Report Writing"],
};

// Admin data
export const adminStats = {
  totalStudents: 847,
  totalFaculty: 32,
  totalCourses: 14,
  totalDepartments: 6,
};

export const allStudents = [
  { id: "STU-2024-001", name: "Arghya Das", department: "CSE", semester: 6, gpa: 8.7, status: "Active", email: "arghya.das@university.edu", phone: "+91 98765 43210" },
  { id: "STU-2024-002", name: "Priya Sharma", department: "CSE", semester: 6, gpa: 9.1, status: "Active", email: "priya.s@university.edu", phone: "+91 98765 43211" },
  { id: "STU-2024-003", name: "Rahul Mehta", department: "ECE", semester: 4, gpa: 7.8, status: "Active", email: "rahul.m@university.edu", phone: "+91 98765 43212" },
  { id: "STU-2024-004", name: "Anjali Patel", department: "CSE", semester: 6, gpa: 8.5, status: "Active", email: "anjali.p@university.edu", phone: "+91 98765 43213" },
  { id: "STU-2024-005", name: "Vikram Singh", department: "ME", semester: 2, gpa: 7.2, status: "Inactive", email: "vikram.s@university.edu", phone: "+91 98765 43214" },
];
