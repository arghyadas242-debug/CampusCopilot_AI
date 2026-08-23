import { useState } from "react";
import { Link } from "react-router";

export default function UpdateAttendance() {
  const [selectedSubject, setSelectedSubject] = useState("DBMS");
  const [selectedSection, setSelectedSection] = useState("Section A");

  const [studentList, setStudentList] = useState([
    { id: "2026-CS-0041", name: "Aarav Sharma", status: "present" },
    { id: "2026-CS-0042", name: "Ratul Das", status: "present" },
    { id: "2026-CS-0043", name: "Priya Sharma", status: "present" },
    { id: "2026-CS-0044", name: "Rohan Varma", status: "absent" },
    { id: "2026-CS-0045", name: "Sneha Patel", status: "present" },
    { id: "2026-CS-0046", name: "Tanmay Ghosh", status: "present" },
  ]);

  const [isSaved, setIsSaved] = useState(false);

  const toggleStatus = (id) => {
    setStudentList((prev) =>
      prev.map((st) =>
        st.id === id ? { ...st, status: st.status === "present" ? "absent" : "present" } : st
      )
    );
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const presentCount = studentList.filter((s) => s.status === "present").length;

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pb-[64px] md:pb-12">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 w-full z-40 bg-surface border-b border-outline-variant shadow-xs">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">Update Attendance</h1>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant text-xs">
            <span className="material-symbols-outlined text-primary text-base">calendar_month</span>
            <span className="font-semibold text-on-surface">Today, Session Active</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] mx-auto w-full p-margin-mobile md:p-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-md md:gap-lg items-start pt-6">
        {/* Sidebar Nav */}
        <nav className="hidden md:flex flex-col py-md bg-surface border border-outline-variant rounded-2xl shadow-sm col-span-3">
          <div className="px-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                AD
              </div>
              <div>
                <div className="font-title-md font-bold text-primary text-sm">Admin Portal</div>
                <div className="font-label-caps text-outline text-xs">Academic Office</div>
              </div>
            </div>
          </div>
          <Link to="/admin" className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high mx-2 px-4 py-2.5 rounded-xl transition-all">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </Link>
          <Link to="/admin/attendance" className="flex items-center gap-3 bg-secondary-container text-on-secondary-container rounded-xl mx-2 px-4 py-2.5 font-bold transition-all">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
            <span>Attendance</span>
          </Link>
          <Link to="/admin/students" className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high mx-2 px-4 py-2.5 rounded-xl transition-all">
            <span className="material-symbols-outlined">groups</span>
            <span>Students</span>
          </Link>
        </nav>

        {/* Content Column */}
        <div className="col-span-1 md:col-span-9 flex flex-col gap-6">
          {/* Filters Card */}
          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">
            <h2 className="font-title-md font-bold text-on-surface mb-4">Session & Course Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-outline text-xs uppercase">Subject</label>
                <select
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="DBMS">Database Management Systems</option>
                  <option value="CN">Computer Networks</option>
                  <option value="OS">Operating Systems</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-outline text-xs uppercase">Section</label>
                <select
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                >
                  <option value="Section A">Section A (CS-5A)</option>
                  <option value="Section B">Section B (CS-5B)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-outline text-xs uppercase">Session Type</label>
                <select className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary">
                  <option>Theory Lecture (1 Hour)</option>
                  <option>Lab Practical (2 Hours)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Student Roster Card */}
          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-surface-variant">
              <div>
                <h3 className="font-title-md font-bold text-on-surface text-lg">Student Roll Call</h3>
                <p className="text-xs text-on-surface-variant">Click student status to toggle Present / Absent.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                  {presentCount} / {studentList.length} Present
                </span>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-surface-variant">
              {studentList.map((st) => (
                <div key={st.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-on-surface text-sm">{st.name}</div>
                    <div className="font-mono-sm text-xs text-outline">{st.id}</div>
                  </div>

                  <button
                    onClick={() => toggleStatus(st.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                      st.status === "present"
                        ? "bg-secondary text-on-secondary shadow-xs hover:bg-secondary/90"
                        : "bg-error text-on-error shadow-xs hover:bg-error/90"
                    }`}
                  >
                    {st.status}
                  </button>
                </div>
              ))}
            </div>

            {isSaved && (
              <div className="mt-4 p-3 bg-secondary-container text-on-secondary-container rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Attendance synced successfully to student records and AI analytics!
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl hover:bg-primary-container transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                Save & Submit Roster
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
