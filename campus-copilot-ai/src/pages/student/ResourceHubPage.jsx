import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

const API_URL = "http://localhost:5000";

export default function ResourceHubPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const [resources, setResources] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // =====================================================
  // LOAD REAL RESOURCES
  // =====================================================

  const loadResources = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/resources`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load resources"
        );
      }

      setResources(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "Resource Hub load error:",
        err
      );

      setError(
        err.message ||
          "Unable to load study resources."
      );

      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  // =====================================================
  // RESOURCE ICON
  // =====================================================

  const getResourceIcon = (type) => {
    switch (
      String(type || "").toLowerCase()
    ) {
      case "pdf":
        return "picture_as_pdf";

      case "notes":
        return "description";

      case "question paper":
        return "history_edu";

      case "video":
        return "play_circle";

      case "link":
        return "link";

      default:
        return "folder_open";
    }
  };

  // =====================================================
  // RESOURCE ICON BACKGROUND
  // =====================================================

  const getResourceIconBg = (type) => {
    switch (
      String(type || "").toLowerCase()
    ) {
      case "pdf":
        return "bg-error-container text-on-error-container";

      case "notes":
        return "bg-secondary-container text-on-secondary-container";

      case "question paper":
        return "bg-surface-container-high text-on-surface-variant";

      case "video":
        return "bg-primary-container text-on-primary-container";

      case "link":
        return "bg-tertiary-container text-on-tertiary";

      default:
        return "bg-surface-container-high text-on-surface-variant";
    }
  };

  // =====================================================
  // SUBJECT CARD COLOR
  // =====================================================

  const subjectColors = [
    "bg-secondary",
    "bg-primary",
    "bg-tertiary",
  ];

  // =====================================================
  // GROUP DATABASE RESOURCES BY SUBJECT
  // =====================================================

  const subjects = useMemo(() => {
    const grouped = {};

    resources.forEach((resource) => {
      const code =
        resource.SUBJECT_CODE ||
        "UNKNOWN";

      if (!grouped[code]) {
        grouped[code] = {
          code,

          title:
            resource.SUBJECT_NAME ||
            code,

          resources: [],
        };
      }

      grouped[code].resources.push({
        id:
          resource.RESOURCE_ID,

        title:
          resource.TITLE,

        type:
          resource.RESOURCE_TYPE,

        desc:
          resource.DESCRIPTION,

        url:
          resource.RESOURCE_URL,

        semester:
          resource.SEMESTER,

        uploadedBy:
          resource.UPLOADED_BY,

        createdAt:
          resource.CREATED_AT,

        icon:
          getResourceIcon(
            resource.RESOURCE_TYPE
          ),

        iconBg:
          getResourceIconBg(
            resource.RESOURCE_TYPE
          ),
      });
    });

    return Object.values(grouped).map(
      (subject, index) => ({
        ...subject,

        color:
          subjectColors[
            index %
              subjectColors.length
          ],
      })
    );
  }, [resources]);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredSubjects = useMemo(() => {
    const search =
      searchTerm
        .trim()
        .toLowerCase();

    if (!search) {
      return subjects;
    }

    return subjects
      .map((subject) => {
        const subjectMatches =
          subject.title
            .toLowerCase()
            .includes(search) ||
          subject.code
            .toLowerCase()
            .includes(search);

        const matchingResources =
          subject.resources.filter(
            (resource) =>
              String(
                resource.title || ""
              )
                .toLowerCase()
                .includes(search) ||

              String(
                resource.type || ""
              )
                .toLowerCase()
                .includes(search) ||

              String(
                resource.desc || ""
              )
                .toLowerCase()
                .includes(search)
          );

        if (subjectMatches) {
          return subject;
        }

        if (
          matchingResources.length > 0
        ) {
          return {
            ...subject,
            resources:
              matchingResources,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [subjects, searchTerm]);

  // =====================================================
  // OPEN RESOURCE
  // =====================================================

  const handleOpenResource = (
    resource
  ) => {
    if (!resource.url) {
      return;
    }

    window.open(
      resource.url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">

      {/* TopAppBar */}

      <header className="sticky top-0 w-full z-50 bg-surface border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md">

        <div className="flex items-center gap-sm">

          <Link
            to="/profile"
            className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs"
          >
            RD
          </Link>

          <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
            CampusCopilot
          </h1>

        </div>

        <Link
          to="/dashboard"
          className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20"
        >
          Dashboard
        </Link>

      </header>

      {/* Main Content */}

      <main className="pt-6 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto w-full flex flex-col gap-lg">

        {/* Header & Search Section */}

        <section className="flex flex-col gap-sm">

          <div>

            <h2 className="font-headline-lg text-primary font-bold text-2xl md:text-3xl">
              Academic Resource Hub
            </h2>

            <p className="font-body-md text-on-surface-variant mt-1">
              Verified university syllabus notes, previous years question papers, and lab manuals.
            </p>

          </div>

          <div className="relative w-full max-w-2xl mt-2">

            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>

            <input
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-3 pl-10 pr-4 font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              placeholder="Search subjects, notes, past exam papers, lab codes..."
              type="text"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
            />

          </div>

        </section>

        {/* ERROR */}

        {error && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-sm flex items-center gap-2">

            <span className="material-symbols-outlined">
              error
            </span>

            {error}

          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-10 text-center">

            <span className="material-symbols-outlined text-4xl text-outline">
              progress_activity
            </span>

            <p className="font-body-md text-on-surface-variant mt-2">
              Loading study resources...
            </p>

          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          filteredSubjects.length ===
            0 && (
            <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-10 text-center">

              <span className="material-symbols-outlined text-5xl text-outline">
                folder_open
              </span>

              <h3 className="font-title-md font-bold text-on-surface mt-3">
                No resources found
              </h3>

              <p className="font-body-sm text-on-surface-variant mt-1">
                {searchTerm
                  ? "No resources match your search."
                  : "No study resources have been added yet."}
              </p>

            </div>
          )}

        {/* Subjects Grid */}

        {!loading &&
          !error &&
          filteredSubjects.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">

              {filteredSubjects.map(
                (sub) => (

                  <article
                    key={sub.code}
                    className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl overflow-hidden relative flex flex-col hover:shadow-lg transition-all"
                  >

                    <div
                      className={`h-1.5 w-full ${sub.color}`}
                    />

                    <div className="p-md flex flex-col flex-1 gap-sm">

                      <div className="flex justify-between items-start gap-3">

                        <h3 className="font-title-md font-bold text-on-surface text-lg">
                          {sub.title}
                        </h3>

                        <span className="bg-surface-container-high text-on-surface font-mono-sm text-xs px-2 py-0.5 rounded font-bold shrink-0">
                          {sub.code}
                        </span>

                      </div>

                      <div className="flex flex-col gap-2 mt-2">

                        {sub.resources.map(
                          (res) => (

                            <div
                              key={res.id}
                              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-container-low transition-colors border border-outline-variant/30 group"
                            >

                              <div className="flex items-center gap-3 min-w-0">

                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${res.iconBg}`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {
                                      res.icon
                                    }
                                  </span>
                                </div>

                                <div className="flex flex-col min-w-0">

                                  <span className="font-body-md font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">
                                    {res.title}
                                  </span>

                                  <span className="font-body-sm text-outline text-xs">
                                    {res.type}

                                    {res.semester
                                      ? ` • Semester ${res.semester}`
                                      : ""}
                                  </span>

                                  {res.desc && (
                                    <span className="font-body-sm text-outline text-xs mt-0.5 line-clamp-2">
                                      {
                                        res.desc
                                      }
                                    </span>
                                  )}

                                </div>

                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenResource(
                                    res
                                  )
                                }
                                className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Open Resource"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  open_in_new
                                </span>
                              </button>

                            </div>

                          )
                        )}

                      </div>

                    </div>

                  </article>

                )
              )}

            </section>
          )}

      </main>

      {/* Bottom Nav Bar (Mobile) */}

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
            to="/resources"
            className="flex flex-col items-center justify-center text-primary font-bold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              folder_open
            </span>

            <span className="text-[10px] mt-1">
              Resources
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