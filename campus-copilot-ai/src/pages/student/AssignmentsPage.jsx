import { useState, useEffect } from "react";
import { Link } from "react-router";
import { authService } from "../../services/api";

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState("upcoming");

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD ASSIGNMENTS FROM ORACLE DATABASE
  // =====================================================

  useEffect(() => {
    async function loadAssignments() {
      try {
        setLoading(true);
        setError("");

        const currentUser = authService.getCurrentUser();

        // Logged-in student's roll number
        // Fallback used only while testing
        const roll =
          currentUser?.rollNumber || "12024002037008";

        const response = await fetch(
          `http://localhost:5000/api/assignments/${encodeURIComponent(
            roll
          )}`
        );

        if (!response.ok) {
          throw new Error("Failed to load assignments");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid assignment data received");
        }

        const formattedAssignments = data.map((item) => {
          const priority = item.PRIORITY || "Medium";

          let priorityColor =
            "bg-secondary-container text-on-secondary-container";

          if (priority.toLowerCase() === "high") {
            priorityColor =
              "bg-error-container text-on-error-container";
          }

          if (priority.toLowerCase() === "low") {
            priorityColor =
              "bg-surface-container-high text-on-surface-variant";
          }

          const status =
            item.STATUS?.toLowerCase() || "pending";

          return {
            id: item.ID,
            title: item.TITLE,
            subject: `${item.SUBJECT_NAME} (${item.SUBJECT_CODE})`,
            description: item.DESCRIPTION || "",
            dueDate: item.DUE_DATE,
            priority: `${priority} Priority`,
            priorityColor,
            status,
            submitted: status === "completed",
          };
        });

        setAssignments(formattedAssignments);
      } catch (err) {
        console.error("Assignment loading error:", err);

        setError(
          err.message || "Unable to load assignments."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, []);

  // =====================================================
  // MARK ASSIGNMENT AS COMPLETED / PENDING
  // =====================================================

  const handleSubmitToggle = async (id) => {
    try {
      const assignment = assignments.find(
        (item) => item.id === id
      );

      if (!assignment) {
        return;
      }

      const newStatus = assignment.submitted
        ? "pending"
        : "completed";

      const response = await fetch(
        `http://localhost:5000/api/assignments/${id}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to update assignment status"
        );
      }

      setAssignments((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: newStatus,
                submitted: newStatus === "completed",
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Assignment update error:",
        err
      );

      alert("Failed to update assignment.");
    }
  };

  // =====================================================
  // FILTER UPCOMING / COMPLETED
  // =====================================================

  const filteredAssignments =
    activeTab === "upcoming"
      ? assignments.filter(
          (a) => a.status === "pending"
        )
      : assignments.filter(
          (a) => a.status === "completed"
        );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-primary">
            assignment
          </span>

          <p className="mt-2 text-on-surface-variant">
            Loading assignments...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-error">
            error
          </span>

          <h2 className="font-bold text-error mt-2">
            Unable to Load Assignments
          </h2>

          <p className="text-on-surface-variant mt-1">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row antialiased">

      {/* Desktop Navigation Drawer */}

      <aside className="hidden md:flex flex-col py-md h-screen w-[280px] bg-surface border-r border-outline-variant shadow-xl sticky top-0 shrink-0">

        <div className="px-md mb-lg">
          <h1 className="font-headline-lg-mobile text-primary font-bold">
            CampusCopilot
          </h1>
        </div>

        <Link
          to="/profile"
          className="px-md mb-md flex items-center gap-sm hover:opacity-80"
        >
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            RD
          </div>

          <div>
            <p className="font-title-md text-on-surface">
              Ratul Das
            </p>

            <p className="font-body-sm text-on-surface-variant">
              Computer Science Dept.
            </p>

            <p className="font-mono-sm text-outline">
              ID: 2026-001
            </p>
          </div>
        </Link>

        <nav className="flex-1 flex flex-col gap-xs">

          <Link
            to="/dashboard"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md"
          >
            <span className="material-symbols-outlined">
              dashboard
            </span>

            Home
          </Link>

          <Link
            to="/timetable"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md"
          >
            <span className="material-symbols-outlined">
              calendar_month
            </span>

            Timetable
          </Link>

          <Link
            to="/attendance"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md"
          >
            <span className="material-symbols-outlined">
              analytics
            </span>

            Attendance
          </Link>

          <Link
            to="/assignments"
            className="flex items-center gap-sm bg-secondary-container text-on-secondary-container rounded-full mx-2 px-4 py-2 font-bold font-body-md"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: "'FILL' 1",
              }}
            >
              assignment
            </span>

            Assignments
          </Link>

          <Link
            to="/exams"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md"
          >
            <span className="material-symbols-outlined">
              description
            </span>

            Exams
          </Link>

          <Link
            to="/campus"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md"
          >
            <span className="material-symbols-outlined">
              campaign
            </span>

            Notices
          </Link>

          <Link
            to="/ai-chat"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 rounded-full hover:bg-surface-container-high font-body-md"
          >
            <span className="material-symbols-outlined">
              smart_toy
            </span>

            Copilot
          </Link>

        </nav>
      </aside>

      {/* Main Content Area */}

      <main className="flex-1 flex flex-col w-full pb-[80px] md:pb-0 max-w-[1440px] mx-auto">

        {/* TopAppBar Mobile */}

        <header className="sticky top-0 w-full z-40 bg-background border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:hidden">

          <div className="flex items-center gap-sm">

            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
              RD
            </div>

            <span className="font-headline-lg-mobile font-bold text-primary">
              CampusCopilot
            </span>

          </div>

          <Link
            to="/campus"
            className="text-on-surface-variant hover:opacity-80"
          >
            <span className="material-symbols-outlined text-[24px]">
              notifications
            </span>
          </Link>

        </header>

        {/* Canvas */}

        <div className="flex-1 px-margin-mobile md:px-margin-desktop py-md">

          <div className="mb-md">

            <h2 className="font-headline-lg md:font-display-lg text-on-background font-bold mb-1">
              Assignments & Tasks
            </h2>

            <p className="font-body-md text-on-surface-variant">
              Manage your academic submissions,
              project deliverables, and lab reports.
            </p>

          </div>

          {/* Tabs */}

          <div className="flex gap-sm mb-lg border-b border-outline-variant">

            <button
              onClick={() =>
                setActiveTab("upcoming")
              }
              className={`pb-2 px-3 border-b-2 font-title-md transition-all cursor-pointer ${
                activeTab === "upcoming"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Upcoming (
              {
                assignments.filter(
                  (a) =>
                    a.status === "pending"
                ).length
              }
              )
            </button>

            <button
              onClick={() =>
                setActiveTab("completed")
              }
              className={`pb-2 px-3 border-b-2 font-title-md transition-all cursor-pointer ${
                activeTab === "completed"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Completed (
              {
                assignments.filter(
                  (a) =>
                    a.status === "completed"
                ).length
              }
              )
            </button>

          </div>

          {/* Empty State */}

          {filteredAssignments.length === 0 && (
            <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-8 text-center">

              <span className="material-symbols-outlined text-4xl text-outline">
                assignment
              </span>

              <h3 className="font-bold text-on-surface mt-2">
                {activeTab === "upcoming"
                  ? "No upcoming assignments"
                  : "No completed assignments"}
              </h3>

              <p className="text-sm text-on-surface-variant mt-1">
                {activeTab === "upcoming"
                  ? "You currently have no pending assignments."
                  : "Completed assignments will appear here."}
              </p>

            </div>
          )}

          {/* Assignments List */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {filteredAssignments.map((task) => (

              <div
                key={task.id}
                className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden"
              >

                <div>

                  <div className="flex justify-between items-start mb-2">

                    <span
                      className={`px-2.5 py-0.5 rounded-full font-label-caps text-xs font-semibold ${task.priorityColor}`}
                    >
                      {task.priority}
                    </span>

                    <span className="font-mono-sm text-xs text-outline flex items-center gap-1">

                      <span className="material-symbols-outlined text-[14px]">
                        schedule
                      </span>

                      {task.dueDate}

                    </span>

                  </div>

                  <h3 className="font-title-md text-on-surface font-bold text-lg mb-1">
                    {task.title}
                  </h3>

                  <p className="font-body-sm text-on-surface-variant">
                    {task.subject}
                  </p>

                  {task.description && (
                    <p className="font-body-sm text-on-surface-variant mt-2">
                      {task.description}
                    </p>
                  )}

                </div>

                <div className="flex items-center justify-between mt-5 pt-3 border-t border-surface-variant">

                  <Link
                    to="/ai-chat"
                    className="text-xs text-tertiary font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      smart_toy
                    </span>

                    Ask Copilot for help
                  </Link>

                  <button
                    onClick={() =>
                      handleSubmitToggle(task.id)
                    }
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      task.submitted
                        ? "bg-surface-container-high text-on-surface hover:bg-surface-container"
                        : "bg-primary text-on-primary hover:bg-primary-container shadow-sm"
                    }`}
                  >

                    <span className="material-symbols-outlined text-[16px]">
                      {task.submitted
                        ? "check_circle"
                        : "done"}
                    </span>

                    {task.submitted
                      ? "Marked as Done"
                      : "Mark as Done"}

                  </button>

                </div>

              </div>

            ))}

          </div>

        </div>

      </main>

      {/* Bottom Nav Bar Mobile */}

      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">

        <div className="flex justify-around items-center px-margin-mobile w-full h-full">

          <Link
            to="/dashboard"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              dashboard
            </span>

            <span className="text-[10px] mt-1">
              Home
            </span>
          </Link>

          <Link
            to="/attendance"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              analytics
            </span>

            <span className="text-[10px] mt-1">
              Attendance
            </span>
          </Link>

          <Link
            to="/ai-chat"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              smart_toy
            </span>

            <span className="text-[10px] mt-1">
              Copilot
            </span>
          </Link>

          <Link
            to="/assignments"
            className="flex flex-col items-center justify-center text-primary font-bold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: "'FILL' 1",
              }}
            >
              assignment
            </span>

            <span className="text-[10px] mt-1">
              Tasks
            </span>
          </Link>

          <Link
            to="/profile"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              account_circle
            </span>

            <span className="text-[10px] mt-1">
              Profile
            </span>
          </Link>

        </div>

      </nav>

    </div>
  );
}