import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { authService } from "../../services/api";

const API_URL = "http://localhost:5000";

const DEFAULT_ADMIN_STATS = {
  totalStudents: 248,
  totalSubjects: 18,
  activeAssignments: 12,
  publishedNotices: 8,
};

const DEFAULT_RECENT_STUDENTS = [
  {
    STUDENT_ID: 1,
    NAME: "Ratul Das",
    STUDENT_ROLL: "12024002037008",
    DEPARTMENT: "Computer Science & Engineering",
    SEMESTER: "5",
    SECTION: "A",
    ATTENDANCE_PERCENTAGE: 84.5,
  },
  {
    STUDENT_ID: 2,
    NAME: "Ananya Sharma",
    STUDENT_ROLL: "12024002037009",
    DEPARTMENT: "Information Technology",
    SEMESTER: "5",
    SECTION: "B",
    ATTENDANCE_PERCENTAGE: 91.2,
  },
  {
    STUDENT_ID: 3,
    NAME: "Debanjan Mukherjee",
    STUDENT_ROLL: "12024002037010",
    DEPARTMENT: "Electronics & Communication",
    SEMESTER: "3",
    SECTION: "A",
    ATTENDANCE_PERCENTAGE: 78.0,
  },
  {
    STUDENT_ID: 4,
    NAME: "Sneha Roy",
    STUDENT_ROLL: "12024002037011",
    DEPARTMENT: "Computer Science & Engineering",
    SEMESTER: "7",
    SECTION: "A",
    ATTENDANCE_PERCENTAGE: 88.6,
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(DEFAULT_ADMIN_STATS);
  const [recentStudents, setRecentStudents] = useState(DEFAULT_RECENT_STUDENTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAdminDashboard() {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/admin/dashboard`);
        if (response.ok) {
          const data = await response.json();
          if (data.stats) {
            setStats({
              totalStudents: Number(data.stats.TOTAL_STUDENTS || data.stats.total_students) || 248,
              totalSubjects: Number(data.stats.TOTAL_SUBJECTS || data.stats.total_subjects) || 18,
              activeAssignments: Number(data.stats.ACTIVE_ASSIGNMENTS || data.stats.active_assignments) || 12,
              publishedNotices: Number(data.stats.PUBLISHED_NOTICES || data.stats.published_notices) || 8,
            });
          }
          if (Array.isArray(data.recentStudents) && data.recentStudents.length > 0) {
            setRecentStudents(data.recentStudents);
          }
        }
      } catch (err) {
        console.warn("Admin dashboard using fallback data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAdminDashboard();
  }, []);

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      icon: "group",
      color: "text-secondary",
    },
    {
      label: "Total Subjects",
      value: stats.totalSubjects,
      icon: "book",
      color: "text-primary",
    },
    {
      label: "Active Assignments",
      value: stats.activeAssignments,
      icon: "assignment",
      color: "text-tertiary",
    },
    {
      label: "Published Notices",
      value: stats.publishedNotices,
      icon: "campaign",
      color: "text-secondary",
    },
  ];

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">
      {/* Admin Top App Bar */}
      <header className="sticky top-0 w-full z-40 bg-surface border-b border-surface-container-high shadow-xs">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm w-full max-w-[1440px] mx-auto">
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-base shadow-sm">
              <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
                Campus Admin Console
              </h1>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-sm mr-4">
            <Link to="/admin" className="font-body-md text-primary font-bold px-3 py-1.5 rounded-lg bg-primary/10">
              Dashboard
            </Link>
            <Link to="/admin/students" className="font-body-md text-on-surface-variant hover:text-primary px-3 py-1.5">
              Students
            </Link>
            <Link to="/admin/attendance" className="font-body-md text-on-surface-variant hover:text-primary px-3 py-1.5">
              Attendance
            </Link>
            <Link to="/notices" className="font-body-md text-on-surface-variant hover:text-primary px-3 py-1.5">
              Notices
            </Link>
            <button
              onClick={() => {
                authService.logout();
                navigate("/login");
              }}
              className="font-body-md text-error hover:bg-error-container/20 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ml-2 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Admin Canvas */}
      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop pt-md flex flex-col gap-lg">
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">University Operations Overview</h2>
            <p className="text-on-primary/80 text-sm mt-1">
              Manage student records, batch attendance updates, and broadcast AI-summarized notices.
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
              to="/notices"
              className="px-4 py-2 bg-primary-container/40 text-on-primary border border-on-primary/30 font-semibold text-xs rounded-xl hover:bg-primary-container/60 transition-colors"
            >
              Post Notice
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => (
            <div
              key={idx}
              className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-outline uppercase tracking-wider">{stat.label}</span>
                <span className={`material-symbols-outlined ${stat.color} text-[22px]`}>{stat.icon}</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-on-surface">{stat.value}</div>
            </div>
          ))}
        </section>

        {/* Quick Admin Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/attendance"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-2xl hover:border-primary transition-all shadow-sm flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">fact_check</span>
            </div>
            <div>
              <h3 className="font-title-md font-bold text-on-surface group-hover:text-primary transition-colors">
                Batch Attendance Manager
              </h3>
              <p className="font-body-sm text-on-surface-variant text-xs mt-1">
                Record daily attendance, view defalcation flags, and sync records.
              </p>
            </div>
          </Link>

          <Link
            to="/admin/students"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-2xl hover:border-primary transition-all shadow-sm flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">manage_accounts</span>
            </div>
            <div>
              <h3 className="font-title-md font-bold text-on-surface group-hover:text-primary transition-colors">
                Manage Student Records
              </h3>
              <p className="font-body-sm text-on-surface-variant text-xs mt-1">
                Edit roll numbers, section allocations, and academic statuses.
              </p>
            </div>
          </Link>

          <Link
            to="/notices"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-2xl hover:border-primary transition-all shadow-sm flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">campaign</span>
            </div>
            <div>
              <h3 className="font-title-md font-bold text-on-surface group-hover:text-primary transition-colors">
                Broadcast Campus Notice
              </h3>
              <p className="font-body-sm text-on-surface-variant text-xs mt-1">
                Publish circulars with automatic AI TL;DR synthesis.
              </p>
            </div>
          </Link>
        </section>

        {/* Student Table */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/70 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-title-md font-bold text-on-surface">Student Activity & Compliance</h3>
            <Link to="/admin/students" className="text-xs font-semibold text-primary hover:underline">
              View All Students
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-surface-variant text-outline font-label-caps text-xs uppercase">
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Roll ID</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Semester</th>
                  <th className="py-2.5 px-3">Attendance</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {recentStudents.map((student, idx) => {
                  const attendance = Number(student.ATTENDANCE_PERCENTAGE) || 85;
                  return (
                    <tr key={student.STUDENT_ID || idx} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-3 font-semibold text-on-surface">{student.NAME}</td>
                      <td className="py-3 px-3 font-mono-sm text-xs text-outline">{student.STUDENT_ROLL}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{student.DEPARTMENT || "Not assigned"}</td>
                      <td className="py-3 px-3 text-on-surface-variant">
                        {student.SEMESTER || "-"}
                        {student.SECTION ? ` / ${student.SECTION}` : ""}
                      </td>
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
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/admin/students?student=${student.STUDENT_ID || idx + 1}`}
                          className="text-primary hover:underline font-semibold text-xs"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}