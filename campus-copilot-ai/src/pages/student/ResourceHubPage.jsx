import { useState } from "react";
import { Link } from "react-router";

export default function ResourceHubPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const subjects = [
    {
      code: "CS301",
      title: "Database Management Systems",
      color: "bg-secondary",
      resources: [
        { type: "Notes (PDF)", desc: "Units 1-4 Complete with ER diagrams", icon: "description", iconBg: "bg-error-container text-on-error-container" },
        { type: "Previous Question Papers", desc: "2020 - 2025 Mid & End-Sem", icon: "history_edu", iconBg: "bg-surface-container-high text-on-surface-variant" },
        { type: "Video Lectures", desc: "Curated playlists by IIT Professors", icon: "play_circle", iconBg: "bg-primary-container text-on-primary-container" },
      ],
    },
    {
      code: "CS302",
      title: "Computer Networks",
      color: "bg-primary",
      resources: [
        { type: "Notes (PDF)", desc: "Socket Programming & Routing algorithms", icon: "description", iconBg: "bg-error-container text-on-error-container" },
        { type: "Lab Manuals", desc: "Wireshark & Packet Tracer Experiments", icon: "terminal", iconBg: "bg-secondary-container text-on-secondary-container" },
        { type: "Cheat Sheet", desc: "Subnetting & Port numbers reference", icon: "verified", iconBg: "bg-tertiary-container text-on-tertiary" },
      ],
    },
    {
      code: "CS303",
      title: "Operating Systems",
      color: "bg-tertiary",
      resources: [
        { type: "Lecture Slides", desc: "Virtual memory, Paging & Scheduling", icon: "slideshow", iconBg: "bg-primary-container text-on-primary-container" },
        { type: "Previous Papers", desc: "Solved mid-term numericals", icon: "history_edu", iconBg: "bg-surface-container-high text-on-surface-variant" },
      ],
    },
  ];

  const filteredSubjects = subjects.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 bg-surface border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md">
        <div className="flex items-center gap-sm">
          <Link to="/profile" className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
            RD
          </Link>
          <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">CampusCopilot</h1>
        </div>
        <Link to="/dashboard" className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">
          Dashboard
        </Link>
      </header>

      {/* Main Content */}
      <main className="pt-6 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto w-full flex flex-col gap-lg">
        {/* Header & Search Section */}
        <section className="flex flex-col gap-sm">
          <div>
            <h2 className="font-headline-lg text-primary font-bold text-2xl md:text-3xl">Academic Resource Hub</h2>
            <p className="font-body-md text-on-surface-variant mt-1">Verified university syllabus notes, previous years question papers, and lab manuals.</p>
          </div>

          <div className="relative w-full max-w-2xl mt-2">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-3 pl-10 pr-4 font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              placeholder="Search subjects, notes, past exam papers, lab codes..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </section>

        {/* Subjects Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {filteredSubjects.map((sub, idx) => (
            <article
              key={idx}
              className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl overflow-hidden relative flex flex-col hover:shadow-lg transition-all"
            >
              <div className={`h-1.5 w-full ${sub.color}`} />
              <div className="p-md flex flex-col flex-1 gap-sm">
                <div className="flex justify-between items-start">
                  <h3 className="font-title-md font-bold text-on-surface text-lg">{sub.title}</h3>
                  <span className="bg-surface-container-high text-on-surface font-mono-sm text-xs px-2 py-0.5 rounded font-bold">
                    {sub.code}
                  </span>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  {sub.resources.map((res, rIdx) => (
                    <div
                      key={rIdx}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-container-low transition-colors border border-outline-variant/30 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${res.iconBg}`}>
                          <span className="material-symbols-outlined text-[18px]">{res.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-body-md font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">
                            {res.type}
                          </span>
                          <span className="font-body-sm text-outline text-xs">{res.desc}</span>
                        </div>
                      </div>
                      <button className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors cursor-pointer" title="Download">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

      {/* Bottom Nav Bar (Mobile) */}
      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">
        <div className="flex justify-around items-center px-margin-mobile w-full h-full">
          <Link to="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] mt-1">Home</span>
          </Link>
          <Link to="/resources" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              folder_open
            </span>
            <span className="text-[10px] mt-1">Resources</span>
          </Link>
          <Link to="/attendance" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-[10px] mt-1">Attendance</span>
          </Link>
          <Link to="/ai-chat" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-[10px] mt-1">Copilot</span>
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
