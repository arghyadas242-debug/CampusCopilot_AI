import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { authService } from "../../services/api";
import AdminSidebar from "../../components/admin/AdminSidebar";

const API_URL = "http://localhost:5000";

const getStudentManagementPath = (student) => {
  const studentRoll = student.STUDENT_ROLL;

  return studentRoll
    ? `/admin/students?student=${encodeURIComponent(
        studentRoll
      )}`
    : "/admin/students";
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalStudents: null,
    totalSubjects: null,
    activeAssignments: null,
    publishedNotices: null,
  });

  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD ADMIN DASHBOARD DATA
  // =====================================================

  useEffect(() => {
    async function loadAdminDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/admin/dashboard`
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => null);

          throw new Error(
            errorData?.error ||
              "Unable to load admin dashboard data."
          );
        }

        const data = await response.json();

        const apiStats = data?.stats || {};

        setStats({
          totalStudents: Number(
            apiStats.TOTAL_STUDENTS ??
              apiStats.total_students ??
              0
          ),

          totalSubjects: Number(
            apiStats.TOTAL_SUBJECTS ??
              apiStats.total_subjects ??
              0
          ),

          activeAssignments: Number(
            apiStats.ACTIVE_ASSIGNMENTS ??
              apiStats.active_assignments ??
              0
          ),

          publishedNotices: Number(
            apiStats.PUBLISHED_NOTICES ??
              apiStats.published_notices ??
              0
          ),
        });

        setRecentStudents(
          Array.isArray(data?.recentStudents)
            ? data.recentStudents
            : []
        );
      } catch (err) {
        console.error(
          "Admin dashboard error:",
          err
        );

        setError(
          err.message ||
            "Unable to load admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAdminDashboard();
  }, []);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  // =====================================================
  // STAT CARDS
  // =====================================================

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      icon: "group",
      color: "text-secondary",
      path: "/admin/students",
    },
    {
      label: "Total Subjects",
      value: stats.totalSubjects,
      icon: "book",
      color: "text-primary",
      path: "/admin/subjects",
    },
    {
      label: "Active Assignments",
      value: stats.activeAssignments,
      icon: "assignment",
      color: "text-tertiary",
      path: "/admin/assignments",
    },
    {
      label: "Published Notices",
      value: stats.publishedNotices,
      icon: "campaign",
      color: "text-secondary",
      path: "/admin/notices",
    },
  ];

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">

      <AdminSidebar />

      <main className="md:ml-[280px] min-h-screen flex flex-col">

      {/* =================================================
          ADMIN TOP BAR
      ================================================= */}

      <header className="sticky top-0 w-full z-40 bg-surface border-b border-surface-container-high shadow-xs">

        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm w-full max-w-[1440px] mx-auto">

          {/* Logo */}

          <div className="flex items-center gap-sm">

            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-base shadow-sm">
              <span className="material-symbols-outlined text-[24px]">
                admin_panel_settings
              </span>
            </div>

            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
                Campus Admin Console
              </h1>
            </div>

          </div>

          {/* Navigation */}

          <nav className="hidden md:flex items-center gap-sm mr-4">

            <Link
              to="/admin"
              className="font-body-md text-primary font-bold px-3 py-1.5 rounded-lg bg-primary/10"
            >
              Dashboard
            </Link>

            <Link
              to="/admin/students"
              className="font-body-md text-on-surface-variant hover:text-primary px-3 py-1.5"
            >
              Students
            </Link>

            <Link
              to="/admin/attendance"
              className="font-body-md text-on-surface-variant hover:text-primary px-3 py-1.5"
            >
              Attendance
            </Link>

            <Link
              to="/admin/notices"
              className="font-body-md text-on-surface-variant hover:text-primary px-3 py-1.5"
            >
              Notices
            </Link>

            <button
              onClick={handleLogout}
              className="font-body-md text-error hover:bg-error-container/20 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ml-2 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                logout
              </span>

              Logout
            </button>

          </nav>

        </div>

      </header>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div className="max-w-[1440px] mx-auto w-full px-margin-mobile md:px-margin-desktop pt-md flex flex-col gap-lg">

        {/* ===============================================
            BANNER
        =============================================== */}

        <div className="bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

          <div>

            <h2 className="text-xl md:text-2xl font-bold">
              University Operations Overview
            </h2>

            <p className="text-on-primary/80 text-sm mt-1">
              Manage student records, attendance,
              assignments and campus notices.
            </p>

          </div>

          <div className="flex gap-2">

            <Link
              to="/admin/attendance"
              className="px-4 py-2 bg-on-primary text-primary font-semibold text-xs rounded-xl hover:opacity-90 transition-opacity shadow-sm"
            >
              Update Attendance
            </Link>

            <Link
              to="/admin/notices"
              className="px-4 py-2 bg-primary-container/40 text-on-primary border border-on-primary/30 font-semibold text-xs rounded-xl hover:bg-primary-container/60 transition-colors"
            >
              View Notices
            </Link>

          </div>

        </div>

        {/* ===============================================
            API ERROR MESSAGE
        =============================================== */}

        {error && (
          <div className="bg-error-container/40 border border-error/30 text-error rounded-xl px-4 py-3 flex items-start gap-2">

            <span className="material-symbols-outlined">
              warning
            </span>

            <div>

              <p className="font-semibold">
                Some admin data could not be loaded.
              </p>

              <p className="text-xs mt-1">
                {error}
              </p>

            </div>

          </div>
        )}

        {/* ===============================================
            QUICK STATS
        =============================================== */}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {statCards.map((stat) => (

            <Link
              key={stat.label}
              to={stat.path}
              className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >

              <div className="flex justify-between items-center mb-2">

                <span className="text-xs font-bold text-outline uppercase tracking-wider">
                  {stat.label}
                </span>

                <span
                  className={`material-symbols-outlined ${stat.color} text-[22px]`}
                >
                  {stat.icon}
                </span>

              </div>

              <div className="text-2xl md:text-3xl font-bold text-on-surface">

                {loading || stat.value === null
                  ? "--"
                  : stat.value}

              </div>

            </Link>
          ))}

        </section>

        {/* ===============================================
            QUICK ADMIN ACTIONS
        =============================================== */}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Attendance */}

          <Link
            to="/admin/attendance"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-2xl hover:border-primary transition-all shadow-sm flex items-start gap-4 group"
          >

            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">

              <span className="material-symbols-outlined text-2xl">
                fact_check
              </span>

            </div>

            <div>

              <h3 className="font-title-md font-bold text-on-surface group-hover:text-primary transition-colors">
                Batch Attendance Manager
              </h3>

              <p className="font-body-sm text-on-surface-variant text-xs mt-1">
                Update and manage student attendance
                records.
              </p>

            </div>

          </Link>

          {/* Students */}

          <Link
            to="/admin/students"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-2xl hover:border-primary transition-all shadow-sm flex items-start gap-4 group"
          >

            <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">

              <span className="material-symbols-outlined text-2xl">
                manage_accounts
              </span>

            </div>

            <div>

              <h3 className="font-title-md font-bold text-on-surface group-hover:text-primary transition-colors">
                Manage Student Records
              </h3>

              <p className="font-body-sm text-on-surface-variant text-xs mt-1">
                Add, edit and manage student academic
                records.
              </p>

            </div>

          </Link>

          {/* Notices */}

          <Link
            to="/admin/notices"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-2xl hover:border-primary transition-all shadow-sm flex items-start gap-4 group"
          >

            <div className="w-12 h-12 rounded-xl bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0">

              <span className="material-symbols-outlined text-2xl">
                campaign
              </span>

            </div>

            <div>

              <h3 className="font-title-md font-bold text-on-surface group-hover:text-primary transition-colors">
                Campus Notices
              </h3>

              <p className="font-body-sm text-on-surface-variant text-xs mt-1">
                Review published campus notices and
                announcements.
              </p>

            </div>

          </Link>

        </section>

        {/* ===============================================
            STUDENT ACTIVITY TABLE
        =============================================== */}

        <section className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/70 shadow-sm">

          <div className="flex justify-between items-center mb-4">

            <div>

              <h3 className="font-title-md font-bold text-on-surface">
                Student Activity & Compliance
              </h3>

              <p className="text-xs text-on-surface-variant mt-1">
                Recent students and their overall
                attendance.
              </p>

            </div>

            <Link
              to="/admin/students"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View All Students
            </Link>

          </div>

          {/* Loading */}

          {loading ? (

            <div className="py-10 text-center">

              <span className="material-symbols-outlined text-3xl text-primary">
                progress_activity
              </span>

              <p className="text-sm text-on-surface-variant mt-2">
                Loading student records...
              </p>

            </div>

          ) : recentStudents.length === 0 ? (

            /* Empty State */

            <div className="py-10 text-center">

              <span className="material-symbols-outlined text-4xl text-outline">
                group_off
              </span>

              <p className="font-semibold text-on-surface mt-2">
                No students found
              </p>

              <p className="text-xs text-on-surface-variant mt-1">
                Student records will appear here once
                available.
              </p>

            </div>

          ) : (

            /* Table */

            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm border-collapse">

                <thead>

                  <tr className="border-b border-surface-variant text-outline font-label-caps text-xs uppercase">

                    <th className="py-2.5 px-3">
                      Student
                    </th>

                    <th className="py-2.5 px-3">
                      Roll ID
                    </th>

                    <th className="py-2.5 px-3">
                      Department
                    </th>

                    <th className="py-2.5 px-3">
                      Semester
                    </th>

                    <th className="py-2.5 px-3">
                      Attendance
                    </th>

                    <th className="py-2.5 px-3 text-right">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-surface-variant">

                  {recentStudents.map(
                    (student, index) => {

                      const attendance =
                        Number(
                          student.ATTENDANCE_PERCENTAGE
                        ) || 0;

                      return (

                        <tr
                          key={
                            student.STUDENT_ID ||
                            student.STUDENT_ROLL ||
                            index
                          }
                          onClick={() =>
                            navigate(
                              getStudentManagementPath(
                                student
                              )
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.target ===
                                event.currentTarget &&
                              (event.key === "Enter" ||
                                event.key === " ")
                            ) {
                              event.preventDefault();
                              navigate(
                                getStudentManagementPath(
                                  student
                                )
                              );
                            }
                          }}
                          tabIndex={0}
                          className="hover:bg-surface-container-low transition-colors cursor-pointer"
                        >

                          {/* Student Name */}

                          <td className="py-3 px-3 font-semibold text-on-surface">
                            {student.NAME ||
                              "Unknown Student"}
                          </td>

                          {/* Roll */}

                          <td className="py-3 px-3 font-mono-sm text-xs text-outline">
                            {student.STUDENT_ROLL ||
                              "-"}
                          </td>

                          {/* Department */}

                          <td className="py-3 px-3 text-on-surface-variant">
                            {student.DEPARTMENT ||
                              "Not assigned"}
                          </td>

                          {/* Semester */}

                          <td className="py-3 px-3 text-on-surface-variant">

                            {student.SEMESTER ||
                              "-"}

                            {student.SECTION
                              ? ` / ${student.SECTION}`
                              : ""}

                          </td>

                          {/* Attendance */}

                          <td className="py-3 px-3">

                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                attendance >= 75
                                  ? "bg-secondary-container text-on-secondary-container"
                                  : "bg-error-container text-on-error-container"
                              }`}
                            >
                              {attendance}%
                            </span>

                          </td>

                          {/* Edit */}

                          <td className="py-3 px-3 text-right">

                            <Link
                              to={getStudentManagementPath(
                                student
                              )}
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                              className="text-primary hover:underline font-semibold text-xs"
                            >
                              Edit
                            </Link>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>

      {/* =================================================
          MOBILE ADMIN NAVIGATION
      ================================================= */}

      <nav className="fixed md:hidden bottom-0 left-0 right-0 h-[64px] bg-surface border-t border-surface-container-high flex justify-around items-center z-50">

        <Link
          to="/admin"
          className="flex flex-col items-center text-primary"
        >
          <span className="material-symbols-outlined">
            dashboard
          </span>
          <span className="text-[10px]">
            Dashboard
          </span>
        </Link>

        <Link
          to="/admin/students"
          className="flex flex-col items-center text-on-surface-variant"
        >
          <span className="material-symbols-outlined">
            group
          </span>
          <span className="text-[10px]">
            Students
          </span>
        </Link>

        <Link
          to="/admin/attendance"
          className="flex flex-col items-center text-on-surface-variant"
        >
          <span className="material-symbols-outlined">
            fact_check
          </span>
          <span className="text-[10px]">
            Attendance
          </span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center text-error"
        >
          <span className="material-symbols-outlined">
            logout
          </span>
          <span className="text-[10px]">
            Logout
          </span>
        </button>

      </nav>

      </main>

    </div>
  );
}
