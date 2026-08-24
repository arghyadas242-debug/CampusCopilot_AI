import { useState, useEffect } from "react";
import { Link } from "react-router";
import { attendanceService, authService } from "../../services/api";

export default function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState({
    overallPercentage: 81,
    subjects: [
      { code: "CS301", name: "Database Management Systems", attended: 28, total: 32, percentage: 88 },
      { code: "CS302", name: "Computer Networks", attended: 22, total: 28, percentage: 79 },
      { code: "CS303", name: "Operating Systems", attended: 20, total: 24, percentage: 83 },
      { code: "CS304", name: "Design & Analysis of Algorithms", attended: 16, total: 22, percentage: 73 },
    ],
  });

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    async function loadAttendance() {
      const roll = currentUser?.rollNumber || "2026-CS-0042";
      const data = await attendanceService.getAttendance(roll);
      if (data && data.subjects?.length > 0) {
        setAttendanceData(data);
      }
    }
    loadAttendance();
  }, []);

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-surface border-b border-surface-container-high flex justify-between items-center px-4 py-3 md:px-8 md:py-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
            RD
          </Link>
          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">CampusCopilot</span>
        </div>
        <Link to="/dashboard" className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">
          Dashboard
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-4 md:px-8 pt-6 flex flex-col gap-6">
        <div>
          <h1 className="font-headline-lg md:font-display-lg text-primary font-bold">Attendance Analytics</h1>
          <p className="font-body-md text-on-surface-variant mt-1">Live subject-wise attendance tracking and safe bunk buffer calculator.</p>
        </div>

        {/* Overall Status Banner */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full border-4 border-secondary flex items-center justify-center font-bold text-2xl text-primary bg-secondary/10 shadow-inner">
              {attendanceData.overallPercentage}%
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">Good Standing</span>
              <h2 className="text-xl font-bold text-on-surface mt-0.5">Above Minimum 75% Requirement</h2>
              <p className="text-xs text-on-surface-variant mt-1">You have a safe buffer of 3 classes across all subjects.</p>
            </div>
          </div>

          <Link
            to="/ai-chat"
            className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
            Ask Copilot Attendance Advice
          </Link>
        </div>

        {/* Subject Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {attendanceData.subjects.map((sub, idx) => {
            const isSafe = sub.percentage >= 75;
            return (
              <div
                key={idx}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/70 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono-sm text-xs text-outline font-bold">{sub.code}</span>
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
                  <h3 className="font-title-md font-bold text-on-surface text-base mb-1">{sub.name}</h3>
                  <p className="text-xs text-on-surface-variant">
                    {sub.attended} / {sub.total} classes attended
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-variant flex justify-between items-center text-xs">
                  <span className={isSafe ? "text-secondary font-semibold" : "text-error font-bold"}>
                    {isSafe ? "✓ Safe Zone" : "⚠️ Needs Attention"}
                  </span>
                  <span className="text-outline">{isSafe ? "+2 Bunks Left" : "Attend next 3 classes"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom Nav Bar (Mobile) */}
      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">
        <div className="flex justify-around items-center px-4 w-full h-full">
          <Link to="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] mt-1">Home</span>
          </Link>
          <Link to="/attendance" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              analytics
            </span>
            <span className="text-[10px] mt-1">Attendance</span>
          </Link>
          <Link to="/ai-chat" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-[10px] mt-1">Copilot</span>
          </Link>
          <Link to="/assignments" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">assignment</span>
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
