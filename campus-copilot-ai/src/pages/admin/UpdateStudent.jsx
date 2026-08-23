import { useState } from "react";
import { Link } from "react-router";

export default function UpdateStudent() {
  const [searchId, setSearchId] = useState("2026-CS-0042");

  const [studentData, setStudentData] = useState({
    fullName: "Ratul Das",
    rollNumber: "2026-CS-0042",
    email: "ratul.das@campus.edu",
    department: "Computer Science",
    semester: "5",
    section: "A",
    status: "Active",
    phone: "+91 98765 43210",
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (e) => {
    setStudentData({ ...studentData, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased min-h-screen flex flex-col md:flex-row pb-12">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col h-screen w-[280px] fixed left-0 top-0 py-md bg-surface-container-low border-r border-outline-variant/30 z-40">
        <div className="px-md mb-lg flex items-center gap-sm">
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-lg">
            CC
          </div>
          <div>
            <h1 className="font-headline-lg-mobile text-primary font-bold">Admin Portal</h1>
            <p className="font-body-sm text-outline text-xs">Student Management</p>
          </div>
        </div>

        <nav className="flex-1 px-sm space-y-1">
          <Link to="/admin" className="flex items-center gap-3 text-on-surface-variant mx-2 px-4 py-2.5 rounded-xl hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-title-md text-sm">Dashboard</span>
          </Link>
          <Link to="/admin/students" className="flex items-center gap-3 bg-secondary-container text-on-secondary-container mx-2 px-4 py-2.5 rounded-xl font-bold transition-all">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            <span className="font-title-md text-sm">Student Directory</span>
          </Link>
          <Link to="/admin/attendance" className="flex items-center gap-3 text-on-surface-variant mx-2 px-4 py-2.5 rounded-xl hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined">fact_check</span>
            <span className="font-title-md text-sm">Attendance</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-[280px] flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 bg-surface z-30 border-b border-outline-variant/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">Update Student Details</h1>
          </div>
          <Link to="/dashboard" className="text-xs font-semibold text-secondary hover:underline">
            View as Student
          </Link>
        </header>

        <div className="px-margin-mobile md:px-margin-desktop py-6 max-w-4xl mx-auto w-full">
          {/* Search Bar */}
          <div className="relative mb-6">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-md text-on-surface"
              placeholder="Search student by Name or ID..."
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </div>

          {/* Form & Profile Bento */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Profile Avatar Card */}
            <div className="md:col-span-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-6 flex flex-col items-center text-center shadow-sm">
              <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-3xl mb-3 shadow-md">
                RD
              </div>
              <h2 className="font-title-md font-bold text-on-surface text-lg">{studentData.fullName}</h2>
              <p className="font-body-sm text-outline text-xs mt-0.5">{studentData.rollNumber}</p>
              <div className="mt-3">
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold uppercase">
                  {studentData.status}
                </span>
              </div>
            </div>

            {/* Editable Fields Form */}
            <div className="md:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-6 shadow-sm">
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-outline text-xs uppercase">Full Name</label>
                    <input
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                      name="fullName"
                      value={studentData.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-outline text-xs uppercase">Roll / ID Number</label>
                    <input
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-mono-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                      name="rollNumber"
                      value={studentData.rollNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-outline text-xs uppercase">Email Address</label>
                    <input
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                      name="email"
                      type="email"
                      value={studentData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-outline text-xs uppercase">Contact Number</label>
                    <input
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                      name="phone"
                      value={studentData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-outline text-xs uppercase">Department</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                      name="department"
                      value={studentData.department}
                      onChange={handleChange}
                    >
                      <option>Computer Science</option>
                      <option>Electrical Eng.</option>
                      <option>Mechanical Eng.</option>
                      <option>Business Admin</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-outline text-xs uppercase">Semester</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                      name="semester"
                      value={studentData.semester}
                      onChange={handleChange}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-outline text-xs uppercase">Section</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                      name="section"
                      value={studentData.section}
                      onChange={handleChange}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>

                {isSaved && (
                  <div className="p-3 bg-secondary-container text-on-secondary-container rounded-xl text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Student profile updated successfully in university database!
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl hover:bg-primary-container transition-all shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

