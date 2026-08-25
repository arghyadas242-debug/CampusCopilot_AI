import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

export default function NoticesPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const notice = {
    id: "EX-2026-04",
    title: "Semester Examination & Assessment Guidelines",
    department: "Department of Controller of Examinations",
    date: "Aug 23, 2026",
    tag: "URGENT",
    tagColor: "bg-error text-on-error",
    aiSummary: [
      { label: "Registration Deadline", val: "Sep 02, 2026 • 11:59 PM" },
      { label: "Admit Cards Available", val: "Sep 08, 2026 via Digital ID portal" },
      { label: "Examinations Commence", val: "Sep 12, 2026 in Halls A & B" },
    ],
    fullContent: `Dear Students,

This is to formally notify all enrolled students that the End-of-Semester Examinations for the current academic term will commence on September 12, 2026. All theoretical and practical assessments will be conducted in accordance with the university's official academic calendar.

Registration Process:
Students must complete their examination subject confirmation through the university portal no later than September 2, 2026. Late registrations will incur a penalty fee and require special sanction by the Dean of Academic Affairs. Please ensure all outstanding library dues and tuition fees are cleared prior to attempting registration.

Code of Conduct:
Strict adherence to the university examination code of conduct is mandatory. Any form of academic dishonesty, unauthorized collaboration, or possession of prohibited digital devices inside examination halls will result in immediate disciplinary referral.

Admit Card & Gate Pass:
Your digital student ID card on CampusCopilot will serve as your digital admit pass. Ensure your digital QR token is accessible.

We advise beginning your syllabus revision early and wish you the best in your upcoming assessments.`,
    attachments: [
      { name: "Examination Schedule 2026 (PDF)", size: "PDF Document (2.4 MB)", icon: "picture_as_pdf", color: "bg-error-container text-on-error-container" },
      { name: "Hall Ticket Instructions & Regulations", size: "Official Circular", icon: "description", color: "bg-surface-container-highest text-on-surface-variant" },
    ],
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-background text-on-surface font-body-md antialiased min-h-screen pb-16">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-surface border-b border-surface-container-high shadow-xs">
        <div className="flex justify-between items-center px-4 md:px-8 py-3 max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-primary hover:bg-surface-container-high p-2 rounded-full transition-colors cursor-pointer"
              title="Go Back"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary text-lg md:text-xl">
              Notice Details
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="text-primary hover:bg-surface-container-high p-2 rounded-full transition-colors cursor-pointer relative"
              title="Share Notice"
            >
              <span className="material-symbols-outlined text-[22px]">share</span>
              {copied && (
                <span className="absolute -bottom-8 right-0 bg-inverse-surface text-inverse-on-surface text-[11px] px-2 py-1 rounded shadow-md whitespace-nowrap">
                  Link copied!
                </span>
              )}
            </button>
            <Link
              to="/campus"
              className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              All Notices
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-6 px-4 md:px-8 max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column / Notice Body */}
        <article className="md:col-span-8 space-y-6">
          {/* Header Section */}
          <header className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-error text-on-error font-label-caps text-xs tracking-wider uppercase font-bold">
                {notice.tag}
              </span>
              <span className="font-mono-sm text-xs text-outline">Circular #{notice.id}</span>
            </div>

            <h2 className="font-headline-lg md:font-display-lg text-primary font-bold text-2xl md:text-4xl leading-tight">
              {notice.title}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-on-surface-variant font-body-sm text-xs">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">account_balance</span>
                {notice.department}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">calendar_today</span>
                {notice.date}
              </span>
            </div>
          </header>

          {/* AI Summary Card (Bento Style) */}
          <aside className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/70 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-secondary via-primary to-tertiary" />

            <div className="flex items-center gap-2 text-tertiary font-bold text-sm mb-3">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
              <h3>CampusCopilot AI Key Highlights (TL;DR)</h3>
            </div>

            <ul className="space-y-2 text-sm text-on-surface">
              {notice.aiSummary.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <span>
                    <strong className="text-on-surface font-semibold">{item.label}:</strong>{" "}
                    <span className="text-on-surface-variant">{item.val}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-3 border-t border-surface-variant flex items-center justify-between">
              <span className="text-[11px] text-outline">Synthesized by Gemini 2.5 Flash</span>
              <Link
                to="/ai-chat"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">smart_toy</span> Ask Copilot questions about this notice
              </Link>
            </div>
          </aside>

          {/* Full Text Content */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/60 shadow-xs text-on-surface font-body-md text-sm md:text-base leading-relaxed whitespace-pre-wrap">
            {notice.fullContent}
          </div>
        </article>

        {/* Right Column / Attachments & Actions */}
        <aside className="md:col-span-4 space-y-6">
          {/* Attachments Section */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 shadow-sm space-y-4">
            <h3 className="font-title-md font-bold text-on-surface text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">attachment</span> Official Attachments
            </h3>

            <div className="space-y-3">
              {notice.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="group flex items-center justify-between p-3.5 rounded-xl border border-outline-variant/60 hover:border-primary hover:bg-surface-container-low transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${att.color}`}>
                      <span className="material-symbols-outlined text-[18px]">{att.icon}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-on-surface group-hover:text-primary transition-colors">
                        {att.name}
                      </span>
                      <span className="text-[11px] text-outline">{att.size}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">
                    download
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Copilot Action Card */}
          <div className="bg-gradient-to-br from-primary-container to-tertiary-container rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-secondary-container text-2xl">event_upcoming</span>
              <h4 className="font-bold text-sm">Need a Revision Schedule?</h4>
            </div>
            <p className="text-xs text-on-primary-container leading-relaxed mb-4">
              Copilot can automatically generate a customized study schedule for your courses ahead of the Sep 12 exam date.
            </p>
            <Link
              to="/ai-chat"
              className="w-full py-2.5 px-4 bg-white text-primary font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              Generate Exam Study Plan
            </Link>
          </div>
        </aside>
      </main>
    </div>
  );
}
