import { Link } from "react-router";

export default function AdminDashboard() {
  const stats = [
    { label: "Total Students", value: "847", icon: "group", color: "text-secondary" },
    { label: "Total Subjects", value: "32", icon: "book", color: "text-primary" },
    { label: "Active Assignments", value: "14", icon: "assignment", color: "text-tertiary" },
    { label: "Published Notices", value: "48", icon: "campaign", color: "text-secondary" },
  ];

  const recentStudents = [
    { name: "Ratul Das", id: "2026-CS-0042", dept: "Computer Science", attendance: "81%" },
    { name: "Priya Sharma", id: "2026-CS-0043", dept: "Computer Science", attendance: "89%" },
    { name: "Ananya Roy", id: "2026-EE-0012", dept: "Electrical Eng.", attendance: "74%" },
    { name: "Vikram Mehta", id: "2026-ME-0021", dept: "Mechanical Eng.", attendance: "85%" },
  ];

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">
      {/* Admin Top App Bar */}
      <header className="sticky top-0 w-full z-40 bg-surface border-b border-surface-container-high">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm w-full max-w-[1440px] mx-auto">
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-base shadow-sm">
              <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">Campus Admin Console</h1>
            </div>
          </div>

          <div className="flex items-center gap-sm">
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
              <Link to="/dashboard" className="font-body-md text-secondary font-semibold hover:underline px-3 py-1.5">
                Student View
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop pt-6 flex flex-col gap-6">
        {/* Platform Overview Metrics */}
        <section>
          <h2 className="font-title-md font-bold text-on-surface mb-3">Platform Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/70 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                  <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
                  <span className="font-label-caps text-xs uppercase tracking-wider text-outline">{stat.label}</span>
                </div>
                <div className="font-display-lg text-primary font-bold text-3xl md:text-4xl">{stat.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Administrative Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/attendance"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-xl hover:border-primary transition-all shadow-sm flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">fact_check</span>
            </div>
            <div>
              <h3 className="font-title-md font-bold text-on-surface">Update Batch Attendance</h3>
              <p className="font-body-sm text-on-surface-variant text-xs mt-1">Mark absent/present by department, semester, and section.</p>
            </div>
          </Link>

          <Link
            to="/admin/students"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-xl hover:border-primary transition-all shadow-sm flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">manage_accounts</span>
            </div>
            <div>
              <h3 className="font-title-md font-bold text-on-surface">Manage Student Records</h3>
              <p className="font-body-sm text-on-surface-variant text-xs mt-1">Edit roll numbers, section allocations, and fee statuses.</p>
            </div>
          </Link>

          <Link
            to="/campus"
            className="p-5 bg-surface-container-lowest border border-outline-variant/70 rounded-xl hover:border-primary transition-all shadow-sm flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">campaign</span>
            </div>
            <div>
              <h3 className="font-title-md font-bold text-on-surface">Broadcast Campus Notice</h3>
              <p className="font-body-sm text-on-surface-variant text-xs mt-1">Publish circulars with automatic AI TL;DR synthesis.</p>
            </div>
          </Link>
        </section>

        {/* Recently Enrolled Students Table */}
        <section className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/70 shadow-sm">
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
                  <th className="py-2.5 px-3">Attendance</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {recentStudents.map((st, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-3 font-semibold text-on-surface">{st.name}</td>
                    <td className="py-3 px-3 font-mono-sm text-xs text-outline">{st.id}</td>
                    <td className="py-3 px-3 text-on-surface-variant">{st.dept}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${parseInt(st.attendance) >= 75 ? "bg-secondary-container text-on-secondary-container" : "bg-error-container text-on-error-container"}`}>
                        {st.attendance}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link to="/admin/students" className="text-primary hover:underline font-semibold text-xs">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

