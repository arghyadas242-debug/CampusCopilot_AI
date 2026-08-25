import { useEffect, useState } from "react";
import { Link } from "react-router";
import { authService } from "../../services/api";

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    async function loadExams() {
      try {
        setLoading(true);
        setError("");

        const user = authService.getCurrentUser();

        const roll =
          user?.rollNumber || "12024002037008";

        const response = await fetch(
          `http://localhost:5000/api/exams/${encodeURIComponent(
            roll
          )}`
        );

        if (!response.ok) {
          throw new Error("Failed to load exams");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid exam data received");
        }

        const formatted = data.map((item) => {
          const dateObject = parseExamDate(
            item.EXAM_DATE
          );

          const daysLeft =
            calculateDaysLeft(dateObject);

          return {
            id: item.ID,
            course:
              item.SUBJECT_NAME ||
              "Unknown Subject",

            code:
              item.SUBJECT_CODE || "",

            faculty:
              item.FACULTY_NAME ||
              "Faculty not assigned",

            date:
              formatExamDate(dateObject),

            time: `${formatTime(
              item.START_TIME
            )} - ${formatTime(
              item.END_TIME
            )}`,

            room:
              item.ROOM ||
              "Room not assigned",

            type:
              item.EXAM_TYPE ||
              "Examination",

            daysLeft,

            countdown:
              daysLeft === 0
                ? "Today"
                : daysLeft === 1
                ? "in 1 day"
                : daysLeft > 1
                ? `in ${daysLeft} days`
                : "Completed",

            status:
              daysLeft >= 0
                ? "Upcoming"
                : "Completed",

            syllabus:
              "Not added yet",

            badgeColor:
              getBadgeColor(
                item.EXAM_TYPE
              ),

            dateObject,
          };
        });

        formatted.sort(
          (a, b) =>
            a.dateObject -
            b.dateObject
        );

        setExams(formatted);
      } catch (err) {
        console.error(
          "Exam loading error:",
          err
        );

        setError(
          err.message ||
            "Unable to load exams."
        );
      } finally {
        setLoading(false);
      }
    }

    loadExams();
  }, []);

  function parseExamDate(value) {
    if (!value) {
      return null;
    }

    const parts =
      String(value).split("-");

    if (parts.length !== 3) {
      return null;
    }

    const day = Number(parts[0]);
    const month =
      Number(parts[1]) - 1;
    const year = Number(parts[2]);

    return new Date(
      year,
      month,
      day
    );
  }

  function formatExamDate(date) {
    if (!date) {
      return "Date not available";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatTime(time) {
    if (!time) {
      return "TBA";
    }

    const parts =
      String(time).split(":");

    let hour = Number(parts[0]);
    const minute =
      parts[1] || "00";

    if (Number.isNaN(hour)) {
      return time;
    }

    const period =
      hour >= 12 ? "PM" : "AM";

    hour = hour % 12;

    if (hour === 0) {
      hour = 12;
    }

    return `${String(hour).padStart(
      2,
      "0"
    )}:${minute} ${period}`;
  }

  function calculateDaysLeft(date) {
    if (!date) {
      return 0;
    }

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const examDate =
      new Date(date);

    examDate.setHours(
      0,
      0,
      0,
      0
    );

    const difference =
      examDate.getTime() -
      today.getTime();

    return Math.ceil(
      difference /
        (1000 * 60 * 60 * 24)
    );
  }

  function getBadgeColor(type) {
    const value =
      String(
        type || ""
      ).toLowerCase();

    if (
      value.includes("practical") ||
      value.includes("viva") ||
      value.includes("lab")
    ) {
      return "bg-tertiary-container text-on-tertiary";
    }

    if (
      value.includes("semester") ||
      value.includes("final")
    ) {
      return "bg-error-container text-on-error-container";
    }

    return "bg-secondary-container text-on-secondary-container";
  }

  const upcomingExams =
    exams.filter(
      (exam) =>
        exam.status === "Upcoming"
    );

  const nextExam =
    upcomingExams.length > 0
      ? upcomingExams[0]
      : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-primary">
            description
          </span>

          <p className="mt-2 text-on-surface-variant">
            Loading examination
            schedule...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-error">
            error
          </span>

          <h2 className="font-bold text-error mt-2">
            Unable to Load Exams
          </h2>

          <p className="text-on-surface-variant mt-1">
            {error}
          </p>
        </div>
      </div>
    );
  }

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

              <h2 className="font-headline-lg-mobile text-primary font-bold">
                {currentUser?.name ||
                  "Student"}
              </h2>

              <p className="font-body-sm text-on-surface-variant">
                {currentUser?.department ||
                  "Computer Science Dept."}
              </p>

              <p className="font-mono-sm text-outline">
                ID:{" "}
                {currentUser?.rollNumber ||
                  "12024002037008"}
              </p>

            </div>

          </div>

        </div>

        <nav className="flex-1 space-y-1">

          <Link
            to="/dashboard"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md"
          >
            <span className="material-symbols-outlined">
              dashboard
            </span>

            Home
          </Link>

          <Link
            to="/timetable"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md"
          >
            <span className="material-symbols-outlined">
              calendar_month
            </span>

            Timetable
          </Link>

          <Link
            to="/attendance"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md"
          >
            <span className="material-symbols-outlined">
              analytics
            </span>

            Attendance
          </Link>

          <Link
            to="/assignments"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md"
          >
            <span className="material-symbols-outlined">
              assignment
            </span>

            Assignments
          </Link>

          <Link
            to="/exams"
            className="flex items-center gap-sm bg-secondary-container text-on-secondary-container rounded-full mx-2 font-bold px-4 py-2 font-body-md"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              description
            </span>

            Exams
          </Link>

          <Link
            to="/notices"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md"
          >
            <span className="material-symbols-outlined">
              campaign
            </span>

            Notices
          </Link>

          <Link
            to="/ai-chat"
            className="flex items-center gap-sm text-on-surface-variant mx-2 px-4 py-2 hover:bg-surface-container-high rounded-full font-body-md"
          >
            <span className="material-symbols-outlined">
              smart_toy
            </span>

            Copilot
          </Link>

        </nav>

      </aside>

      {/* Main Content */}

      <main className="flex-1 w-full flex flex-col z-10 min-h-screen relative pb-[80px] md:pb-0">

        {/* Mobile Header */}

        <header className="md:hidden sticky top-0 w-full z-40 bg-background border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm">

          <div className="flex items-center gap-sm">

            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
              RD
            </div>

            <span className="font-headline-lg-mobile font-bold text-primary">
              CampusCopilot
            </span>

          </div>

          <Link
            to="/notices"
            className="text-on-surface-variant hover:opacity-80"
          >
            <span className="material-symbols-outlined">
              notifications
            </span>
          </Link>

        </header>

        {/* Page Canvas */}

        <div className="p-margin-mobile md:p-margin-desktop flex-1 max-w-[1100px] w-full mx-auto space-y-md">

          <header className="mb-lg">

            <h1 className="font-headline-lg md:font-display-lg text-primary font-bold">
              Examination Schedule
            </h1>

            <p className="font-body-md text-on-surface-variant mt-1">
              Seating allocation,
              dates, syllabus scopes,
              and preparation guides.
            </p>

          </header>

          {/* Next Exam */}

          {nextExam && (
            <div className="bg-gradient-to-r from-primary via-primary-container to-secondary p-6 rounded-2xl text-on-primary shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">

              <div>

                <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                  Next Assessment
                </span>

                <h2 className="font-headline-lg font-bold text-2xl mt-2 text-white">
                  {nextExam.course}
                </h2>

                <p className="text-white/80 text-sm mt-1">
                  {nextExam.type}
                  {" • "}
                  {nextExam.date}
                  {" • "}
                  {nextExam.time.split(
                    " - "
                  )[0]}
                </p>

              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 shrink-0">

                <div className="text-3xl font-extrabold text-white">
                  {nextExam.daysLeft}
                </div>

                <div className="text-xs text-white/80 uppercase font-semibold">
                  {nextExam.daysLeft ===
                  1
                    ? "Day Left"
                    : "Days Left"}
                </div>

              </div>

            </div>
          )}

          {/* No Exams */}

          {exams.length === 0 && (
            <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-8 text-center">

              <span className="material-symbols-outlined text-5xl text-outline">
                event_available
              </span>

              <h2 className="font-bold text-lg mt-2">
                No Exams Scheduled
              </h2>

              <p className="text-on-surface-variant mt-1">
                No examination records
                are currently available.
              </p>

            </div>
          )}

          {/* Exam Cards */}

          <div className="flex flex-col gap-4 mt-4">

            {exams.map((exam) => (

              <div
                key={exam.id}
                className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
              >

                <div className="flex-1">

                  <div className="flex flex-wrap items-center gap-2 mb-2">

                    <span
                      className={`px-2.5 py-0.5 rounded-full font-label-caps text-xs font-semibold ${exam.badgeColor}`}
                    >
                      {exam.type}
                    </span>

                    <span className="font-mono-sm text-xs text-outline">
                      {exam.code}
                    </span>

                    <span className="text-xs font-semibold text-primary ml-auto md:ml-0 bg-primary/10 px-2 py-0.5 rounded">
                      {exam.countdown}
                    </span>

                  </div>

                  <h3 className="font-title-md font-bold text-on-surface text-lg">
                    {exam.course}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm text-on-surface-variant">

                    <div className="flex items-center gap-2">

                      <span className="material-symbols-outlined text-[18px] text-secondary">
                        event
                      </span>

                      <span>
                        {exam.date}
                        {" • "}
                        {exam.time}
                      </span>

                    </div>

                    <div className="flex items-center gap-2">

                      <span className="material-symbols-outlined text-[18px] text-primary">
                        pin_drop
                      </span>

                      <span>
                        {exam.room}
                      </span>

                    </div>

                  </div>

                  <div className="flex items-center gap-2 mt-3 text-sm text-on-surface-variant">

                    <span className="material-symbols-outlined text-[18px]">
                      person
                    </span>

                    <span>
                      {exam.faculty}
                    </span>

                  </div>

                  <div className="mt-3 p-3 bg-surface-container-low rounded-lg text-xs text-on-surface-variant border border-outline-variant/50">

                    <span className="font-semibold text-on-surface">
                      Syllabus Scope:{" "}
                    </span>

                    {exam.syllabus}

                  </div>

                </div>

                <div className="flex flex-col gap-2 shrink-0 self-end md:self-center">

                  <Link
                    to={`/ai-chat?subject=${encodeURIComponent(
                      exam.course
                    )}`}
                    className="px-4 py-2 rounded-lg bg-tertiary text-on-tertiary text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-tertiary-container transition-colors shadow-sm"
                  >

                    <span className="material-symbols-outlined text-[16px]">
                      smart_toy
                    </span>

                    Generate Study Plan

                  </Link>

                </div>

              </div>

            ))}

          </div>

        </div>

      </main>

      {/* Mobile Bottom Nav */}

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
            to="/timetable"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              calendar_month
            </span>

            <span className="text-[10px] mt-1">
              Timetable
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
            to="/exams"
            className="flex flex-col items-center justify-center text-primary font-bold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              description
            </span>

            <span className="text-[10px] mt-1">
              Exams
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