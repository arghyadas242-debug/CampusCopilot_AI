import { Routes, Route } from "react-router";
import LandingPage from "./pages/student/LandingPage";
import LoginPage from "./pages/student/LoginPage";
import RegisterPage from "./pages/student/RegisterPage";
import DashboardPage from "./pages/student/DashboardPage";
import AIChatPage from "./pages/student/AIChatPage";
import CampusPage from "./pages/student/CampusPage";
import AttendancePage from "./pages/student/AttendancePage";
import TimetablePage from "./pages/student/TimetablePage";
import AssignmentsPage from "./pages/student/AssignmentsPage";
import ExamsPage from "./pages/student/ExamsPage";
import CollaborationPage from "./pages/student/CollaborationPage";
import ProfilePage from "./pages/student/ProfilePage";
import AIAnalyticsPage from "./pages/student/AIAnalyticsPage";
import ResourceHubPage from "./pages/student/ResourceHubPage";
import StudentIDPage from "./pages/student/StudentIDPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UpdateAttendance from "./pages/admin/UpdateAttendance";
import UpdateStudent from "./pages/admin/UpdateStudent";

function App() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student Portal */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/ai-chat" element={<AIChatPage />} />
        <Route path="/campus" element={<CampusPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/collaboration" element={<CollaborationPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/ai-analytics" element={<AIAnalyticsPage />} />
        <Route path="/resources" element={<ResourceHubPage />} />
        <Route path="/student-id" element={<StudentIDPage />} />

        {/* Admin Portal */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/attendance" element={<UpdateAttendance />} />
        <Route path="/admin/students" element={<UpdateStudent />} />
      </Routes>
    </div>
  );
}

export default App;