import { Link } from "react-router";

export default function ExamsPage() {
  const exams = [
    {
      id: 1,
      course: "Database Management Systems",
      code: "CS-301",
      date: "Sep 04, 2026",
      time: "10:00 AM - 01:00 PM",
      room: "Exam Hall A (Row 3, Seat 12)",
      type: "Mid-Term Written",
      countdown: "in 12 days",
      status: "Upcoming",
      syllabus: "Units 1 to 3: Relational Algebra, SQL, Normalization (1NF - BCNF)",
      badgeColor: "bg-error-container text-on-error-container",
    },
    {
      id: 2,
      course: "Computer Networks",
      code: "CS-302",
      date: "Sep 07, 2026",
      time: "10:00 AM - 01:00 PM",
      room: "Exam Hall B (Row 1, Seat 08)",
      type: "Mid-Term Written",
      countdown: "in 15 days",
      status: "Upcoming",
      syllabus: "OSI vs TCP/IP Layers, Data Link Protocols, Subnetting & Routing",
      badgeColor: "bg-secondary-container text-on-secondary-container",
    },
    {
      id: 3,
      course: "Operating Systems Lab Examination",
      code: "CS-303P",
      date: "Sep 11, 2026",
      time: "02:00 PM - 05:00 PM",
      room: "Linux Systems Lab 3",
      type: "Practical & Viva",
      countdown: "in 19 days",
      status: "Upcoming",
      syllabus: "Shell scripting, POSIX threads, IPC pipes & shared memory implementation",
      badgeColor: "bg-tertiary-container text-on-tertiary",
    },
  ];

  return (
    <div className="bg-background text-on-background font-body-sm flex flex-col md:flex-row min-h-screen relative overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col py-md bg-surface border-r border-outline-variant shadow-xl h-screen w-[280px] sticky top-0 z-40 shrink-0">
        <div className="px-md mb-lg">
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
              RD
            </div>
            <div>
              <h2 className="font-headline-lg-mobile text-primary font-bold">Ratul Das</h2>
              <p className="font-body-sm text-on-surface-variant">Computer Science Dept.</p>
              <p className="font-mono-sm text-outline">ID: 2026-001</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <Link to="/dashboard" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md">
            <span className="material-symbols-outlined">dashboard</span> Home
          </Link>
          <Link to="/timetable" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md">
            <span className="material-symbols-outlined">calendar_month</span> Timetable
          </Link>
          <Link to="/attendance" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md">
            <span className="material-symbols-outlined">analytics</span> Attendance
          </Link>
          <Link to="/assignments" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md">
            <span className="material-symbols-outlined">assignment</span> Assignments
          </Link>
          <Link to="/exams" className="flex items-center gap-sm bg-secondary-container text-on-secondary-container rounded-full mx-2 font-bold px-4 py-2 font-body-md">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>description</span> Exams
          </Link>
          <Link to="/campus" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md">
            <span className="material-symbols-outlined">campaign</span> Notices
          </Link>
          <Link to="/ai-chat" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md">
            <span className="material-symbols-outlined">smart_toy</span> Copilot
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col z-10 min-h-screen relative pb-[80px] md:pb-0">
        {/* Top App Bar (Mobile) */}
        <header className="md:hidden sticky top-0 w-full z-40 bg-background border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
              RD
            </div>
            <span className="font-headline-lg-mobile font-bold text-primary">CampusCopilot</span>
          </div>
          <Link to="/campus" className="text-on-surface-variant hover:opacity-80">
            <span className="material-symbols-outlined">notifications</span>
          </Link>
        </header>

        {/* Page Canvas */}
        <div className="p-margin-mobile md:p-margin-desktop flex-1 max-w-[1100px] w-full mx-auto space-y-md">
          <header className="mb-lg">
            <h1 className="font-headline-lg md:font-display-lg text-primary font-bold">Examination Schedule</h1>
            <p className="font-body-md text-on-surface-variant mt-1">Seating allocation, dates, syllabus scopes, and preparation guides.</p>
          </header>

          {/* Featured Countdown Card */}
          <div className="bg-gradient-to-r from-primary via-primary-container to-secondary p-6 rounded-2xl text-on-primary shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                Next Assessment
              </span>
              <h2 className="font-headline-lg font-bold text-2xl mt-2 text-white">Database Management Systems</h2>
              <p className="text-white/80 text-sm mt-1">Mid-Semester Exam • Friday, Sep 04, 2026 (10:00 AM)</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 shrink-0">
              <div className="text-3xl font-extrabold text-white">12</div>
              <div className="text-xs text-white/80 uppercase font-semibold">Days Left</div>
            </div>
          </div>

          {/* Exam Cards Grid */}
          <div className="flex flex-col gap-4 mt-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-label-caps text-xs font-semibold ${exam.badgeColor}`}>
                      {exam.type}
                    </span>
                    <span className="font-mono-sm text-xs text-outline">{exam.code}</span>
                    <span className="text-xs font-semibold text-primary ml-auto md:ml-0 bg-primary/10 px-2 py-0.5 rounded">
                      {exam.countdown}
                    </span>
                  </div>

                  <h3 className="font-title-md font-bold text-on-surface text-lg">{exam.course}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-secondary">event</span>
                      <span>{exam.date} • {exam.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">pin_drop</span>
                      <span>{exam.room}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-surface-container-low rounded-lg text-xs text-on-surface-variant border border-outline-variant/50">
                    <span className="font-semibold text-on-surface">Syllabus Scope: </span>
                    {exam.syllabus}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0 self-end md:self-center">
                  <Link
                    to="/ai-chat"
                    className="px-4 py-2 rounded-lg bg-tertiary text-on-tertiary text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-tertiary-container transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">smart_toy</span> Generate Study Plan
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Nav Bar (Mobile) */}
      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">
        <div className="flex justify-around items-center px-margin-mobile w-full h-full">
          <Link to="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] mt-1">Home</span>
          </Link>
          <Link to="/timetable" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="text-[10px] mt-1">Timetable</span>
          </Link>
          <Link to="/attendance" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-[10px] mt-1">Attendance</span>
          </Link>
          <Link to="/exams" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              description
            </span>
            <span className="text-[10px] mt-1">Exams</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">account_circle</span>
            <span className="text-[10px] mt-1">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

