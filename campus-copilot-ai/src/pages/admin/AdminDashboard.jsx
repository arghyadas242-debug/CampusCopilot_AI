import { useEffect, useState } from "react";
import { Link } from "react-router";

const API_URL = "http://localhost:5000";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSubjects: 0,
    activeAssignments: 0,
    publishedNotices: 0,
  });

  const [recentStudents, setRecentStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAdminDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/admin/dashboard`
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load admin dashboard"
          );
        }

        const data = await response.json();

        setStats({
          totalStudents:
            Number(data.stats?.TOTAL_STUDENTS) || 0,

          totalSubjects:
            Number(data.stats?.TOTAL_SUBJECTS) || 0,

          activeAssignments:
            Number(data.stats?.ACTIVE_ASSIGNMENTS) || 0,

          publishedNotices:
            Number(data.stats?.PUBLISHED_NOTICES) || 0,
        });

        setRecentStudents(
          Array.isArray(data.recentStudents)
            ? data.recentStudents
            : []
        );
      } catch (err) {
        console.error(
          "Admin dashboard loading error:",
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
      <header className="sticky top-0 w-full z-40 bg-surface border-b border-surface-container-high">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm w-full max-w-[1440px] mx-auto">

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
              to="/dashboard"
              className="font-body-md text-secondary font-semibold hover:underline px-3 py-1.5"
            >
              Student View
            </Link>

          </nav>

        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop pt-6 flex flex-col gap-6">

        {/* Error */}
        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Platform Overview */}
        <section>

          <h2 className="font-title-md font-bold text-on-surface mb-3">
            Platform Overview
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/70 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
              >

                <div className="flex items-center gap-2 mb-2 text-on-surface-variant">

                  <span
                    className={`material-symbols-outlined ${stat.color}`}
                  >
                    {stat.icon}
                  </span>

                  <span className="font-label-caps text-xs uppercase tracking-wider text-outline">
                    {stat.label}
                  </span>

                </div>

                <div className="font-display-lg text-primary font-bold text-3xl md:text-4xl">

                  {loading
                    ? "--"
                    : stat.value}

                </div>

              </div>
            ))}

          </div>

        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Link
            to="/admin/attendance"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-xl hover:border-primary transition-all shadow-sm flex items-start gap-4"
          >

            <div className="w-12 h-12 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">

              <span className="material-symbols-outlined text-2xl">
                fact_check
              </span>

            </div>

            <div>

              <h3 className="font-title-md font-bold text-on-surface">
                Update Batch Attendance
              </h3>

              <p className="font-body-sm text-on-surface-variant text-xs mt-1">
                Manage student attendance records by
                subject.
              </p>

            </div>

          </Link>

          <Link
            to="/admin/students"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-xl hover:border-primary transition-all shadow-sm flex items-start gap-4"
          >

            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">

              <span className="material-symbols-outlined text-2xl">
                manage_accounts
              </span>

            </div>

            <div>

              <h3 className="font-title-md font-bold text-on-surface">
                Manage Student Records
              </h3>

              <p className="font-body-sm text-on-surface-variant text-xs mt-1">
                Add, edit, and manage student academic
                profiles.
              </p>

            </div>

          </Link>

          <Link
            to="/notices"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-xl hover:border-primary transition-all shadow-sm flex items-start gap-4"
          >

            <div className="w-12 h-12 rounded-xl bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0">

              <span className="material-symbols-outlined text-2xl">
                campaign
              </span>

            </div>

            <div>

              <h3 className="font-title-md font-bold text-on-surface">
                Broadcast Campus Notice
              </h3>

              <p className="font-body-sm text-on-surface-variant text-xs mt-1">
                Publish campus notices and AI-generated
                summaries.
              </p>

            </div>

          </Link>

        </section>

        {/* Student Table */}
        <section className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/70 shadow-sm">

          <div className="flex justify-between items-center mb-4">

            <h3 className="font-title-md font-bold text-on-surface">
              Student Activity & Compliance
            </h3>

            <Link
              to="/admin/students"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View All Students
            </Link>

          </div>

          {loading ? (
            <p className="text-on-surface-variant py-5">
              Loading students...
            </p>
          ) : recentStudents.length === 0 ? (
            <p className="text-on-surface-variant py-5">
              No students found.
            </p>
          ) : (
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

                  {recentStudents.map((student) => {
                    const attendance =
                      Number(
                        student.ATTENDANCE_PERCENTAGE
                      ) || 0;

                    return (
                      <tr
                        key={student.STUDENT_ID}
                        className="hover:bg-surface-container-low transition-colors"
                      >

                        <td className="py-3 px-3 font-semibold text-on-surface">
                          {student.NAME}
                        </td>

                        <td className="py-3 px-3 font-mono-sm text-xs text-outline">
                          {student.STUDENT_ROLL}
                        </td>

                        <td className="py-3 px-3 text-on-surface-variant">
                          {student.DEPARTMENT ||
                            "Not assigned"}
                        </td>

                        <td className="py-3 px-3 text-on-surface-variant">
                          {student.SEMESTER || "-"}
                          {student.SECTION
                            ? ` / ${student.SECTION}`
                            : ""}
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
                            to={`/admin/students?student=${student.STUDENT_ID}`}
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
          )}

        </section>

      </main>

    </div>
  );
}