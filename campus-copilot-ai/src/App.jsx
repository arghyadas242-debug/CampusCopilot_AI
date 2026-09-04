import {
  Routes,
  Route,
} from "react-router";


// =====================================================
// ROUTE PROTECTION
// =====================================================

import ProtectedRoute from "./components/auth/ProtectedRoute";


// =====================================================
// PUBLIC PAGES
// =====================================================

import LandingPage from "./pages/student/LandingPage";

import LoginPage from "./pages/auth/LoginPage";

import RegisterPage from "./pages/auth/RegisterPage";

import ForgotPassword from "./pages/auth/ForgotPassword";


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
// STUDENT ROUTE WRAPPER
// =====================================================

function StudentRoute({
  children,
}) {
  return (
    <ProtectedRoute
      allowedRoles={[
        "student",
      ]}
    >
      {children}
    </ProtectedRoute>
  );
}


// =====================================================
// ADMIN ROUTE WRAPPER
// =====================================================

function AdminRoute({
  children,
}) {
  return (
    <ProtectedRoute
      allowedRoles={[
        "admin",
      ]}
    >
      {children}
    </ProtectedRoute>
  );
}


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


        <Route
          path="/forgot-password"
          element={
            <ForgotPassword />
          }
        />


        {/* =================================================
            PUBLIC DIGITAL STUDENT ID VERIFICATION

            IMPORTANT:
            THIS MUST REMAIN PUBLIC.
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
            <StudentRoute>
              <DashboardPage />
            </StudentRoute>
          }
        />


        <Route
          path="/notifications"
          element={
            <StudentRoute>
              <NotificationsPage />
            </StudentRoute>
          }
        />


        <Route
          path="/ai-chat"
          element={
            <StudentRoute>
              <AIChatPage />
            </StudentRoute>
          }
        />


        <Route
          path="/notices"
          element={
            <StudentRoute>
              <NoticesPage />
            </StudentRoute>
          }
        />


        <Route
          path="/notices/:id"
          element={
            <StudentRoute>
              <NoticesPage />
            </StudentRoute>
          }
        />


        <Route
          path="/notice-details"
          element={
            <StudentRoute>
              <NoticesPage />
            </StudentRoute>
          }
        />


        <Route
          path="/campus"
          element={
            <StudentRoute>
              <CampusPage />
            </StudentRoute>
          }
        />


        <Route
          path="/attendance"
          element={
            <StudentRoute>
              <AttendancePage />
            </StudentRoute>
          }
        />


        <Route
          path="/timetable"
          element={
            <StudentRoute>
              <TimetablePage />
            </StudentRoute>
          }
        />


        <Route
          path="/assignments"
          element={
            <StudentRoute>
              <AssignmentsPage />
            </StudentRoute>
          }
        />


        <Route
          path="/exams"
          element={
            <StudentRoute>
              <ExamsPage />
            </StudentRoute>
          }
        />


        <Route
          path="/collaboration"
          element={
            <StudentRoute>
              <CollaborationPage />
            </StudentRoute>
          }
        />


        <Route
          path="/profile"
          element={
            <StudentRoute>
              <ProfilePage />
            </StudentRoute>
          }
        />


        <Route
          path="/ai-analytics"
          element={
            <StudentRoute>
              <AIAnalyticsPage />
            </StudentRoute>
          }
        />


        <Route
          path="/resources"
          element={
            <StudentRoute>
              <ResourceHubPage />
            </StudentRoute>
          }
        />


        <Route
          path="/student-id"
          element={
            <StudentRoute>
              <StudentIDPage />
            </StudentRoute>
          }
        />


        {/* =================================================
            ADMIN PORTAL
        ================================================== */}

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />


        <Route
          path="/admin/attendance"
          element={
            <AdminRoute>
              <UpdateAttendance />
            </AdminRoute>
          }
        />


        <Route
          path="/admin/students"
          element={
            <AdminRoute>
              <UpdateStudent />
            </AdminRoute>
          }
        />


        <Route
          path="/admin/assignments"
          element={
            <AdminRoute>
              <AssignmentManagement />
            </AdminRoute>
          }
        />


        <Route
          path="/admin/subjects"
          element={
            <AdminRoute>
              <SubjectManagement />
            </AdminRoute>
          }
        />


        <Route
          path="/admin/timetable"
          element={
            <AdminRoute>
              <TimetableManagement />
            </AdminRoute>
          }
        />


        <Route
          path="/admin/notices"
          element={
            <AdminRoute>
              <NoticeManagement />
            </AdminRoute>
          }
        />


        <Route
          path="/admin/exams"
          element={
            <AdminRoute>
              <ExamManagement />
            </AdminRoute>
          }
        />


        <Route
          path="/admin/resources"
          element={
            <AdminRoute>
              <ResourceManagement />
            </AdminRoute>
          }
        />

      </Routes>
    </div>
  );
}


export default App;