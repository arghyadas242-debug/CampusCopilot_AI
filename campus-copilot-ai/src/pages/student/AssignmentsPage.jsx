import { useState } from "react";
import { Link } from "react-router";

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState("upcoming");

  const [assignments, setAssignments] = useState([
    {
      id: 1,
      title: "DBMS Normalization & ER Modeling Problem Set",
      subject: "Database Management Systems (CS-301)",
      dueDate: "Tomorrow, 11:59 PM",
      priority: "High Priority",
      priorityColor: "bg-error-container text-on-error-container",
      status: "pending",
      submitted: false,
    },
    {
      id: 2,
      title: "TCP/IP Packet Routing Simulation Report",
      subject: "Computer Networks (CS-302)",
      dueDate: "Aug 27, 2026",
      priority: "Medium Priority",
      priorityColor: "bg-secondary-container text-on-secondary-container",
      status: "pending",
      submitted: false,
    },
    {
      id: 3,
      title: "Process Synchronization & Semaphore Implementation",
      subject: "Operating Systems (CS-303)",
      dueDate: "Aug 30, 2026",
      priority: "Medium Priority",
      priorityColor: "bg-secondary-container text-on-secondary-container",
      status: "pending",
      submitted: false,
    },
    {
      id: 4,
      title: "Turing Machine Formal Proofs",
      subject: "Theory of Computation (CS-304)",
      dueDate: "Submitted Aug 18",
      priority: "Completed",
      priorityColor: "bg-surface-container-high text-on-surface-variant",
      status: "completed",
      submitted: true,
      grade: "98 / 100",
    },
  ]);

  const handleSubmitToggle = (id) => {
    setAssignments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, submitted: !item.submitted, status: item.submitted ? "pending" : "completed" } : item
      )
    );
  };

  const filteredAssignments =
    activeTab === "upcoming"
      ? assignments.filter((a) => a.status === "pending")
      : assignments.filter((a) => a.status === "completed");

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row antialiased">
      {/* Desktop Navigation Drawer */}
      <aside className="hidden md:flex flex-col py-md h-screen w-[280px] bg-surface border-r border-outline-variant shadow-xl sticky top-0 shrink-0">
        <div className="px-md mb-lg">
          <h1 className="font-headline-lg-mobile text-primary font-bold">CampusCopilot</h1>
        </div>

        <Link to="/profile" className="px-md mb-md flex items-center gap-sm hover:opacity-80">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            RD
          </div>
          <div>
            <p className="font-title-md text-on-surface">Ratul Das</p>
            <p className="font-body-sm text-on-surface-variant">Computer Science Dept.</p>
            <p className="font-mono-sm text-outline">ID: 2026-001</p>
          </div>
        </Link>

        <nav className="flex-1 flex flex-col gap-xs">
          <Link to="/dashboard" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md">
            <span className="material-symbols-outlined">dashboard</span> Home
          </Link>
          <Link to="/timetable" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md">
            <span className="material-symbols-outlined">calendar_month</span> Timetable
          </Link>
          <Link to="/attendance" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md">
            <span className="material-symbols-outlined">analytics</span> Attendance
          </Link>
          <Link to="/assignments" className="flex items-center gap-sm bg-secondary-container text-on-secondary-container rounded-full mx-2 px-4 py-2 font-bold font-body-md">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span> Assignments
          </Link>
          <Link to="/exams" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md">
            <span className="material-symbols-outlined">description</span> Exams
          </Link>
          <Link to="/campus" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md">
            <span className="material-symbols-outlined">campaign</span> Notices
          </Link>
          <Link to="/ai-chat" className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md">
            <span className="material-symbols-outlined">smart_toy</span> Copilot
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full pb-[80px] md:pb-0 max-w-[1440px] mx-auto">
        {/* TopAppBar (Mobile) */}
        <header className="sticky top-0 w-full z-40 bg-background border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:hidden">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
              RD
            </div>
            <span className="font-headline-lg-mobile font-bold text-primary">CampusCopilot</span>
          </div>
          <Link to="/campus" className="text-on-surface-variant hover:opacity-80">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
          </Link>
        </header>

        {/* Canvas */}
        <div className="flex-1 px-margin-mobile md:px-margin-desktop py-md">
          <div className="mb-md">
            <h2 className="font-headline-lg md:font-display-lg text-on-background font-bold mb-1">Assignments & Tasks</h2>
            <p className="font-body-md text-on-surface-variant">Manage your academic submissions, project deliverables, and lab reports.</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-sm mb-lg border-b border-outline-variant">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`pb-2 px-3 border-b-2 font-title-md transition-all cursor-pointer ${
                activeTab === "upcoming" ? "border-primary text-primary font-bold" : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Upcoming ({assignments.filter((a) => a.status === "pending").length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`pb-2 px-3 border-b-2 font-title-md transition-all cursor-pointer ${
                activeTab === "completed" ? "border-primary text-primary font-bold" : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Completed ({assignments.filter((a) => a.status === "completed").length})
            </button>
          </div>

          {/* Assignments List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssignments.map((task) => (
              <div
                key={task.id}
                className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-label-caps text-xs font-semibold ${task.priorityColor}`}>
                      {task.priority}
                    </span>
                    <span className="font-mono-sm text-xs text-outline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {task.dueDate}
                    </span>
                  </div>
                  <h3 className="font-title-md text-on-surface font-bold text-lg mb-1">{task.title}</h3>
                  <p className="font-body-sm text-on-surface-variant">{task.subject}</p>
                  {task.grade && (
                    <div className="mt-2 text-sm font-semibold text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">verified</span> Grade: {task.grade}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-5 pt-3 border-t border-surface-variant">
                  <Link to="/ai-chat" className="text-xs text-tertiary font-semibold flex items-center gap-1 hover:underline">
                    <span className="material-symbols-outlined text-[16px]">smart_toy</span> Ask Copilot for help
                  </Link>

                  <button
                    onClick={() => handleSubmitToggle(task.id)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      task.submitted
                        ? "bg-surface-container-high text-on-surface hover:bg-surface-container"
                        : "bg-primary text-on-primary hover:bg-primary-container shadow-sm"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {task.submitted ? "check_circle" : "upload_file"}
                    </span>
                    {task.submitted ? "Marked as Done" : "Upload Submission"}
                  </button>
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
          <Link to="/attendance" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-[10px] mt-1">Attendance</span>
          </Link>
          <Link to="/ai-chat" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-[10px] mt-1">Copilot</span>
          </Link>
          <Link to="/assignments" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              assignment
            </span>
            <span className="text-[10px] mt-1">Tasks</span>
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

