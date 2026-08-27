import { useState, useEffect } from "react";
import { Link } from "react-router";
import { attendanceService, authService } from "../../services/api";
import StudentNotificationBell from "./StudentNotificationBell";

export default function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState({
    overallPercentage: 0,
    subjects: [],
    overallBuffer: 0,
    classesNeeded: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAttendance() {
      try {
        setLoading(true);
        setError("");

        const currentUser = authService.getCurrentUser();

        // Temporary fallback until login is connected to the real student roll.
        const roll = currentUser?.rollNumber || "CSE001";

        const data = await attendanceService.getAttendance(roll);

        if (!Array.isArray(data)) {
          throw new Error("Invalid attendance data received");
        }

        // Convert Oracle API response into the format used by this page.
        const subjects = data.map((item) => {
          const attended = Number(item.ATTENDED_CLASSES) || 0;
          const total = Number(item.TOTAL_CLASSES) || 0;

          const percentage =
            total > 0
              ? Number(((attended / total) * 100).toFixed(1))
              : 0;

          let bunksLeft = 0;
          let classesNeeded = 0;

          if (percentage >= 75) {
            bunksLeft = Math.max(
              0,
              Math.floor(attended / 0.75 - total)
            );
          } else {
            classesNeeded = Math.max(
              0,
              Math.ceil(
                (0.75 * total - attended) / 0.25
              )
            );
          }

          return {
            code: item.SUBJECT_CODE,
            name: item.SUBJECT_NAME,
            attended,
            total,
            percentage,
            bunksLeft,
            classesNeeded,
          };
        });

        // Overall attendance
        const totalAttended = subjects.reduce(
          (sum, subject) => sum + subject.attended,
          0
        );

        const totalClasses = subjects.reduce(
          (sum, subject) => sum + subject.total,
          0
        );

        const overallPercentage =
          totalClasses > 0
            ? Number(
                ((totalAttended / totalClasses) * 100).toFixed(1)
              )
            : 0;

        let overallBuffer = 0;
        let classesNeeded = 0;

        if (overallPercentage >= 75) {
          overallBuffer = Math.max(
            0,
            Math.floor(totalAttended / 0.75 - totalClasses)
          );
        } else {
          classesNeeded = Math.max(
            0,
            Math.ceil(
              (0.75 * totalClasses - totalAttended) / 0.25
            )
          );
        }

        setAttendanceData({
          overallPercentage,
          subjects,
          overallBuffer,
          classesNeeded,
        });
      } catch (err) {
        console.error("Attendance loading error:", err);

        setError(
          err.message || "Unable to load attendance data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
        <div className="text-center">
          <p className="font-semibold text-primary">
            Loading attendance...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
        <div className="text-center">
          <h2 className="text-xl font-bold text-error">
            Unable to Load Attendance
          </h2>

          <p className="text-on-surface-variant mt-2">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-surface border-b border-surface-container-high flex justify-between items-center px-4 py-3 md:px-8 md:py-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs"
          >
            RD
          </Link>

          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
            CampusCopilot
          </span>
        </div>

        <div className="flex items-center gap-2">
          <StudentNotificationBell />
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-4 md:px-8 pt-6 flex flex-col gap-6">
        <div>
          <h1 className="font-headline-lg md:font-display-lg text-primary font-bold">
            Attendance Analytics
          </h1>

          <p className="font-body-md text-on-surface-variant mt-1">
            Live subject-wise attendance tracking and safe bunk
            buffer calculator.
          </p>
        </div>

        {/* Overall Status Banner */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center font-bold text-2xl text-primary shadow-inner ${
                attendanceData.overallPercentage >= 75
                  ? "border-secondary bg-secondary/10"
                  : "border-error bg-error/10"
              }`}
            >
              {attendanceData.overallPercentage}%
            </div>

            <div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  attendanceData.overallPercentage >= 75
                    ? "text-secondary"
                    : "text-error"
                }`}
              >
                {attendanceData.overallPercentage >= 75
                  ? "Good Standing"
                  : "Attendance Warning"}
              </span>

              <h2 className="text-xl font-bold text-on-surface mt-0.5">
                {attendanceData.overallPercentage >= 75
                  ? "Above Minimum 75% Requirement"
                  : "Below Minimum 75% Requirement"}
              </h2>

              <p className="text-xs text-on-surface-variant mt-1">
                {attendanceData.overallPercentage >= 75
                  ? `You can currently miss ${attendanceData.overallBuffer} more ${
                      attendanceData.overallBuffer === 1
                        ? "class"
                        : "classes"
                    } overall and remain at or above 75%.`
                  : `Attend the next ${attendanceData.classesNeeded} ${
                      attendanceData.classesNeeded === 1
                        ? "class"
                        : "classes"
                    } to reach 75%.`}
              </p>
            </div>
          </div>

          <Link
            to="/ai-chat"
            className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">
              smart_toy
            </span>

            Ask Copilot Attendance Advice
          </Link>
        </div>

        {/* No Attendance Data */}
        {attendanceData.subjects.length === 0 && (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/70 p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-outline">
              analytics
            </span>

            <h2 className="font-bold text-on-surface mt-2">
              No attendance data available
            </h2>

            <p className="text-sm text-on-surface-variant mt-1">
              Attendance records have not been added for this
              student yet.
            </p>
          </div>
        )}

        {/* Subject Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {attendanceData.subjects.map((sub) => {
            const isSafe = sub.percentage >= 75;

            let attendanceMessage = "";

            if (isSafe) {
              if (sub.bunksLeft === 0) {
                attendanceMessage = "No Safe Bunks Left";
              } else if (sub.bunksLeft === 1) {
                attendanceMessage = "1 Bunk Left";
              } else {
                attendanceMessage = `${sub.bunksLeft} Bunks Left`;
              }
            } else {
              attendanceMessage =
                sub.classesNeeded === 1
                  ? "Attend next 1 class"
                  : `Attend next ${sub.classesNeeded} classes`;
            }

            return (
              <div
                key={sub.code}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/70 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono-sm text-xs text-outline font-bold">
                      {sub.code}
                    </span>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isSafe
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-error-container text-on-error-container"
                      }`}
                    >
                      {sub.percentage}%
                    </span>
                  </div>

                  <h3 className="font-title-md font-bold text-on-surface text-base mb-1">
                    {sub.name}
                  </h3>

                  <p className="text-xs text-on-surface-variant">
                    {sub.attended} / {sub.total} classes attended
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-variant flex justify-between items-center text-xs gap-2">
                  <span
                    className={
                      isSafe
                        ? "text-secondary font-semibold"
                        : "text-error font-bold"
                    }
                  >
                    {isSafe ? "Safe Zone" : "Needs Attention"}
                  </span>

                  <span className="text-outline text-right">
                    {attendanceMessage}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom Nav Bar (Mobile) */}
      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">
        <div className="flex justify-around items-center px-4 w-full h-full">
          <Link
            to="/dashboard"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              dashboard
            </span>

            <span className="text-[10px] mt-1">Home</span>
          </Link>

          <Link
            to="/attendance"
            className="flex flex-col items-center justify-center text-primary font-bold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: "'FILL' 1",
              }}
            >
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
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
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
