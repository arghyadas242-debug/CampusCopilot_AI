import {
  Routes,
  Route,
} from "react-router";


// =====================================================
// PUBLIC PAGES
// =====================================================

import LandingPage from "./pages/student/LandingPage";

import LoginPage from "./pages/student/LoginPage";

import RegisterPage from "./pages/student/RegisterPage";


// =====================================================
// STUDENT PAGES
// =====================================================

import DashboardPage from "./pages/student/DashboardPage";

import AIChatPage from "./pages/student/AIChatPage";

import CampusPage from "./pages/student/CampusPage";

import NoticesPage from "./pages/student/NoticesPage";

import AttendancePage from "./pages/student/AttendancePage";

import TimetablePage from "./pages/student/TimetablePage";

import AssignmentsPage from "./pages/student/AssignmentsPage";

import ExamsPage from "./pages/student/ExamsPage";

import NotificationsPage from "./pages/student/NotificationsPage";

import CollaborationPage from "./pages/student/CollaborationPage";

import ProfilePage from "./pages/student/ProfilePage";

import AIAnalyticsPage from "./pages/student/AIAnalyticsPage";

import ResourceHubPage from "./pages/student/ResourceHubPage";

import StudentIDPage from "./pages/student/StudentIDPage";


// =====================================================
// PUBLIC STUDENT VERIFICATION PAGE
// =====================================================

import VerifyStudentPage from "./pages/public/VerifyStudentPage";


// =====================================================
// ADMIN PAGES
// =====================================================

import AdminDashboard from "./pages/admin/AdminDashboard";

import UpdateAttendance from "./pages/admin/UpdateAttendance";

import UpdateStudent from "./pages/admin/UpdateStudent";

import AssignmentManagement from "./pages/admin/AssignmentManagement";

import SubjectManagement from "./pages/admin/SubjectManagement";

import ExamManagement from "./pages/admin/ExamManagement";

import TimetableManagement from "./pages/admin/TimetableManagement";

import ResourceManagement from "./pages/admin/ResourceManagement";

import NoticeManagement from "./pages/admin/NoticeManagement";


// =====================================================
// APP
// =====================================================

function App() {
  return (
    <div
      className="
        min-h-screen
        bg-background
        text-on-background
      "
    >

      <Routes>

        {/* =================================================
            PUBLIC ROUTES
        ================================================== */}

        <Route
          path="/"
          element={
            <LandingPage />
          }
        />


        <Route
          path="/login"
          element={
            <LoginPage />
          }
        />


        <Route
          path="/register"
          element={
            <RegisterPage />
          }
        />


        {/* =================================================
            PUBLIC DIGITAL ID VERIFICATION

            IMPORTANT:
            This route must remain public.

            Someone scanning a student's QR code
            should NOT need to log in.
        ================================================== */}

        <Route
          path="/verify-student/:token"
          element={
            <VerifyStudentPage />
          }
        />


        {/* =================================================
            STUDENT PORTAL
        ================================================== */}

        <Route
          path="/dashboard"
          element={
            <DashboardPage />
          }
        />


        <Route
          path="/notifications"
          element={
            <NotificationsPage />
          }
        />


        <Route
          path="/ai-chat"
          element={
            <AIChatPage />
          }
        />


        <Route
          path="/notices"
          element={
            <NoticesPage />
          }
        />


        <Route
          path="/notices/:id"
          element={
            <NoticesPage />
          }
        />


        <Route
          path="/notice-details"
          element={
            <NoticesPage />
          }
        />


        <Route
          path="/campus"
          element={
            <CampusPage />
          }
        />


        <Route
          path="/attendance"
          element={
            <AttendancePage />
          }
        />


        <Route
          path="/timetable"
          element={
            <TimetablePage />
          }
        />


        <Route
          path="/assignments"
          element={
            <AssignmentsPage />
          }
        />


        <Route
          path="/exams"
          element={
            <ExamsPage />
          }
        />


        <Route
          path="/collaboration"
          element={
            <CollaborationPage />
          }
        />


        <Route
          path="/profile"
          element={
            <ProfilePage />
          }
        />


        <Route
          path="/ai-analytics"
          element={
            <AIAnalyticsPage />
          }
        />


        <Route
          path="/resources"
          element={
            <ResourceHubPage />
          }
        />


        <Route
          path="/student-id"
          element={
            <StudentIDPage />
          }
        />


        {/* =================================================
            ADMIN PORTAL
        ================================================== */}

        <Route
          path="/admin"
          element={
            <AdminDashboard />
          }
        />


        <Route
          path="/admin/attendance"
          element={
            <UpdateAttendance />
          }
        />


        <Route
          path="/admin/students"
          element={
            <UpdateStudent />
          }
        />


        <Route
          path="/admin/assignments"
          element={
            <AssignmentManagement />
          }
        />


        <Route
          path="/admin/subjects"
          element={
            <SubjectManagement />
          }
        />


        <Route
          path="/admin/timetable"
          element={
            <TimetableManagement />
          }
        />


        <Route
          path="/admin/notices"
          element={
            <NoticeManagement />
          }
        />


        <Route
          path="/admin/exams"
          element={
            <ExamManagement />
          }
        />


        <Route
          path="/admin/resources"
          element={
            <ResourceManagement />
          }
        />

      </Routes>

    </div>
  );
}


export default App;