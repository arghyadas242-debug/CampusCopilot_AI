import { useState } from "react";
import { Link } from "react-router";

export default function CampusPage() {
  const [filter, setFilter] = useState("all");

  const notices = [
    {
      id: 1,
      title: "Semester Examination Schedule Released",
      author: "Office of the Controller of Examinations",
      date: "Aug 22, 2026 • 2 hours ago",
      tag: "URGENT",
      tagColor: "bg-error-container text-on-error-container",
      category: "exam",
      summary: [
        "End-semester practical evaluations start next Monday.",
        "Written exams begin Sep 04 in Exam Halls A & B.",
        "Admit cards are available on the digital student ID portal.",
      ],
      aiSummarized: true,
    },
    {
      id: 2,
      title: "Annual Hackathon & AI Innovation Challenge 2026",
      author: "Department of Computer Science & ACM Student Chapter",
      date: "Aug 21, 2026 • Yesterday",
      tag: "EVENT",
      tagColor: "bg-secondary-container text-on-secondary-container",
      category: "event",
      summary: [
        "48-hour continuous hackathon on Smart Campus & Generative AI.",
        "Cash pool of $5,000 + cloud credits for top 5 teams.",
        "Registration closes Aug 28, 2026.",
      ],
      aiSummarized: true,
    },
    {
      id: 3,
      title: "Library Digital Catalog & Springer Nature Access Renewed",
      author: "Chief University Librarian",
      date: "Aug 19, 2026",
      tag: "ACADEMIC",
      tagColor: "bg-primary-container text-on-primary-container",
      category: "academic",
      summary: [
        "Full-text access to IEEE Xplore, ACM DL, and Springer is active via campus Wi-Fi.",
        "Extended reading room timings till 11:00 PM during exam months.",
      ],
      aiSummarized: false,
    },
  ];

  const filteredNotices =
    filter === "all" ? notices : notices.filter((n) => n.category === filter);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row antialiased font-body-md">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col py-md w-[280px] bg-surface border-r border-outline-variant shadow-xl sticky top-0 h-screen shrink-0">
        <div className="px-md mb-xl flex items-center gap-sm">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            RD
          </div>
          <div>
            <h2 className="font-headline-lg-mobile text-primary font-bold">Ratul Das</h2>
            <p className="font-body-sm text-on-surface-variant">Computer Science Dept.</p>
            <p className="font-label-caps text-outline">ID: 2026-001</p>
          </div>
        </div>

        <nav className="flex flex-col gap-xs flex-1 px-2">
          <Link to="/dashboard" className="flex items-center gap-sm text-on-surface-variant px-4 py-2 hover:bg-surface-container-high rounded-full">
            <span className="material-symbols-outlined">dashboard</span> Home
          </Link>
          <Link to="/timetable" className="flex items-center gap-sm text-on-surface-variant px-4 py-2 hover:bg-surface-container-high rounded-full">
            <span className="material-symbols-outlined">calendar_month</span> Timetable
          </Link>
          <Link to="/campus" className="flex items-center gap-sm bg-secondary-container text-on-secondary-container rounded-full px-4 py-2 font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span> Notices
          </Link>
          <Link to="/attendance" className="flex items-center gap-sm text-on-surface-variant px-4 py-2 hover:bg-surface-container-high rounded-full">
            <span className="material-symbols-outlined">analytics</span> Attendance
          </Link>
          <Link to="/exams" className="flex items-center gap-sm text-on-surface-variant px-4 py-2 hover:bg-surface-container-high rounded-full">
            <span className="material-symbols-outlined">description</span> Exams
          </Link>
          <Link to="/ai-chat" className="flex items-center gap-sm text-on-surface-variant px-4 py-2 hover:bg-surface-container-high rounded-full">
            <span className="material-symbols-outlined">smart_toy</span> Copilot
          </Link>
        </nav>
      </aside>

      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col p-margin-mobile md:p-margin-desktop gap-md md:gap-lg pb-[80px] md:pb-12 max-w-[1440px] mx-auto w-full">
        {/* Top bar on Mobile */}
        <header className="md:hidden sticky top-0 w-full z-40 bg-background flex justify-between items-center py-sm border-b border-surface-container-high">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
              RD
            </div>
            <span className="font-headline-lg-mobile font-bold text-primary">CampusCopilot</span>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-headline-lg md:font-display-lg text-primary font-bold">Campus Notices & Bulletin</h1>
            <p className="font-body-md text-on-surface-variant mt-1">Official circulars, events, and AI-generated TL;DR summaries.</p>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", "exam", "event", "academic"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  filter === cat
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Notices Grid */}
        <div className="flex flex-col gap-4">
          {filteredNotices.map((notice) => (
            <article
              key={notice.id}
              className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-tertiary" />

              <header className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`font-label-caps text-xs px-2.5 py-0.5 rounded font-bold ${notice.tagColor}`}>
                      {notice.tag}
                    </span>
                    <span className="font-mono-sm text-xs text-outline">{notice.date}</span>
                  </div>
                  <Link to="/notice-details" className="hover:text-primary transition-colors">
                    <h2 className="font-headline-lg-mobile md:font-title-md font-bold text-on-surface text-lg hover:text-primary">
                      {notice.title}
                    </h2>
                  </Link>
                  <p className="font-body-sm text-on-surface-variant text-xs mt-0.5">{notice.author}</p>
                </div>
              </header>

              {/* AI TLDR Box */}
              <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-4 my-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-tertiary uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                  AI Key Highlights (TL;DR)
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-on-surface">
                  {notice.summary.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>

              <footer className="flex items-center justify-between mt-3 pt-3 border-t border-surface-variant">
                <span className="text-xs text-outline">Verified Circular #NTU-{notice.id}04</span>
                <Link
                  to="/ai-chat"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span> Ask Copilot questions about this notice
                </Link>
              </footer>
            </article>
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
          <Link to="/campus" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              campaign
            </span>
            <span className="text-[10px] mt-1">Notices</span>
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

