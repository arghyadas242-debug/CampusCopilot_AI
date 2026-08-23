import { useState } from "react";
import { Link } from "react-router";

export default function CollaborationPage() {
  const [groups] = useState([
    {
      id: 1,
      name: "DBMS Semester Project Team",
      members: 4,
      topic: "Distributed SQL Query Engine",
      lastActive: "10 mins ago",
      tag: "Project",
    },
    {
      id: 2,
      name: "Competitive Coding & Algorithms",
      members: 12,
      topic: "Dynamic Programming & Graphs",
      lastActive: "1 hour ago",
      tag: "Study Group",
    },
    {
      id: 3,
      name: "Computer Networks Lab Study",
      members: 6,
      topic: "Packet Tracer Review & Viva Prep",
      lastActive: "Yesterday",
      tag: "Exam Prep",
    },
  ]);

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 bg-surface border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md">
        <div className="flex items-center gap-sm">
          <Link to="/profile" className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
            RD
          </Link>
          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">CampusCopilot</span>
        </div>
        <Link to="/dashboard" className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">
          Dashboard
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop pt-6 flex flex-col gap-6">
        <div>
          <h1 className="font-headline-lg md:font-display-lg text-primary font-bold">Student Collaboration Hub</h1>
          <p className="font-body-md text-on-surface-variant mt-1">Join peer study groups, share project code, and prepare for lab vivas together.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {groups.map((grp) => (
            <div key={grp.id} className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">
                    {grp.tag}
                  </span>
                  <span className="text-xs text-outline">{grp.lastActive}</span>
                </div>
                <h3 className="font-title-md font-bold text-on-surface text-lg">{grp.name}</h3>
                <p className="font-body-sm text-on-surface-variant text-sm mt-1">{grp.topic}</p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-variant">
                <span className="text-xs text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  {grp.members} Members
                </span>
                <Link to="/ai-chat" className="text-xs font-semibold text-primary hover:underline">
                  Join Chat
                </Link>
              </div>
            </div>
          ))}
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
          <Link to="/collaboration" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              group_work
            </span>
            <span className="text-[10px] mt-1">Groups</span>
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

