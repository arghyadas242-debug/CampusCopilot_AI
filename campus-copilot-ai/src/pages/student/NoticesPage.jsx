import { useEffect, useState } from "react";
import { Link } from "react-router";

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadNotices() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:5000/api/notices"
        );

        if (!response.ok) {
          throw new Error("Failed to load notices");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid notice data received");
        }

        setNotices(data);

        if (data.length > 0) {
          setSelectedNotice(data[0]);
        }
      } catch (err) {
        console.error("Notice loading error:", err);

        setError(
          err.message || "Unable to load notices."
        );
      } finally {
        setLoading(false);
      }
    }

    loadNotices();
  }, []);

  function formatDate(dateValue) {
    if (!dateValue) {
      return "No date";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getTagClasses(tag) {
    const value = String(tag || "").toLowerCase();

    if (
      value === "urgent" ||
      value === "important"
    ) {
      return "bg-error-container text-on-error-container";
    }

    if (value === "general") {
      return "bg-secondary-container text-on-secondary-container";
    }

    return "bg-primary/10 text-primary";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-primary">
            campaign
          </span>

          <p className="mt-2 text-on-surface-variant">
            Loading notices...
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
            Unable to Load Notices
          </h2>

          <p className="text-on-surface-variant mt-1">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!selectedNotice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-outline">
            campaign
          </span>

          <h2 className="font-bold text-on-surface mt-2">
            No Notices Available
          </h2>

          <p className="text-on-surface-variant mt-1">
            There are currently no college notices.
          </p>

          <Link
            to="/dashboard"
            className="inline-block mt-4 text-primary font-semibold"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface min-h-screen">

      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-surface border-b border-outline-variant px-4 md:px-8 h-16 flex items-center justify-between">

        <Link
          to="/dashboard"
          className="p-2 rounded-full text-primary hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">
            arrow_back
          </span>
        </Link>

        <h1 className="font-headline-lg-mobile font-semibold text-primary">
          Campus Notices
        </h1>

        <Link
          to="/ai-chat"
          className="p-2 rounded-full text-primary hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">
            smart_toy
          </span>
        </Link>

      </header>

      <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Notice List */}
        <aside className="lg:col-span-4">

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/70 overflow-hidden">

            <div className="p-4 border-b border-outline-variant">
              <h2 className="font-bold text-lg text-on-surface">
                Latest Notices
              </h2>

              <p className="text-xs text-on-surface-variant mt-1">
                {notices.length} notice
                {notices.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="divide-y divide-outline-variant">

              {notices.map((notice) => {
                const isSelected =
                  selectedNotice?.ID === notice.ID;

                return (
                  <button
                    key={notice.ID}
                    onClick={() =>
                      setSelectedNotice(notice)
                    }
                    className={`w-full text-left p-4 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary/10"
                        : "hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getTagClasses(
                            notice.TAG
                          )}`}
                        >
                          {notice.TAG || notice.CATEGORY || "Notice"}
                        </span>

                        <h3 className="font-semibold text-on-surface mt-2">
                          {notice.TITLE}
                        </h3>

                        <p className="text-xs text-on-surface-variant mt-1">
                          {notice.AUTHOR}
                        </p>

                        <p className="text-[11px] text-outline mt-1">
                          {formatDate(
                            notice.CREATED_AT
                          )}
                        </p>

                      </div>

                      <span className="material-symbols-outlined text-outline">
                        chevron_right
                      </span>

                    </div>
                  </button>
                );
              })}

            </div>

          </div>

        </aside>

        {/* Selected Notice */}
        <article className="lg:col-span-8 space-y-6">

          {/* Notice Header */}
          <section>

            <div className="flex items-center gap-2 mb-3">

              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getTagClasses(
                  selectedNotice.TAG
                )}`}
              >
                {selectedNotice.TAG ||
                  selectedNotice.CATEGORY ||
                  "Notice"}
              </span>

              {selectedNotice.CATEGORY && (
                <span className="text-xs text-outline">
                  {selectedNotice.CATEGORY}
                </span>
              )}

            </div>

            <h2 className="font-headline-lg md:font-display-lg text-on-surface font-bold">
              {selectedNotice.TITLE}
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-on-surface-variant">

              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[17px]">
                  account_balance
                </span>

                {selectedNotice.AUTHOR}
              </span>

              <span>•</span>

              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[17px]">
                  calendar_today
                </span>

                {formatDate(
                  selectedNotice.CREATED_AT
                )}
              </span>

            </div>

          </section>

          {/* Copilot Summary */}
          {selectedNotice.AI_SUMMARY && (
            <section className="bg-surface-container-lowest rounded-xl border border-tertiary/20 p-5 shadow-sm">

              <div className="flex items-center gap-2 text-tertiary mb-3">

                <span
                  className="material-symbols-outlined"
                  style={{
                    fontVariationSettings:
                      "'FILL' 1",
                  }}
                >
                  auto_awesome
                </span>

                <h3 className="font-title-md font-bold">
                  Copilot Summary
                </h3>

              </div>

              <p className="text-on-surface-variant leading-relaxed">
                {selectedNotice.AI_SUMMARY}
              </p>

              <Link
                to="/ai-chat"
                className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-tertiary hover:underline"
              >
                <span className="material-symbols-outlined text-[17px]">
                  smart_toy
                </span>

                Ask Copilot about this notice
              </Link>

            </section>
          )}

          {/* Full Notice */}
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/70 p-5 md:p-6">

            <div className="flex items-center gap-2 mb-4">

              <span className="material-symbols-outlined text-primary">
                description
              </span>

              <h3 className="font-title-md font-bold">
                Full Notice
              </h3>

            </div>

            <div className="text-on-surface leading-7 whitespace-pre-line">
              {selectedNotice.CONTENT ||
                "No additional notice content available."}
            </div>

          </section>

        </article>

      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg lg:hidden">

        <div className="flex justify-around items-center w-full h-full px-4">

          <Link
            to="/dashboard"
            className="flex flex-col items-center text-on-surface-variant"
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
            className="flex flex-col items-center text-on-surface-variant"
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
            className="flex flex-col items-center text-on-surface-variant"
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
            className="flex flex-col items-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined">
              assignment
            </span>

            <span className="text-[10px] mt-1">
              Tasks
            </span>
          </Link>

          <Link
            to="/notices"
            className="flex flex-col items-center text-primary font-bold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              campaign
            </span>

            <span className="text-[10px] mt-1">
              Notices
            </span>
          </Link>

        </div>

      </nav>

    </div>
  );
}