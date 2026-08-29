import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { authService } from "../../services/api";
import StudentNotificationBell from "./StudentNotificationBell";

const API_URL = "http://localhost:5000";

const SUBJECT_THEMES = [
  {
    accent: "bg-secondary",
    text: "text-secondary",
    soft: "bg-secondary-container text-on-secondary-container",
    inactive: "bg-secondary-container/20",
  },
  {
    accent: "bg-primary",
    text: "text-primary",
    soft: "bg-primary-fixed text-on-primary-fixed-variant",
    inactive: "bg-primary-fixed/40",
  },
  {
    accent: "bg-tertiary",
    text: "text-tertiary",
    soft: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
    inactive: "bg-tertiary-fixed/40",
  },
];

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "ST";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getOpenResourceUrl(value) {
  const url = String(value || "").trim();

  if (!url) return "";

  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

function getQaErrorMessage(code, fallback) {
  switch (code) {
    case "AI_QUOTA_EXCEEDED":
      return "CampusCopilot Intelligence has reached its current AI usage limit. You can still open and study this resource normally.";

    case "AI_CHAT_RATE_LIMIT":
      return "You are sending AI questions too quickly. Please wait a few minutes before asking another question.";

    case "AI_CHAT_DAILY_LIMIT":
      return "You have reached your current CampusCopilot Q&A allowance. You can continue using the Resource Hub normally.";

    case "AI_PROJECT_DAILY_LIMIT":
      return "CampusCopilot Intelligence has reached the current application AI allowance. Please try again later.";

    case "RESOURCE_NOT_INDEXED":
      return "This resource has not been indexed for CampusCopilot Q&A.";

    case "RESOURCE_ACCESS_DENIED":
      return "This resource is not available for your semester.";

    case "RESOURCE_CONTEXT_EMPTY":
      return "CampusCopilot could not retrieve readable content from this resource.";

    default:
      return (
        fallback ||
        "CampusCopilot could not answer this question right now."
      );
  }
}

function getResourceIcon(type) {
  switch (String(type || "").toLowerCase()) {
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
      return "description";
  }
}

function getResourceIconStyle(type) {
  switch (String(type || "").toLowerCase()) {
    case "pdf":
      return "bg-error-container text-on-error-container";

    case "notes":
      return "bg-secondary-container text-on-secondary-container";

    case "question paper":
      return "bg-surface-container-high text-on-surface-variant";

    case "video":
      return "bg-primary-fixed text-on-primary-fixed-variant";

    case "link":
      return "bg-tertiary-fixed text-on-tertiary-fixed-variant";

    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
}

export default function ResourceHubPage() {
  const currentUser = authService.getCurrentUser();

  const studentRoll = String(
    currentUser?.studentRoll ||
      currentUser?.rollNumber ||
      currentUser?.student_roll ||
      currentUser?.roll ||
      ""
  ).trim();

  const studentInitials = getInitials(currentUser?.name);

  const [searchTerm, setSearchTerm] = useState("");
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSubjectCode, setActiveSubjectCode] = useState("");

  const [selectedResource, setSelectedResource] = useState(null);
  const [question, setQuestion] = useState("");
  const [qaMessages, setQaMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [qaError, setQaError] = useState("");
  const [qaErrorCode, setQaErrorCode] = useState("");

  async function loadResources() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/resources`);

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          `Resource API returned an invalid response (${response.status}).`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load resources"
        );
      }

      setResources(
        Array.isArray(data) ? data : []
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
  }

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    if (!selectedResource) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedResource(null);
        setQuestion("");
        setQaError("");
        setQaErrorCode("");
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selectedResource]);

  const subjects = useMemo(() => {
    const grouped = {};

    resources.forEach((resource) => {
      const code = String(
        resource.SUBJECT_CODE || "UNKNOWN"
      ).trim();

      if (!grouped[code]) {
        grouped[code] = {
          code,

          title:
            resource.SUBJECT_NAME ||
            code,

          semester:
            resource.SEMESTER ||
            null,

          resources: [],
        };
      }

      const ragReady =
        Number(resource.RAG_READY) === 1 ||
        Number(resource.CHUNK_COUNT) > 0;

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

        chunkCount:
          Number(
            resource.CHUNK_COUNT
          ) || 0,

        ragReady,

        subjectCode:
          resource.SUBJECT_CODE,

        subjectName:
          resource.SUBJECT_NAME ||
          resource.SUBJECT_CODE,
      });
    });

    return Object.values(grouped).map(
      (subject, index) => ({
        ...subject,

        theme:
          SUBJECT_THEMES[
            index %
              SUBJECT_THEMES.length
          ],
      })
    );
  }, [resources]);

  useEffect(() => {
    if (subjects.length === 0) {
      setActiveSubjectCode("");
      return;
    }

    const stillExists =
      subjects.some(
        (subject) =>
          subject.code ===
          activeSubjectCode
      );

    if (!stillExists) {
      setActiveSubjectCode(
        subjects[0].code
      );
    }
  }, [
    subjects,
    activeSubjectCode,
  ]);

  const activeSubject =
    useMemo(() => {
      return (
        subjects.find(
          (subject) =>
            subject.code ===
            activeSubjectCode
        ) ||
        subjects[0] ||
        null
      );
    }, [
      subjects,
      activeSubjectCode,
    ]);

  const searchResults =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return null;
      }

      const results = [];

      subjects.forEach(
        (subject) => {
          subject.resources.forEach(
            (resource) => {
              const matches =
                subject.title
                  .toLowerCase()
                  .includes(query) ||
                subject.code
                  .toLowerCase()
                  .includes(query) ||
                String(
                  resource.title ||
                    ""
                )
                  .toLowerCase()
                  .includes(query) ||
                String(
                  resource.type ||
                    ""
                )
                  .toLowerCase()
                  .includes(query) ||
                String(
                  resource.desc ||
                    ""
                )
                  .toLowerCase()
                  .includes(query);

              if (matches) {
                results.push({
                  ...resource,
                  subject,
                });
              }
            }
          );
        }
      );

      return results;
    }, [
      subjects,
      searchTerm,
    ]);

  const totalFiles =
    useMemo(() => {
      return subjects.reduce(
        (
          total,
          subject
        ) =>
          total +
          subject.resources.length,
        0
      );
    }, [subjects]);

  function handleOpenResource(
    resource
  ) {
    const openUrl =
      getOpenResourceUrl(
        resource.url
      );

    if (!openUrl) {
      return;
    }

    window.open(
      openUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleOpenQa(
    resource
  ) {
    if (!resource.ragReady) {
      return;
    }

    setSelectedResource(
      resource
    );

    setQuestion("");
    setQaMessages([]);
    setQaError("");
    setQaErrorCode("");
  }

  function handleCloseQa() {
    if (asking) {
      return;
    }

    setSelectedResource(null);
    setQuestion("");
    setQaMessages([]);
    setQaError("");
    setQaErrorCode("");
  }

  async function handleAskQuestion(
    event,
    questionOverride = null
  ) {
    if (event) {
      event.preventDefault();
    }

    if (!selectedResource) {
      return;
    }

    const cleanQuestion =
      String(
        questionOverride ??
          question
      ).trim();

    if (!cleanQuestion) {
      setQaError(
        "Ask a question about this resource."
      );

      return;
    }

    if (!studentRoll) {
      setQaError(
        "Your student roll number could not be found. Please log in again."
      );

      return;
    }

    try {
      setAsking(true);
      setQaError("");
      setQaErrorCode("");

      setQaMessages(
        (previous) => [
          ...previous,

          {
            id:
              `user-${Date.now()}`,

            sender:
              "user",

            text:
              cleanQuestion,
          },
        ]
      );

      setQuestion("");

      const token =
        localStorage.getItem(
          "campus_token"
        );

      const response =
        await fetch(
          `${API_URL}/api/ai/resource-chat`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {}),
            },

            body:
              JSON.stringify({
                studentRoll,

                resourceId:
                  selectedResource.id,

                question:
                  cleanQuestion,
              }),
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        throw new Error(
          `CampusCopilot returned an invalid response (${response.status}).`
        );
      }

      const data =
        await response.json();

      if (!response.ok) {
        const requestError =
          new Error(
            data.error ||
              "CampusCopilot could not answer this question."
          );

        requestError.code =
          data.code ||
          "";

        throw requestError;
      }

      if (!data.answer) {
        throw new Error(
          "CampusCopilot returned an empty answer."
        );
      }

      setQaMessages(
        (previous) => [
          ...previous,

          {
            id:
              `assistant-${Date.now()}`,

            sender:
              "assistant",

            text:
              data.answer,

            grounded:
              data.grounded === true,

            retrieval:
              data.retrieval ||
              null,
          },
        ]
      );
    } catch (err) {
      console.error(
        "Resource Q&A error:",
        err
      );

      const code =
        err.code ||
        "";

      setQaErrorCode(
        code
      );

      setQaError(
        getQaErrorMessage(
          code,
          err.message
        )
      );
    } finally {
      setAsking(false);
    }
  }

  const suggestedQuestions = [
    "Summarize this resource.",
    "Explain the main concepts in this resource.",
    "Create 5 viva questions from this resource.",
    "List the key points from this resource.",
  ];

  function renderResourceRow(
    resource,
    subject,
    showSubjectTag = false
  ) {
    return (
      <div
        key={`${subject.code}-${resource.id}`}
        className="
          w-full
          min-h-[118px]
          rounded-xl
          border
          border-outline-variant
          bg-surface
          px-4
          py-4
          flex
          items-stretch
          gap-4
        "
      >
        {/* LEFT SIDE */}

        <button
          type="button"
          onClick={() =>
            handleOpenResource(
              resource
            )
          }
          className="
            flex
            items-center
            gap-4
            flex-1
            min-w-0
            text-left
            group
          "
        >
          <div
            className={`
              w-12
              h-12
              rounded-xl
              flex
              items-center
              justify-center
              shrink-0
              ${getResourceIconStyle(
                resource.type
              )}
            `}
          >
            <span className="material-symbols-outlined text-[22px]">
              {getResourceIcon(
                resource.type
              )}
            </span>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="
                  font-title-md
                  text-[18px]
                  leading-6
                  font-semibold
                  text-on-surface
                  group-hover:text-primary
                  transition-colors
                "
              >
                {resource.title}
              </span>

              {showSubjectTag && (
                <span
                  className={`
                    font-label-caps
                    text-[10px]
                    px-2
                    py-1
                    rounded-md
                    shrink-0
                    ${subject.theme.soft}
                  `}
                >
                  {subject.code}
                </span>
              )}
            </div>

            <p
              className="
                font-body-sm
                text-[15px]
                leading-6
                text-on-surface-variant
                mt-1
              "
            >
              {resource.desc ||
                "Study material"}
            </p>

            {resource.semester && (
              <span
                className="
                  font-mono-sm
                  text-[11px]
                  text-outline
                  mt-1
                "
              >
                Semester{" "}
                {resource.semester}
              </span>
            )}
          </div>
        </button>

        {/* RIGHT SIDE */}

        <div
          className="
            flex
            flex-col
            items-end
            justify-between
            shrink-0
            min-w-[160px]
          "
        >
          <span
            className="
              font-mono-sm
              text-[12px]
              text-outline
              uppercase
            "
          >
            {resource.type ||
              "FILE"}
          </span>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() =>
                handleOpenResource(
                  resource
                )
              }
              className="
                px-3
                py-2
                rounded-lg
                border
                border-outline-variant
                text-primary
                text-sm
                font-semibold
                hover:bg-primary/5
                transition-colors
              "
            >
              Open
            </button>

            {resource.ragReady && (
              <button
                type="button"
                onClick={() =>
                  handleOpenQa(
                    resource
                  )
                }
                className="
                  flex
                  items-center
                  gap-2
                  px-4
                  py-2
                  rounded-lg
                  text-sm
                  font-semibold
                  text-white
                  bg-gradient-to-r
                  from-secondary
                  to-tertiary
                  hover:opacity-90
                  transition-opacity
                "
              >
                <span className="material-symbols-outlined text-[16px]">
                  auto_awesome
                </span>

                Ask Copilot
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-0 font-body-md">

      {/* TOP BAR */}

      <header className="sticky top-0 w-full z-50 bg-surface border-b border-surface-container-high">
        <div
          className="
            flex
            justify-between
            items-center
            px-margin-mobile
            md:px-margin-desktop
            w-full
            h-[64px]
            max-w-[1440px]
            mx-auto
          "
        >
          <div className="flex items-center gap-xs">
            <Link
              to="/profile"
              className="
                w-8
                h-8
                rounded-full
                bg-primary-container
                text-on-primary-container
                flex
                items-center
                justify-center
                font-bold
                text-xs
              "
            >
              {studentInitials}
            </Link>

            <h1 className="font-headline-lg-mobile font-bold text-primary">
              CampusCopilot
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <StudentNotificationBell />

            <Link
              to="/dashboard"
              className="
                hidden
                sm:inline-flex
                text-xs
                font-semibold
                text-primary
                px-3
                py-1.5
                rounded-lg
                bg-primary/10
                hover:bg-primary/20
                transition-colors
              "
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN */}

      <main
        className="
          max-w-[1440px]
          mx-auto
          w-full
          px-margin-mobile
          md:px-margin-desktop
          py-md
          md:py-lg
        "
      >
        <div className="max-w-5xl mx-auto">

          {/* TITLE */}

          <section className="mb-md">
            <div
              className="
                flex
                flex-col
                sm:flex-row
                sm:items-baseline
                sm:justify-between
                gap-2
              "
            >
              <h2 className="font-headline-lg-mobile md:font-headline-lg font-semibold text-primary">
                Resource Hub
              </h2>

              {!loading &&
                !error && (
                  <span className="font-mono-sm text-outline">
                    {subjects.length}{" "}
                    {subjects.length ===
                    1
                      ? "subject"
                      : "subjects"}{" "}
                    ·{" "}
                    {totalFiles}{" "}
                    {totalFiles ===
                    1
                      ? "file"
                      : "files"}
                  </span>
                )}
            </div>

            <p className="font-body-sm text-on-surface-variant mt-1">
              Everything filed by course,
              with CampusCopilot-powered
              document Q&amp;A.
            </p>
          </section>

          {/* SEARCH */}

          <section className="mb-md">
            <div className="relative w-full">
              <span
                className="
                  material-symbols-outlined
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-outline
                  text-[20px]
                  pointer-events-none
                "
              >
                search
              </span>

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search notes, papers, videos..."
                className="
                  w-full
                  h-[46px]
                  bg-surface-container-lowest
                  border
                  border-outline-variant
                  rounded-lg
                  pl-10
                  pr-4
                  font-body-sm
                  text-on-surface
                  placeholder:text-outline
                  focus:outline-none
                  focus:border-primary
                  focus:ring-2
                  focus:ring-primary/20
                  transition-all
                "
              />
            </div>
          </section>

          {/* ERROR */}

          {error && (
            <div className="mb-md p-3 rounded-lg bg-error-container text-on-error-container text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[19px]">
                error
              </span>

              {error}
            </div>
          )}

          {/* LOADING */}

          {loading && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-10 text-center">
              <span className="material-symbols-outlined text-4xl text-primary animate-pulse">
                progress_activity
              </span>

              <p className="font-body-sm text-on-surface-variant mt-2">
                Loading study resources...
              </p>
            </div>
          )}

          {/* EMPTY */}

          {!loading &&
            !error &&
            subjects.length === 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-10 text-center">
                <span className="material-symbols-outlined text-5xl text-outline">
                  folder_open
                </span>

                <h3 className="font-title-md text-on-surface mt-3">
                  No resources found
                </h3>

                <p className="font-body-sm text-on-surface-variant mt-1">
                  No study resources
                  have been added yet.
                </p>
              </div>
            )}

          {/* SEARCH RESULTS */}

          {!loading &&
            !error &&
            searchResults !== null && (
              <section className="flex flex-col gap-3">
                {searchResults.length ===
                0 ? (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-lg py-lg text-center">
                    <span className="material-symbols-outlined text-4xl text-outline">
                      search_off
                    </span>

                    <h3 className="font-title-md text-on-surface mt-2">
                      No matching resources
                    </h3>

                    <p className="font-body-sm text-on-surface-variant mt-1">
                      Try another subject,
                      title, or resource
                      type.
                    </p>
                  </div>
                ) : (
                  searchResults.map(
                    (resource) =>
                      renderResourceRow(
                        resource,
                        resource.subject,
                        true
                      )
                  )
                )}
              </section>
            )}

          {/* SUBJECT TABS */}

          {!loading &&
            !error &&
            searchResults === null &&
            activeSubject && (
              <>
                <div
                  className="
                    flex
                    gap-1
                    overflow-x-auto
                    pb-0
                    -mb-px
                  "
                >
                  {subjects.map(
                    (subject) => {
                      const isActive =
                        subject.code ===
                        activeSubject.code;

                      return (
                        <button
                          key={
                            subject.code
                          }
                          type="button"
                          onClick={() =>
                            setActiveSubjectCode(
                              subject.code
                            )
                          }
                          className={`
                            relative
                            shrink-0
                            px-5
                            pt-3
                            pb-3
                            text-left
                            transition-all
                            min-w-[150px]
                            border
                            ${
                              isActive
                                ? "bg-surface-container-lowest border-outline-variant border-b-white rounded-t-lg z-20 translate-y-0"
                                : `${subject.theme.inactive} border-transparent rounded-t-lg translate-y-1 z-10 hover:translate-y-0`
                            }
                          `}
                        >
                          <div
                            className={`
                              absolute
                              left-4
                              right-4
                              top-0
                              h-[3px]
                              rounded-b
                              ${subject.theme.accent}
                            `}
                          />

                          <div
                            className={`
                              font-label-caps
                              text-[11px]
                              tracking-wide
                              ${
                                isActive
                                  ? subject
                                      .theme
                                      .text
                                  : "text-outline"
                              }
                            `}
                          >
                            {subject.code}
                          </div>

                          <div
                            className={`
                              font-title-md
                              text-sm
                              font-semibold
                              truncate
                              ${
                                isActive
                                  ? "text-on-surface"
                                  : "text-on-surface-variant"
                              }
                            `}
                          >
                            {subject.title}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>

                {/* ACTIVE SUBJECT */}

                <section
                  className="
                    bg-surface-container-lowest
                    border
                    border-outline-variant
                    rounded-b-lg
                    rounded-tr-lg
                    p-sm
                    md:p-md
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                      mb-md
                    "
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`
                          font-label-caps
                          text-[11px]
                          px-2
                          py-1
                          rounded
                          ${activeSubject.theme.soft}
                        `}
                      >
                        {activeSubject.code}
                      </span>

                      {activeSubject.semester && (
                        <span className="font-body-sm text-xs text-on-surface-variant">
                          Semester{" "}
                          {
                            activeSubject.semester
                          }
                        </span>
                      )}
                    </div>

                    <span className="font-mono-sm text-xs text-outline shrink-0">
                      {
                        activeSubject
                          .resources
                          .length
                      }{" "}
                      {
                        activeSubject
                          .resources
                          .length === 1
                          ? "file"
                          : "files"
                      }
                    </span>
                  </div>

                  {/* EQUAL SIZE RESOURCE BOXES */}

                  <div className="flex flex-col gap-3">
                    {activeSubject.resources.map(
                      (resource) =>
                        renderResourceRow(
                          resource,
                          activeSubject
                        )
                    )}
                  </div>
                </section>
              </>
            )}
        </div>
      </main>

      {/* RESOURCE Q&A MODAL */}

      {selectedResource && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            bg-black/25
            backdrop-blur-[12px]
            flex
            items-end
            md:items-center
            justify-center
            p-0
            md:p-6
          "
        >
          <div
            className="
              relative
              bg-surface-container-lowest
              w-full
              md:max-w-3xl
              h-[92vh]
              md:h-[82vh]
              rounded-t-2xl
              md:rounded-2xl
              border
              border-outline-variant
              flex
              flex-col
              overflow-hidden
              shadow-[0_12px_40px_rgba(55,0,126,0.10)]
            "
          >

            {/* MODAL HEADER */}

            <div
              className="
                p-4
                md:p-5
                border-b
                border-outline-variant
                bg-tertiary-fixed/35
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="
                    w-10
                    h-10
                    rounded-xl
                    bg-tertiary
                    text-on-tertiary
                    flex
                    items-center
                    justify-center
                    shrink-0
                  "
                >
                  <span className="material-symbols-outlined">
                    auto_awesome
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-title-md font-bold text-on-surface text-base md:text-lg">
                      Ask CampusCopilot
                    </h2>

                    <span
                      className="
                        font-label-caps
                        px-2.5
                        h-[20px]
                        inline-flex
                        items-center
                        justify-center
                        rounded-full
                        bg-secondary-container
                        text-on-secondary-container
                        text-[9px]
                        whitespace-nowrap
                      "
                    >
                      GROUNDED
                    </span>
                  </div>

                  <p className="font-body-sm text-sm font-semibold text-tertiary mt-1 truncate">
                    {
                      selectedResource.title
                    }
                  </p>

                  <p className="font-mono-sm text-xs text-on-surface-variant mt-0.5">
                    {
                      selectedResource.subjectCode
                    }{" "}
                    ·{" "}
                    {
                      selectedResource.chunkCount
                    }{" "}
                    indexed chunks
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  handleCloseQa
                }
                disabled={asking}
                className="
                  w-9
                  h-9
                  rounded-full
                  flex
                  items-center
                  justify-center
                  text-on-surface-variant
                  hover:bg-surface-container-high
                  transition-colors
                  disabled:opacity-40
                  shrink-0
                "
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              {qaMessages.length ===
              0 ? (
                <div className="max-w-xl mx-auto py-6">
                  <div className="text-center">
                    <div
                      className="
                        w-14
                        h-14
                        rounded-2xl
                        bg-tertiary-fixed
                        text-on-tertiary-fixed-variant
                        flex
                        items-center
                        justify-center
                        mx-auto
                      "
                    >
                      <span className="material-symbols-outlined text-[30px]">
                        menu_book
                      </span>
                    </div>

                    <h3 className="font-title-md font-bold text-on-surface mt-4">
                      Ask questions from
                      this resource
                    </h3>

                    <p className="font-body-sm text-on-surface-variant mt-2 leading-relaxed">
                      CampusCopilot
                      retrieves relevant
                      sections from this
                      document and answers
                      using only the
                      indexed material.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
                    {suggestedQuestions.map(
                      (
                        suggestion
                      ) => (
                        <button
                          type="button"
                          key={
                            suggestion
                          }
                          onClick={() =>
                            handleAskQuestion(
                              null,
                              suggestion
                            )
                          }
                          disabled={
                            asking
                          }
                          className="
                            text-left
                            p-3
                            rounded-xl
                            border
                            border-outline-variant
                            bg-surface-container-low
                            hover:border-tertiary
                            hover:bg-tertiary-fixed/25
                            transition-all
                            font-body-sm
                            text-xs
                            font-semibold
                            text-on-surface
                            disabled:opacity-50
                          "
                        >
                          {suggestion}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                  {qaMessages.map(
                    (message) => (
                      <div
                        key={
                          message.id
                        }
                        className={`flex ${
                          message.sender ===
                          "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        {message.sender ===
                        "user" ? (
                          <div
                            className="
                              max-w-[85%]
                              bg-primary
                              text-on-primary
                              rounded-2xl
                              rounded-br-md
                              px-4
                              py-3
                            "
                          >
                            <p className="font-body-sm text-sm whitespace-pre-wrap leading-relaxed">
                              {
                                message.text
                              }
                            </p>
                          </div>
                        ) : (
                          <div
                            className="
                              max-w-[92%]
                              bg-tertiary-fixed/25
                              border
                              border-tertiary-fixed-dim
                              rounded-2xl
                              rounded-bl-md
                              px-4
                              py-3
                            "
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="material-symbols-outlined text-tertiary text-[17px]">
                                auto_awesome
                              </span>

                              <span className="font-label-caps text-xs font-bold text-tertiary">
                                CampusCopilot
                                Intelligence
                              </span>

                              {message.grounded && (
                                <span
                                  className="
                                    font-label-caps
                                    inline-flex
                                    items-center
                                    justify-center
                                    min-w-[105px]
                                    h-[19px]
                                    px-2.5
                                    rounded-full
                                    bg-secondary-container
                                    text-on-secondary-container
                                    text-[8px]
                                    whitespace-nowrap
                                  "
                                >
                                  RESOURCE
                                  GROUNDED
                                </span>
                              )}
                            </div>

                            <p className="font-body-sm text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                              {
                                message.text
                              }
                            </p>

                            {message.retrieval && (
                              <div className="font-mono-sm mt-3 pt-2 border-t border-outline-variant text-[10px] text-outline flex flex-wrap gap-x-3 gap-y-1">
                                <span>
                                  {
                                    message
                                      .retrieval
                                      .chunksUsed
                                  }{" "}
                                  chunks
                                  used
                                </span>

                                <span>
                                  Source:{" "}
                                  {
                                    selectedResource.title
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {asking && (
                    <div className="flex justify-start">
                      <div
                        className="
                          bg-tertiary-fixed/25
                          border
                          border-tertiary-fixed-dim
                          rounded-2xl
                          rounded-bl-md
                          px-4
                          py-3
                        "
                      >
                        <div className="flex items-center gap-2 font-label-caps text-sm text-tertiary font-semibold">
                          <span className="material-symbols-outlined animate-pulse text-[18px]">
                            auto_awesome
                          </span>

                          Searching this
                          resource...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Q&A ERROR */}

              {qaError && (
                <div className="max-w-2xl mx-auto mt-4">
                  <div
                    className={`rounded-xl p-3 text-sm flex items-start gap-2 ${
                      qaErrorCode ===
                      "AI_QUOTA_EXCEEDED"
                        ? "bg-surface-container-low border border-outline-variant text-on-surface-variant"
                        : "bg-error-container text-on-error-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      {qaErrorCode ===
                      "AI_QUOTA_EXCEEDED"
                        ? "schedule"
                        : "error"}
                    </span>

                    <div>
                      <p className="font-body-sm font-semibold">
                        {qaError}
                      </p>

                      {qaErrorCode ===
                        "AI_QUOTA_EXCEEDED" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenResource(
                              selectedResource
                            )
                          }
                          className="mt-2 text-primary font-bold text-xs hover:underline"
                        >
                          Open resource
                          instead
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* QUESTION INPUT */}

            <form
              onSubmit={
                handleAskQuestion
              }
              className="
                border-t
                border-outline-variant
                bg-surface/90
                backdrop-blur-[12px]
                p-3
                md:p-4
              "
            >
              <div className="max-w-2xl mx-auto">
                <div className="flex items-end gap-2">
                  <textarea
                    value={question}
                    onChange={(event) =>
                      setQuestion(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        if (
                          !asking &&
                          question.trim()
                        ) {
                          handleAskQuestion(
                            null
                          );
                        }
                      }
                    }}
                    placeholder="Ask something from this resource..."
                    rows={2}
                    maxLength={2000}
                    disabled={asking}
                    className="
                      flex-1
                      resize-none
                      rounded-lg
                      border
                      border-outline-variant
                      bg-surface-container-lowest
                      px-3
                      py-2.5
                      font-body-sm
                      text-sm
                      text-on-surface
                      placeholder:text-outline
                      focus:outline-none
                      focus:border-primary
                      focus:ring-2
                      focus:ring-primary/20
                      disabled:opacity-60
                    "
                  />

                  <button
                    type="submit"
                    disabled={
                      asking ||
                      !question.trim()
                    }
                    className="
                      w-11
                      h-11
                      rounded-lg
                      bg-gradient-to-r
                      from-secondary
                      to-tertiary
                      text-white
                      flex
                      items-center
                      justify-center
                      hover:opacity-90
                      transition-opacity
                      disabled:opacity-40
                      disabled:cursor-not-allowed
                      shrink-0
                    "
                  >
                    <span className="material-symbols-outlined">
                      send
                    </span>
                  </button>
                </div>

                <div className="font-mono-sm flex justify-between items-center mt-1.5 text-[10px] text-outline">
                  <span>
                    Answers are limited
                    to the selected study
                    resource.
                  </span>

                  <span>
                    {question.length}
                    /2000
                  </span>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE NAV */}

      <nav className="md:hidden fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-outline-variant">
        <div className="flex justify-around items-center px-xs w-full h-full">

          <Link
            to="/dashboard"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform duration-200 active:scale-90 w-16"
          >
            <span className="material-symbols-outlined text-[24px]">
              home
            </span>

            <span className="font-label-caps text-[10px] mt-1">
              Home
            </span>
          </Link>

          <Link
            to="/attendance"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform duration-200 active:scale-90 w-16"
          >
            <span className="material-symbols-outlined text-[24px]">
              analytics
            </span>

            <span className="font-label-caps text-[10px] mt-1">
              Attendance
            </span>
          </Link>

          <Link
            to="/ai-chat"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform duration-200 active:scale-90 w-16"
          >
            <span className="material-symbols-outlined text-[24px]">
              smart_toy
            </span>

            <span className="font-label-caps text-[10px] mt-1">
              Copilot
            </span>
          </Link>

          <Link
            to="/assignments"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform duration-200 active:scale-90 w-16"
          >
            <span className="material-symbols-outlined text-[24px]">
              assignment
            </span>

            <span className="font-label-caps text-[10px] mt-1">
              Tasks
            </span>
          </Link>

          <Link
            to="/resources"
            className="
              relative
              flex
              flex-col
              items-center
              justify-center
              text-primary
              font-bold
              transition-transform
              duration-200
              active:scale-90
              w-16
              after:content-['']
              after:w-1
              after:h-1
              after:bg-primary
              after:rounded-full
              after:mt-1
            "
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              menu
            </span>

            <span className="font-label-caps text-[10px] mt-1">
              More
            </span>
          </Link>
        </div>
      </nav>
    </div>
  );
}