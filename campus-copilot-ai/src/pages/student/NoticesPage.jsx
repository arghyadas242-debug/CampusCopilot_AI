import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { authService } from "../../services/api";

const DEFAULT_NOTICES = [
  {
    id: 1,
    title: "Semester Examination Schedule & Assessment Guidelines",
    author: "Department of Controller of Examinations",
    tag: "URGENT",
    category: "exam",
    date: "Aug 23, 2026",
    summary: [
      "Registration deadline on the campus portal is Sep 02, 2026.",
      "Admit cards available on Digital Student ID portal on Sep 08, 2026.",
      "Theoretical & practical examinations begin Sep 12, 2026 in Halls A & B.",
    ],
    content: `Dear Students,

This is to formally notify all enrolled students that the End-of-Semester Examinations for the current academic term will commence on September 12, 2026. All theoretical and practical assessments will be conducted in accordance with the university's academic calendar.

Registration Process:
Students must complete their examination subject confirmation through the university portal no later than September 2, 2026. Late registrations will incur a penalty fee and require special sanction by the Dean of Academic Affairs. Please ensure all outstanding library dues and tuition fees are cleared prior to attempting registration.

Code of Conduct:
Strict adherence to the university examination code of conduct is expected. Any form of academic dishonesty, unauthorized collaboration, or bringing prohibited materials into the examination hall will result in immediate disciplinary action.

We advise beginning your preparations early and wish you the best in your upcoming assessments.

Sincerely,
Department of Examinations`,
    attachments: [
      { name: "Examination Schedule 2026", type: "PDF Document (2.4 MB)", icon: "picture_as_pdf" },
      { name: "Hall Ticket Instructions & Regulations", type: "Web Document", icon: "description" },
    ],
  },
  {
    id: 2,
    title: "Annual Hackathon & AI Innovation Challenge 2026",
    author: "Department of Computer Science & ACM Student Chapter",
    tag: "EVENT",
    category: "event",
    date: "Aug 21, 2026",
    summary: [
      "48-hour continuous hackathon on Smart Campus & Generative AI.",
      "Cash pool of $5,000 + cloud credits for top 5 teams.",
      "Registration closes Aug 28, 2026.",
    ],
    content: `The Department of Computer Science, in association with the ACM Student Chapter, is pleased to announce the Annual AI Hackathon 2026. 

Teams of 2–4 members will build autonomous agents and full-stack solutions for university and community productivity. Mentors from leading tech firms will be present throughout the 48 hours.

Register your team on the collaboration portal before August 28, 2026.`,
    attachments: [
      { name: "Hackathon Rulebook & Problem Statements", type: "PDF (1.1 MB)", icon: "picture_as_pdf" },
    ],
  },
  {
    id: 3,
    title: "Library Digital Catalog & IEEE Xplore Access Renewed",
    author: "Chief University Librarian",
    tag: "ACADEMIC",
    category: "academic",
    date: "Aug 19, 2026",
    summary: [
      "Full-text access to IEEE Xplore, ACM DL, and Springer is active via campus Wi-Fi.",
      "Extended reading room timings till 11:00 PM during exam months.",
    ],
    content: `All students and faculty members now have unrestricted access to the IEEE Xplore Digital Library and Springer Nature journals. 

Access is authenticated automatically through the campus network and via institutional single-sign-on (SSO) credentials.`,
    attachments: [],
  },
];

export default function NoticesPage() {
  const location = useLocation();
  const currentUser = authService.getCurrentUser();
  const isAdmin = String(currentUser?.role || "").trim().toLowerCase() === "admin";
  const roleBackPath = isAdmin ? "/admin" : "/dashboard";
  const backPath = ["/admin", "/dashboard"].includes(location.state?.from)
    ? location.state.from
    : roleBackPath;
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Dashboard";

  const [notices, setNotices] = useState(DEFAULT_NOTICES);
  const [selectedNotice, setSelectedNotice] = useState(DEFAULT_NOTICES[0]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function loadNotices() {
      try {
        const res = await fetch("http://localhost:5000/api/notices");
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.notices || [];
          if (items.length > 0) {
            const formatted = items.map((n, idx) => ({
              id: n.id || n.ID || idx + 1,
              title: n.title || n.TITLE || "Campus Notice",
              author: n.author || n.AUTHOR || "University Administration",
              tag: (n.tag || n.TAG || "ACADEMIC").toUpperCase(),
              category: (n.category || n.CATEGORY || "academic").toLowerCase(),
              date: n.createdAt || n.CREATED_AT || "Recent",
              summary: Array.isArray(n.summary)
                ? n.summary
                : Array.isArray(n.AI_SUMMARY)
                ? n.AI_SUMMARY
                : [n.summary || n.AI_SUMMARY || "Verified circular."],
              content: n.content || n.CONTENT || "Official university circular.",
              attachments: n.attachments || [
                { name: "Notice Attachment", type: "PDF Document (1.5 MB)", icon: "picture_as_pdf" },
              ],
            }));
            setNotices(formatted);
            setSelectedNotice(formatted[0]);
          }
        }
      } catch (e) {
        console.warn("Backend notice fetch fallback to default:", e.message);
      }
    }
    loadNotices();
  }, []);

  const filteredNotices =
    filter === "all" ? notices : notices.filter((n) => n.category === filter || n.tag?.toLowerCase() === filter);

  function getTagColor(tag) {
    const val = String(tag || "").toUpperCase();
    if (val === "URGENT" || val === "EXAM") {
      return "bg-error-container text-on-error-container border-error/20";
    }
    if (val === "EVENT") {
      return "bg-secondary-container text-on-secondary-container border-secondary/20";
    }
    return "bg-primary-container text-on-primary-container border-primary/20";
  }

  return (
    <div className="bg-background text-on-surface font-body-md antialiased min-h-screen pb-16">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-surface border-b border-surface-container-high px-4 md:px-8 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to={backPath}
            className="p-2 rounded-full text-primary hover:bg-surface-container-high transition-colors"
            title={`Back to ${dashboardLabel}`}
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary text-lg md:text-xl">
              Campus Notices
            </h1>
            <p className="text-xs text-outline hidden md:block">Official circulars, events, and AI summaries</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/ai-chat"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            Ask Copilot
          </Link>
          <Link
            to={backPath}
            className="hidden sm:block text-xs font-semibold text-primary px-3 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            {dashboardLabel}
          </Link>
        </div>
      </header>

      {/* Main Grid Canvas */}
      <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Notice Roster */}
        <aside className="lg:col-span-4 flex flex-col gap-3">
          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["all", "exam", "event", "academic"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filter === cat
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 overflow-hidden shadow-sm">
            <div className="p-3.5 border-b border-surface-variant flex justify-between items-center bg-surface-container-low">
              <span className="font-bold text-xs uppercase tracking-wider text-on-surface">
                All Announcements ({filteredNotices.length})
              </span>
            </div>

            <div className="divide-y divide-surface-variant max-h-[calc(100vh-240px)] overflow-y-auto">
              {filteredNotices.map((n) => {
                const isSelected = selectedNotice?.id === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNotice(n)}
                    className={`w-full text-left p-4 transition-all cursor-pointer border-l-4 ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-inner"
                        : "hover:bg-surface-container-low border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTagColor(n.tag)}`}>
                        {n.tag}
                      </span>
                      <span className="text-[11px] text-outline font-mono-sm">{n.date}</span>
                    </div>
                    <h3 className={`font-semibold text-sm line-clamp-2 ${isSelected ? "text-primary font-bold" : "text-on-surface"}`}>
                      {n.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">{n.author}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Column: Selected Notice Detail View */}
        {selectedNotice && (
          <article className="lg:col-span-8 flex flex-col gap-6">
            {/* Notice Title & Metadata */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/70 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-tertiary" />

              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTagColor(selectedNotice.tag)}`}>
                  {selectedNotice.tag}
                </span>
                <span className="font-mono-sm text-xs text-outline font-semibold">Circular #{selectedNotice.id}</span>
              </div>

              <h2 className="font-headline-lg md:font-display-lg text-primary font-bold text-2xl md:text-3xl leading-tight mb-2">
                {selectedNotice.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[16px] text-primary">account_balance</span>
                  {selectedNotice.author}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono-sm">
                  <span className="material-symbols-outlined text-[16px] text-secondary">calendar_today</span>
                  {selectedNotice.date}
                </span>
              </div>

              {/* AI Highlights Box */}
              <div className="mt-5 bg-surface-container-low rounded-xl p-4 border border-outline-variant/60">
                <div className="flex items-center gap-2 text-tertiary font-bold text-xs uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    smart_toy
                  </span>
                  CampusCopilot AI Key Highlights (TL;DR)
                </div>
                <ul className="space-y-1.5 text-sm text-on-surface">
                  {selectedNotice.summary?.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Full Content */}
              <div className="mt-6 pt-5 border-t border-surface-variant text-on-surface text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                {selectedNotice.content}
              </div>
            </div>

            {/* Attachments & Actions Card */}
            {selectedNotice.attachments?.length > 0 && (
              <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/70 shadow-sm">
                <h3 className="font-title-md font-bold text-on-surface text-base mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">attachment</span> Official Attachments
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedNotice.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-outline-variant/60 hover:bg-surface-container-low transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-error-container text-on-error-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-[20px]">{att.icon || "description"}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-on-surface group-hover:text-primary">{att.name}</div>
                          <div className="text-[11px] text-outline">{att.type}</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-outline group-hover:text-primary text-[20px]">
                        download
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        )}
      </main>
    </div>
  );
}
