import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  authService,
} from "../../services/api";

import StudentNotificationBell from "./StudentNotificationBell";


const API_URL =
  "http://localhost:5000";


// =====================================================
// STUDENT INITIALS
// =====================================================

function getInitials(name) {
  const parts =
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "ST";
  }

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase()
    )
    .join("");
}


// =====================================================
// OPEN RESOURCE URL
// =====================================================

function getOpenResourceUrl(
  value
) {
  const url =
    String(
      value || ""
    ).trim();

  if (!url) {
    return "";
  }

  if (
    url.startsWith("/")
  ) {
    return `${API_URL}${url}`;
  }

  return url;
}


// =====================================================
// RESOURCE Q&A ERROR MESSAGE
// =====================================================

function getQaErrorMessage(
  code,
  fallback
) {
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


// =====================================================
// RESOURCE HUB
// =====================================================

export default function ResourceHubPage() {
  // =====================================================
  // CURRENT USER
  // =====================================================

  const currentUser =
    authService.getCurrentUser();

  const studentRoll =
    String(
      currentUser?.studentRoll ||
      currentUser?.rollNumber ||
      currentUser?.student_roll ||
      currentUser?.roll ||
      ""
    ).trim();

  const studentInitials =
    getInitials(
      currentUser?.name
    );


  // =====================================================
  // RESOURCE STATE
  // =====================================================

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    resources,
    setResources,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  // =====================================================
  // RESOURCE Q&A STATE
  // =====================================================

  const [
    selectedResource,
    setSelectedResource,
  ] = useState(null);

  const [
    question,
    setQuestion,
  ] = useState("");

  const [
    qaMessages,
    setQaMessages,
  ] = useState([]);

  const [
    asking,
    setAsking,
  ] = useState(false);

  const [
    qaError,
    setQaError,
  ] = useState("");

  const [
    qaErrorCode,
    setQaErrorCode,
  ] = useState("");


  // =====================================================
  // LOAD REAL RESOURCES
  // =====================================================

  const loadResources =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `${API_URL}/api/resources`
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
            `Resource API returned an invalid response (${response.status}).`
          );
        }

        const data =
          await response.json();

        if (
          !response.ok
        ) {
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
  // ESCAPE KEY CLOSE
  // =====================================================

  useEffect(() => {
    if (
      !selectedResource
    ) {
      return undefined;
    }

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          setSelectedResource(
            null
          );

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


  // =====================================================
  // RESOURCE ICON
  // =====================================================

  const getResourceIcon =
    (type) => {
      switch (
        String(
          type || ""
        ).toLowerCase()
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
  // ICON BACKGROUND
  // =====================================================

  const getResourceIconBg =
    (type) => {
      switch (
        String(
          type || ""
        ).toLowerCase()
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
  // SUBJECT COLORS
  // =====================================================

  const subjectColors = [
    "bg-secondary",
    "bg-primary",
    "bg-tertiary",
  ];


  // =====================================================
  // GROUP RESOURCES
  // =====================================================

  const subjects =
    useMemo(() => {
      const grouped = {};

      resources.forEach(
        (resource) => {
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

          const ragReady =
            Number(
              resource.RAG_READY
            ) === 1 ||
            Number(
              resource.CHUNK_COUNT
            ) > 0;

          grouped[
            code
          ].resources.push({
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

            icon:
              getResourceIcon(
                resource.RESOURCE_TYPE
              ),

            iconBg:
              getResourceIconBg(
                resource.RESOURCE_TYPE
              ),
          });
        }
      );

      return Object
        .values(grouped)
        .map(
          (
            subject,
            index
          ) => ({
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

  const filteredSubjects =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (!search) {
        return subjects;
      }

      return subjects
        .map(
          (subject) => {
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
                    resource.title ||
                    ""
                  )
                    .toLowerCase()
                    .includes(search) ||

                  String(
                    resource.type ||
                    ""
                  )
                    .toLowerCase()
                    .includes(search) ||

                  String(
                    resource.desc ||
                    ""
                  )
                    .toLowerCase()
                    .includes(search)
              );

            if (
              subjectMatches
            ) {
              return subject;
            }

            if (
              matchingResources.length >
              0
            ) {
              return {
                ...subject,

                resources:
                  matchingResources,
              };
            }

            return null;
          }
        )
        .filter(Boolean);

    }, [
      subjects,
      searchTerm,
    ]);


  // =====================================================
  // OPEN RESOURCE
  // =====================================================

  const handleOpenResource =
    (resource) => {
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
    };


  // =====================================================
  // OPEN Q&A
  // =====================================================

  const handleOpenQa =
    (resource) => {
      if (
        !resource.ragReady
      ) {
        return;
      }

      setSelectedResource(
        resource
      );

      setQuestion("");
      setQaMessages([]);
      setQaError("");
      setQaErrorCode("");
    };


  // =====================================================
  // CLOSE Q&A
  // =====================================================

  const handleCloseQa =
    () => {
      if (asking) {
        return;
      }

      setSelectedResource(
        null
      );

      setQuestion("");
      setQaMessages([]);
      setQaError("");
      setQaErrorCode("");
    };


  // =====================================================
  // ASK RESOURCE QUESTION
  // =====================================================

  const handleAskQuestion =
    async (
      event,
      questionOverride = null
    ) => {
      if (event) {
        event.preventDefault();
      }

      if (
        !selectedResource
      ) {
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
              method:
                "POST",

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

        if (
          !response.ok
        ) {
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

        if (
          !data.answer
        ) {
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
                data.grounded ===
                true,

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
    };


  // =====================================================
  // SUGGESTED QUESTIONS
  // =====================================================

  const suggestedQuestions = [
    "Summarize this resource.",
    "Explain the main concepts in this resource.",
    "Create 5 viva questions from this resource.",
    "List the key points from this resource.",
  ];


  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">

      {/* =================================================
          TOP APP BAR
      ================================================= */}

      <header className="sticky top-0 w-full z-50 bg-surface border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md">

        <div className="flex items-center gap-sm">

          <Link
            to="/profile"
            className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs"
          >
            {studentInitials}
          </Link>


          <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
            CampusCopilot
          </h1>

        </div>


        <div className="flex items-center gap-2">

          <StudentNotificationBell />


          <Link
            to="/dashboard"
            className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20"
          >
            Dashboard
          </Link>

        </div>

      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="pt-6 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto w-full flex flex-col gap-lg">

        {/* HEADER */}

        <section className="flex flex-col gap-sm">

          <div>

            <h2 className="font-headline-lg text-primary font-bold text-2xl md:text-3xl">
              Academic Resource Hub
            </h2>


            <p className="font-body-md text-on-surface-variant mt-1">
              Verified university study materials with CampusCopilot-powered document Q&A.
            </p>

          </div>


          {/* SEARCH */}

          <div className="relative w-full max-w-2xl mt-2">

            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>


            <input
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-3 pl-10 pr-4 font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              placeholder="Search subjects, notes, past exam papers, lab codes..."
              type="text"
              value={
                searchTerm
              }
              onChange={
                (event) =>
                  setSearchTerm(
                    event.target.value
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

            <span className="material-symbols-outlined text-4xl text-outline animate-pulse">
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


        {/* =================================================
            SUBJECT GRID
        ================================================= */}

        {!loading &&
          !error &&
          filteredSubjects.length >
            0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">

              {filteredSubjects.map(
                (subject) => (
                  <article
                    key={
                      subject.code
                    }
                    className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl overflow-hidden relative flex flex-col hover:shadow-lg transition-all"
                  >

                    <div
                      className={`h-1.5 w-full ${subject.color}`}
                    />


                    <div className="p-md flex flex-col flex-1 gap-sm">

                      {/* SUBJECT TITLE */}

                      <div className="flex justify-between items-start gap-3">

                        <h3 className="font-title-md font-bold text-on-surface text-lg">
                          {subject.title}
                        </h3>


                        <span className="bg-surface-container-high text-on-surface font-mono-sm text-xs px-2 py-0.5 rounded font-bold shrink-0">
                          {subject.code}
                        </span>

                      </div>


                      {/* RESOURCES */}

                      <div className="flex flex-col gap-2 mt-2">

                        {subject.resources.map(
                          (resource) => (
                            <div
                              key={
                                resource.id
                              }
                              className="p-3 rounded-lg hover:bg-surface-container-low transition-colors border border-outline-variant/30 group"
                            >

                              {/* RESOURCE INFO */}

                              <div className="flex items-start gap-3">

                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${resource.iconBg}`}
                                >

                                  <span className="material-symbols-outlined text-[18px]">
                                    {resource.icon}
                                  </span>

                                </div>


                                <div className="flex flex-col min-w-0 flex-1">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <span className="font-body-md font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">
                                      {resource.title}
                                    </span>


                                    {/* ================================
                                        SMALLER + LONGER AI READY BADGE
                                    ================================= */}

                                    {resource.ragReady && (
                                      <span className="inline-flex items-center justify-center gap-1 min-w-[78px] h-[20px] px-3 rounded-full bg-secondary-container text-on-secondary-container text-[9px] font-bold whitespace-nowrap shrink-0">

                                        <span className="material-symbols-outlined text-[11px] leading-none">
                                          auto_awesome
                                        </span>

                                        AI Ready

                                      </span>
                                    )}

                                  </div>


                                  <span className="font-body-sm text-outline text-xs mt-0.5">

                                    {resource.type}

                                    {resource.semester
                                      ? ` • Semester ${resource.semester}`
                                      : ""}

                                  </span>


                                  {resource.desc && (
                                    <span className="font-body-sm text-outline text-xs mt-1 line-clamp-2">
                                      {resource.desc}
                                    </span>
                                  )}


                                  {resource.ragReady && (
                                    <span className="font-body-sm text-secondary text-[11px] mt-1 flex items-center gap-1">

                                      <span className="material-symbols-outlined text-[13px]">
                                        database
                                      </span>

                                      {resource.chunkCount} searchable chunks

                                    </span>
                                  )}

                                </div>

                              </div>


                              {/* ACTIONS */}

                              <div className="flex flex-wrap items-center gap-2 mt-3">

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenResource(
                                      resource
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold"
                                >

                                  <span className="material-symbols-outlined text-[16px]">
                                    open_in_new
                                  </span>

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
                                    className="inline-flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary-container px-3 py-1.5 rounded-lg transition-colors text-xs font-bold shadow-sm"
                                  >

                                    <span className="material-symbols-outlined text-[16px]">
                                      auto_awesome
                                    </span>

                                    Ask CampusCopilot

                                  </button>
                                )}

                              </div>

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


      {/* =================================================
          RESOURCE Q&A MODAL
      ================================================= */}

      {selectedResource && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">

          <div className="bg-surface-container-lowest w-full md:max-w-3xl h-[92vh] md:h-[82vh] rounded-t-2xl md:rounded-2xl border border-outline-variant shadow-xl flex flex-col overflow-hidden">

            {/* HEADER */}

            <div className="p-4 md:p-5 border-b border-outline-variant bg-surface-container-low flex items-start justify-between gap-4">

              <div className="flex items-start gap-3 min-w-0">

                <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">

                  <span className="material-symbols-outlined">
                    auto_awesome
                  </span>

                </div>


                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <h2 className="font-title-md font-bold text-on-surface text-base md:text-lg">
                      Ask CampusCopilot
                    </h2>


                    <span className="px-2.5 h-[20px] inline-flex items-center justify-center rounded-full bg-secondary-container text-on-secondary-container text-[9px] font-bold whitespace-nowrap">
                      GROUNDED
                    </span>

                  </div>


                  <p className="text-sm font-semibold text-primary mt-1 truncate">
                    {selectedResource.title}
                  </p>


                  <p className="text-xs text-on-surface-variant mt-0.5">

                    {selectedResource.subjectCode}

                    {" • "}

                    {selectedResource.chunkCount}

                    {" indexed chunks"}

                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={
                  handleCloseQa
                }
                disabled={
                  asking
                }
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 shrink-0"
              >

                <span className="material-symbols-outlined">
                  close
                </span>

              </button>

            </div>


            {/* BODY */}

            <div className="flex-1 overflow-y-auto p-4 md:p-5">

              {qaMessages.length ===
              0 ? (
                <div className="max-w-xl mx-auto py-6">

                  <div className="text-center">

                    <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center mx-auto">

                      <span className="material-symbols-outlined text-[30px]">
                        menu_book
                      </span>

                    </div>


                    <h3 className="font-title-md font-bold text-on-surface mt-4">
                      Ask questions from this resource
                    </h3>


                    <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                      CampusCopilot retrieves relevant sections from this document and answers using only the indexed material.
                    </p>

                  </div>


                  {/* SUGGESTIONS */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">

                    {suggestedQuestions.map(
                      (suggestion) => (
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
                          className="text-left p-3 rounded-xl border border-outline-variant bg-surface-container-low hover:border-primary hover:bg-primary/5 transition-all text-xs font-semibold text-on-surface disabled:opacity-50"
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
                          <div className="max-w-[85%] bg-primary text-on-primary rounded-2xl rounded-br-md px-4 py-3">

                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {message.text}
                            </p>

                          </div>
                        ) : (
                          <div className="max-w-[92%] bg-surface-container-low border border-outline-variant rounded-2xl rounded-bl-md px-4 py-3">

                            <div className="flex items-center gap-2 mb-2">

                              <span className="material-symbols-outlined text-tertiary text-[17px]">
                                auto_awesome
                              </span>


                              <span className="text-xs font-bold text-tertiary">
                                CampusCopilot Intelligence
                              </span>


                              {message.grounded && (
                                <span className="inline-flex items-center justify-center min-w-[105px] h-[19px] px-2.5 rounded-full bg-secondary-container text-on-secondary-container text-[8px] font-bold whitespace-nowrap">
                                  RESOURCE GROUNDED
                                </span>
                              )}

                            </div>


                            <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                              {message.text}
                            </p>


                            {message.retrieval && (
                              <div className="mt-3 pt-2 border-t border-outline-variant text-[10px] text-outline flex flex-wrap gap-x-3 gap-y-1">

                                <span>
                                  {
                                    message
                                      .retrieval
                                      .chunksUsed
                                  }{" "}
                                  chunks used
                                </span>


                                <span>
                                  Source:{" "}
                                  {
                                    selectedResource
                                      .title
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

                      <div className="bg-surface-container-low border border-outline-variant rounded-2xl rounded-bl-md px-4 py-3">

                        <div className="flex items-center gap-2 text-sm text-primary font-semibold">

                          <span className="material-symbols-outlined animate-pulse text-[18px]">
                            auto_awesome
                          </span>

                          Searching this resource...

                        </div>

                      </div>

                    </div>
                  )}

                </div>
              )}


              {/* ERROR */}

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

                      <p className="font-semibold">
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
                          Open resource instead
                        </button>
                      )}

                    </div>

                  </div>

                </div>
              )}

            </div>


            {/* =================================================
                QUESTION INPUT
            ================================================= */}

            <form
              onSubmit={
                handleAskQuestion
              }
              className="border-t border-outline-variant bg-surface p-3 md:p-4"
            >

              <div className="max-w-2xl mx-auto">

                <div className="flex items-end gap-2">

                  <textarea
                    value={
                      question
                    }
                    onChange={
                      (event) =>
                        setQuestion(
                          event.target.value
                        )
                    }
                    onKeyDown={
                      (event) => {
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
                      }
                    }
                    placeholder="Ask something from this resource..."
                    rows={2}
                    maxLength={2000}
                    disabled={
                      asking
                    }
                    className="flex-1 resize-none rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary disabled:opacity-60"
                  />


                  <button
                    type="submit"
                    disabled={
                      asking ||
                      !question.trim()
                    }
                    className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >

                    <span className="material-symbols-outlined">
                      send
                    </span>

                  </button>

                </div>


                <div className="flex justify-between items-center mt-1.5 text-[10px] text-outline">

                  <span>
                    Answers are limited to the selected study resource.
                  </span>


                  <span>
                    {question.length}/2000
                  </span>

                </div>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* =================================================
          MOBILE NAVIGATION
      ================================================= */}

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