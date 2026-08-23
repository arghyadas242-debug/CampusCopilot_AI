import { useState } from "react";
import { Link, useNavigate } from "react-router";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [studentInfo] = useState({
    name: "Ratul Das",
    department: "B.Tech Computer Science & Engineering",
    rollNumber: "2026-CS-0042",
    email: "ratul.das@campus.edu",
    semester: "Semester 5 (Section A)",
    advisor: "Prof. Alan Turing",
    bloodGroup: "O+",
    libraryDues: "$0.00 (Clear)",
  });

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-surface border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md">
        <div className="flex items-center gap-sm">
          <Link to="/dashboard" className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
            RD
          </Link>
          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">CampusCopilot</span>
        </div>
        <Link to="/dashboard" className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">
          Back to Dashboard
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: ID Card & Quick Actions */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-secondary" />

            <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-3xl mb-3 shadow-md">
              RD
            </div>

            <h1 className="font-title-md font-bold text-on-surface text-xl">{studentInfo.name}</h1>
            <p className="font-body-sm text-on-surface-variant text-sm mt-0.5 mb-3">{studentInfo.department}</p>

            <div className="flex gap-2 flex-wrap justify-center mb-4">
              <span className="px-3 py-1 bg-surface-container-high rounded-full font-label-caps text-xs text-on-surface font-semibold">
                Semester 5
              </span>
              <span className="px-3 py-1 bg-surface-container-high rounded-full font-label-caps text-xs text-on-surface font-semibold">
                Section A
              </span>
            </div>

            <Link
              to="/student-id"
              className="w-full py-2.5 px-4 bg-primary text-on-primary font-semibold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              View Digital ID Card
            </Link>
          </div>

          {/* Quick Access Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
            <h3 className="font-title-md font-bold text-on-surface text-base mb-1">Academic Portals</h3>
            <Link to="/ai-analytics" className="p-2.5 rounded-lg hover:bg-surface-container-low flex items-center justify-between text-sm transition-colors border border-outline-variant/30">
              <span className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-tertiary text-[20px]">insights</span>
                AI Performance Analytics
              </span>
              <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
            </Link>
            <Link to="/resources" className="p-2.5 rounded-lg hover:bg-surface-container-low flex items-center justify-between text-sm transition-colors border border-outline-variant/30">
              <span className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-secondary text-[20px]">folder_open</span>
                Academic Resource Hub
              </span>
              <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
            </Link>
            <button
              onClick={() => navigate("/login")}
              className="p-2.5 rounded-lg hover:bg-error-container/20 flex items-center justify-between text-sm text-error font-semibold transition-colors mt-2 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">logout</span>
                Sign Out
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Detailed Credentials & History */}
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* Official Records Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-6 shadow-sm">
            <h2 className="font-title-md font-bold text-on-surface text-lg mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span>
              Official Academic Records
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/40">
                <span className="font-label-caps text-outline text-xs uppercase block mb-1">Student Roll No</span>
                <span className="font-mono-sm font-bold text-on-surface text-base">{studentInfo.rollNumber}</span>
              </div>
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/40">
                <span className="font-label-caps text-outline text-xs uppercase block mb-1">University Email</span>
                <span className="font-body-md font-medium text-on-surface text-base">{studentInfo.email}</span>
              </div>
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/40">
                <span className="font-label-caps text-outline text-xs uppercase block mb-1">Academic Advisor</span>
                <span className="font-body-md font-medium text-on-surface text-base">{studentInfo.advisor}</span>
              </div>
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/40">
                <span className="font-label-caps text-outline text-xs uppercase block mb-1">Library Clearance</span>
                <span className="font-body-md font-bold text-secondary text-base">{studentInfo.libraryDues}</span>
              </div>
            </div>
          </div>

          {/* Connected Services */}
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-6 shadow-sm">
            <h2 className="font-title-md font-bold text-on-surface text-lg mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">verified_user</span>
              Campus Security & Authentication
            </h2>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/40">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-2xl">shield</span>
                  <div>
                    <h4 className="font-body-md font-bold text-on-surface text-sm">Firebase Authentication</h4>
                    <p className="text-xs text-outline">Linked to {studentInfo.email}</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">
                  Active
                </span>
              </div>
            </div>
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
          <Link to="/assignments" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">assignment</span>
            <span className="text-[10px] mt-1">Tasks</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_circle
            </span>
            <span className="text-[10px] mt-1">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
