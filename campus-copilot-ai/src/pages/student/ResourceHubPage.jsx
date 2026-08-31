import {
  useEffect,
  useMemo,
  useState,
} from "react";

import StudentPageLayout from "../../components/student/StudentPageLayout";
import { authService } from "../../services/api";


const API_URL = "http://localhost:5000";


// =====================================================
// SUBJECT THEMES
// =====================================================

const SUBJECT_THEMES = [
  {
    accent: "bg-secondary",
    text: "text-secondary",
    soft:
      "bg-secondary-container text-on-secondary-container",
  },

  {
    accent: "bg-primary",
    text: "text-primary",
    soft:
      "bg-primary-fixed text-on-primary-fixed-variant",
  },

  {
    accent: "bg-tertiary",
    text: "text-tertiary",
    soft:
      "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  },
];


// =====================================================
// HELPERS
// =====================================================

function getOpenResourceUrl(value) {
  const url =
    String(value || "").trim();

  if (!url) {
    return "";
  }

  return url.startsWith("/")
    ? `${API_URL}${url}`
    : url;
}


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


function getResourceIcon(type) {
  switch (
    String(type || "")
      .trim()
      .toLowerCase()
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
      return "description";
  }
}


function getResourceIconStyle(type) {
  switch (
    String(type || "")
      .trim()
      .toLowerCase()
  ) {
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


function isPdfResource(resource) {
  const type =
    String(
      resource?.type || ""
    )
      .trim()
      .toLowerCase();

  const url =
    String(
      resource?.url || ""
    )
      .trim()
      .toLowerCase();

  return (
    type === "pdf" ||
    url.endsWith(".pdf") ||
    url.includes(".pdf?")
  );
}


function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}


function formatResourceDate(value) {
  const date =
    normalizeDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}


function isRecentlyAdded(
  value,
  days = 30
) {
  const date =
    normalizeDate(value);

  if (!date) {
    return false;
  }

  const now =
    new Date();

  const difference =
    now.getTime() -
    date.getTime();

  const maxDifference =
    days *
    24 *
    60 *
    60 *
    1000;

  return (
    difference >= 0 &&
    difference <=
      maxDifference
  );
}


function cleanText(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


// =====================================================
// RESOURCE HUB PAGE
// =====================================================

export default function ResourceHubPage() {
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


  // ===================================================
  // RESOURCE STATE
  // ===================================================

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


  // ===================================================
  // FILTER STATE
  // ===================================================

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");


  const [
    activeSubjectCode,
    setActiveSubjectCode,
  ] = useState("ALL");


  const [
    typeFilter,
    setTypeFilter,
  ] = useState("ALL");


  const [
    semesterFilter,
    setSemesterFilter,
  ] = useState("ALL");


  const [
    sortOption,
    setSortOption,
  ] = useState("LATEST");


  /*
    IMPORTANT

    false:
      Resource list can be displayed.

    true:
      We are browsing subjects only.
      Resource cards are completely hidden.
  */

  const [
    subjectsOnly,
    setSubjectsOnly,
  ] = useState(false);


  const [
    layoutMode,
    setLayoutMode,
  ] = useState(() => {
    return (
      localStorage.getItem(
        "campus_resource_layout"
      ) || "LIST"
    );
  });


  const [
    quickMessage,
    setQuickMessage,
  ] = useState("");


  // ===================================================
  // COPILOT STATE
  // ===================================================

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


  // ===================================================
  // LOAD RESOURCES
  // ===================================================

  async function loadResources() {
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
  }


  useEffect(() => {
    loadResources();
  }, []);


  // ===================================================
  // SAVE VIEW MODE
  // ===================================================

  useEffect(() => {
    localStorage.setItem(
      "campus_resource_layout",
      layoutMode
    );
  }, [layoutMode]);


  // ===================================================
  // ESCAPE CLOSES COPILOT
  // ===================================================

  useEffect(() => {
    if (!selectedResource) {
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


  // ===================================================
  // NORMALIZE API DATA
  // ===================================================

  const normalizedResources =
    useMemo(() => {
      return resources.map(
        (
          resource,
          index
        ) => {
          const subjectCode =
            String(
              resource.SUBJECT_CODE ||
                "UNKNOWN"
            ).trim();


          const subjectName =
            String(
              resource.SUBJECT_NAME ||
                subjectCode
            ).trim();


          const ragReady =
            Number(
              resource.RAG_READY
            ) === 1 ||
            Number(
              resource.CHUNK_COUNT
            ) > 0;


          return {
            id:
              resource.RESOURCE_ID ??
              index,

            title:
              resource.TITLE ||
              "Untitled Resource",

            type:
              resource.RESOURCE_TYPE ||
              "Resource",

            desc:
              resource.DESCRIPTION ||
              "",

            url:
              resource.RESOURCE_URL ||
              "",

            semester:
              resource.SEMESTER ??
              null,

            uploadedBy:
              resource.UPLOADED_BY ||
              "",

            createdAt:
              resource.CREATED_AT ||
              null,

            chunkCount:
              Number(
                resource.CHUNK_COUNT
              ) || 0,

            ragReady,

            subjectCode,

            subjectName,
          };
        }
      );

    }, [resources]);


  // ===================================================
  // GROUP RESOURCES INTO SUBJECTS
  // ===================================================

  const subjects =
    useMemo(() => {
      const subjectMap =
        new Map();


      normalizedResources.forEach(
        (resource) => {
          if (
            !subjectMap.has(
              resource.subjectCode
            )
          ) {
            subjectMap.set(
              resource.subjectCode,
              {
                code:
                  resource.subjectCode,

                title:
                  resource.subjectName,

                semester:
                  resource.semester,

                resources:
                  [],
              }
            );
          }


          subjectMap
            .get(
              resource.subjectCode
            )
            .resources.push(
              resource
            );
        }
      );


      return Array.from(
        subjectMap.values()
      )
        .sort(
          (a, b) =>
            String(
              a.code
            ).localeCompare(
              String(
                b.code
              )
            )
        )
        .map(
          (
            subject,
            index
          ) => ({
            ...subject,

            theme:
              SUBJECT_THEMES[
                index %
                  SUBJECT_THEMES.length
              ],
          })
        );

    }, [
      normalizedResources,
    ]);


  // ===================================================
  // KEEP SELECTED SUBJECT VALID
  // ===================================================

  useEffect(() => {
    if (
      subjects.length === 0
    ) {
      setActiveSubjectCode(
        "ALL"
      );

      return;
    }


    if (
      activeSubjectCode ===
      "ALL"
    ) {
      return;
    }


    const exists =
      subjects.some(
        (subject) =>
          subject.code ===
          activeSubjectCode
      );


    if (!exists) {
      setActiveSubjectCode(
        "ALL"
      );
    }

  }, [
    subjects,
    activeSubjectCode,
  ]);


  // ===================================================
  // RESOURCE TYPES
  // ===================================================

  const resourceTypes =
    useMemo(() => {
      return Array.from(
        new Set(
          normalizedResources
            .map(
              (resource) =>
                String(
                  resource.type ||
                    ""
                ).trim()
            )
            .filter(Boolean)
        )
      ).sort(
        (a, b) =>
          a.localeCompare(b)
      );

    }, [
      normalizedResources,
    ]);


  // ===================================================
  // SEMESTERS
  // ===================================================

  const semesters =
    useMemo(() => {
      return Array.from(
        new Set(
          normalizedResources
            .map(
              (resource) =>
                resource.semester
            )
            .filter(
              (value) =>
                value !== null &&
                value !==
                  undefined &&
                String(
                  value
                ).trim() !==
                  ""
            )
        )
      ).sort(
        (
          a,
          b
        ) =>
          Number(a) -
          Number(b)
      );

    }, [
      normalizedResources,
    ]);


  // ===================================================
  // STATISTICS
  // ===================================================

  const statistics =
    useMemo(() => {
      const totalResources =
        normalizedResources.length;


      const pdfResources =
        normalizedResources.filter(
          isPdfResource
        ).length;


      const recentlyAdded =
        normalizedResources.filter(
          (resource) =>
            isRecentlyAdded(
              resource.createdAt,
              30
            )
        ).length;


      const resourcesWithDates =
        normalizedResources.filter(
          (resource) =>
            normalizeDate(
              resource.createdAt
            )
        ).length;


      return {
        subjects:
          subjects.length,

        totalResources,

        pdfResources,

        fourth:
          resourcesWithDates > 0
            ? {
                value:
                  recentlyAdded,

                label:
                  "Recently Added",

                sublabel:
                  "Last 30 days",

                icon:
                  "schedule",

                iconStyle:
                  "bg-orange-100 text-orange-700",

                cardStyle:
                  "bg-gradient-to-br from-orange-50 to-white",
              }
            : {
                value:
                  resourceTypes.length,

                label:
                  "Resource Types",

                sublabel:
                  "Available formats",

                icon:
                  "category",

                iconStyle:
                  "bg-blue-100 text-blue-700",

                cardStyle:
                  "bg-gradient-to-br from-blue-50 to-white",
              },
      };

    }, [
      normalizedResources,
      subjects,
      resourceTypes,
    ]);


  // ===================================================
  // ACTIVE SUBJECT
  // ===================================================

  const activeSubject =
    useMemo(() => {
      if (
        activeSubjectCode ===
        "ALL"
      ) {
        return null;
      }


      return (
        subjects.find(
          (subject) =>
            subject.code ===
            activeSubjectCode
        ) || null
      );

    }, [
      subjects,
      activeSubjectCode,
    ]);


  // ===================================================
  // FILTER RESOURCES
  // ===================================================

  const filteredResources =
    useMemo(() => {
      const query =
        cleanText(
          searchTerm
        );


      let list =
        [...normalizedResources];


      // -------------------------------------------------
      // SUBJECT
      // -------------------------------------------------

      if (
        activeSubjectCode !==
        "ALL"
      ) {
        list =
          list.filter(
            (resource) =>
              resource.subjectCode ===
              activeSubjectCode
          );
      }


      // -------------------------------------------------
      // TYPE
      // -------------------------------------------------

      if (
        typeFilter !==
        "ALL"
      ) {
        list =
          list.filter(
            (resource) =>
              cleanText(
                resource.type
              ) ===
              cleanText(
                typeFilter
              )
          );
      }


      // -------------------------------------------------
      // SEMESTER
      // -------------------------------------------------

      if (
        semesterFilter !==
        "ALL"
      ) {
        list =
          list.filter(
            (resource) =>
              String(
                resource.semester
              ) ===
              String(
                semesterFilter
              )
          );
      }


      // -------------------------------------------------
      // SEARCH
      // -------------------------------------------------

      if (query) {
        list =
          list.filter(
            (resource) => {
              const searchable =
                [
                  resource.title,
                  resource.desc,
                  resource.type,
                  resource.subjectCode,
                  resource.subjectName,
                  resource.uploadedBy,
                  resource.semester,
                  resource.url,
                ]
                  .map(
                    cleanText
                  )
                  .join(" ");


              return searchable.includes(
                query
              );
            }
          );
      }


      // -------------------------------------------------
      // SORT
      // -------------------------------------------------

      list.sort(
        (
          first,
          second
        ) => {
          switch (
            sortOption
          ) {
            case "OLDEST": {
              const a =
                normalizeDate(
                  first.createdAt
                )?.getTime() ??
                Number.MAX_SAFE_INTEGER;


              const b =
                normalizeDate(
                  second.createdAt
                )?.getTime() ??
                Number.MAX_SAFE_INTEGER;


              return a - b;
            }


            case "TITLE_ASC":
              return String(
                first.title
              ).localeCompare(
                String(
                  second.title
                )
              );


            case "TITLE_DESC":
              return String(
                second.title
              ).localeCompare(
                String(
                  first.title
                )
              );


            case "LATEST":
            default: {
              const a =
                normalizeDate(
                  first.createdAt
                )?.getTime() ??
                0;


              const b =
                normalizeDate(
                  second.createdAt
                )?.getTime() ??
                0;


              return b - a;
            }
          }
        }
      );


      return list;

    }, [
      normalizedResources,
      searchTerm,
      activeSubjectCode,
      typeFilter,
      semesterFilter,
      sortOption,
    ]);


  // ===================================================
  // RESOURCE LIST TITLE
  // ===================================================

  const resourceListTitle =
    useMemo(() => {
      if (
        activeSubject
      ) {
        return `${filteredResources.length} ${
          filteredResources.length ===
          1
            ? "resource"
            : "resources"
        } in ${activeSubject.title}`;
      }


      return `${filteredResources.length} ${
        filteredResources.length ===
        1
          ? "resource"
          : "resources"
      } available`;

    }, [
      filteredResources,
      activeSubject,
    ]);


  // ===================================================
  // SCROLL HELPERS
  // ===================================================

  function scrollToSubjects() {
    window.setTimeout(
      () => {
        const section =
          document.getElementById(
            "subjects-section"
          );


        if (section) {
          section.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
        }
      },
      100
    );
  }


  function scrollToResourceList() {
    window.setTimeout(
      () => {
        const section =
          document.getElementById(
            "resource-list-section"
          );


        if (section) {
          section.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
        }
      },
      100
    );
  }


  // ===================================================
  // RESET FILTERS
  // ===================================================

  function resetFilters() {
    setSearchTerm("");

    setTypeFilter(
      "ALL"
    );

    setSemesterFilter(
      "ALL"
    );

    setSortOption(
      "LATEST"
    );

    setActiveSubjectCode(
      "ALL"
    );

    /*
      Reset means show all actual resources.
    */

    setSubjectsOnly(
      false
    );

    setQuickMessage("");
  }


  // ===================================================
  // CLICK A SUBJECT
  // ===================================================

  function selectSubject(
    subjectCode
  ) {
    /*
      Student selected a specific subject.

      Leave Subjects-only mode and show that
      subject's actual resources.
    */

    setActiveSubjectCode(
      subjectCode
    );


    setSearchTerm("");


    setTypeFilter(
      "ALL"
    );


    setSemesterFilter(
      "ALL"
    );


    setSortOption(
      "LATEST"
    );


    setSubjectsOnly(
      false
    );


    setQuickMessage("");


    scrollToResourceList();
  }


  // ===================================================
  // QUICK ACCESS -> ALL SUBJECTS
  // ===================================================

  function showAllSubjects() {
    /*
      THIS IS THE BEHAVIOUR YOU REQUESTED.

      Clicking "All Subjects":

      - clears filters
      - DOES NOT show resources
      - shows only real subject cards
      - user must choose a subject
    */

    setActiveSubjectCode(
      "ALL"
    );


    setSearchTerm("");


    setTypeFilter(
      "ALL"
    );


    setSemesterFilter(
      "ALL"
    );


    setSortOption(
      "LATEST"
    );


    setSubjectsOnly(
      true
    );


    setQuickMessage("");


    scrollToSubjects();
  }


  // ===================================================
  // RECENTLY ADDED
  // ===================================================

  function showRecentlyAdded() {
    const hasDates =
      normalizedResources.some(
        (resource) =>
          normalizeDate(
            resource.createdAt
          )
      );


    if (!hasDates) {
      setQuickMessage(
        "Upload dates are not available for the current resources."
      );

      return;
    }


    setActiveSubjectCode(
      "ALL"
    );


    setSearchTerm("");


    setTypeFilter(
      "ALL"
    );


    setSemesterFilter(
      "ALL"
    );


    setSortOption(
      "LATEST"
    );


    setSubjectsOnly(
      false
    );


    setQuickMessage(
      "Showing the latest resources first."
    );


    scrollToResourceList();
  }


  // ===================================================
  // PDF RESOURCES
  // ===================================================

  function showPdfResources() {
    const pdfType =
      resourceTypes.find(
        (type) =>
          cleanText(
            type
          ) ===
          "pdf"
      );


    setActiveSubjectCode(
      "ALL"
    );


    setSemesterFilter(
      "ALL"
    );


    setSearchTerm("");


    setSortOption(
      "LATEST"
    );


    setSubjectsOnly(
      false
    );


    if (pdfType) {
      setTypeFilter(
        pdfType
      );

    } else {
      setTypeFilter(
        "ALL"
      );


      setSearchTerm(
        ".pdf"
      );
    }


    setQuickMessage(
      "Showing available PDF resources."
    );


    scrollToResourceList();
  }


  // ===================================================
  // OPEN RESOURCE
  // ===================================================

  function handleOpenResource(
    resource
  ) {
    const openUrl =
      getOpenResourceUrl(
        resource.url
      );


    if (!openUrl) {
      setQuickMessage(
        "This resource does not currently have an available file or link."
      );

      return;
    }


    window.open(
      openUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }


  // ===================================================
  // OPEN COPILOT
  // ===================================================

  function handleOpenQa(
    resource
  ) {
    if (
      !resource?.ragReady
    ) {
      setQuickMessage(
        "This resource has not been indexed for Ask Copilot yet."
      );

      return;
    }


    setSelectedResource(
      resource
    );


    setQuestion("");


    setQaMessages([]);


    setQaError("");


    setQaErrorCode("");


    setQuickMessage("");
  }


  // ===================================================
  // QUICK COPILOT
  // ===================================================

  function openQuickCopilot() {
    const firstReadyResource =
      filteredResources.find(
        (resource) =>
          resource.ragReady
      ) ||
      normalizedResources.find(
        (resource) =>
          resource.ragReady
      );


    if (
      !firstReadyResource
    ) {
      setQuickMessage(
        "No indexed resource is currently available for Ask Copilot."
      );

      return;
    }


    handleOpenQa(
      firstReadyResource
    );
  }


  // ===================================================
  // CLOSE COPILOT
  // ===================================================

  function handleCloseQa() {
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
  }


  // ===================================================
  // ASK QUESTION
  // ===================================================

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


      if (!response.ok) {
        const requestError =
          new Error(
            data.error ||
              "CampusCopilot could not answer this question."
          );


        requestError.code =
          data.code || "";


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
        err.code || "";


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


  // ===================================================
  // SUGGESTED QUESTIONS
  // ===================================================

  const suggestedQuestions = [
    "Summarize this resource.",
    "Explain the main concepts in this resource.",
    "Create 5 viva questions from this resource.",
    "List the key points from this resource.",
  ];


  // ===================================================
  // RESOURCE CARD
  // ===================================================

  function renderResourceCard(
    resource
  ) {
    const formattedDate =
      formatResourceDate(
        resource.createdAt
      );


    const openAvailable =
      Boolean(
        getOpenResourceUrl(
          resource.url
        )
      );


    // =================================================
    // GRID VIEW
    // =================================================

    if (
      layoutMode ===
      "GRID"
    ) {
      return (
        <article
          key={
            resource.id
          }
          className="
            rounded-2xl
            border
            border-outline-variant
            bg-surface-container-lowest
            p-5
            flex
            flex-col
            min-h-[270px]
            hover:border-primary/30
            hover:shadow-[0_12px_30px_rgba(0,35,111,0.06)]
            transition-all
          "
        >

          <div
            className="
              flex
              items-start
              justify-between
              gap-3
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
              <span
                className="
                  material-symbols-outlined
                  text-[23px]
                "
              >
                {getResourceIcon(
                  resource.type
                )}
              </span>
            </div>


            <span
              className="
                font-mono-sm
                text-[10px]
                uppercase
                tracking-wide
                text-outline
              "
            >
              {resource.type ||
                "RESOURCE"}
            </span>

          </div>


          <div
            className="
              mt-4
              flex-1
            "
          >

            <div
              className="
                font-label-caps
                text-[10px]
                text-secondary
                mb-1
              "
            >
              {
                resource.subjectCode
              }
            </div>


            <h3
              className="
                font-title-md
                text-[17px]
                leading-6
                font-bold
                text-on-surface
              "
            >
              {resource.title}
            </h3>


            {resource.desc && (
              <p
                className="
                  font-body-sm
                  text-sm
                  leading-5
                  text-on-surface-variant
                  mt-2
                  line-clamp-3
                "
              >
                {resource.desc}
              </p>
            )}


            <div
              className="
                flex
                flex-wrap
                gap-2
                mt-4
              "
            >

              {resource.type && (
                <span
                  className="
                    px-2
                    py-1
                    rounded-md
                    bg-secondary-container
                    text-on-secondary-container
                    text-[10px]
                    font-semibold
                  "
                >
                  {resource.type}
                </span>
              )}


              {resource.semester !==
                null && (
                <span
                  className="
                    px-2
                    py-1
                    rounded-md
                    bg-surface-container
                    text-on-surface-variant
                    text-[10px]
                    font-semibold
                  "
                >
                  Semester{" "}
                  {resource.semester}
                </span>
              )}


              {resource.uploadedBy && (
                <span
                  className="
                    px-2
                    py-1
                    rounded-md
                    bg-surface-container
                    text-on-surface-variant
                    text-[10px]
                    font-semibold
                  "
                >
                  Uploaded by{" "}
                  {
                    resource.uploadedBy
                  }
                </span>
              )}

            </div>

          </div>


          {formattedDate && (
            <div
              className="
                flex
                items-center
                gap-1.5
                text-xs
                text-outline
                mt-4
              "
            >
              <span
                className="
                  material-symbols-outlined
                  text-[16px]
                "
              >
                calendar_today
              </span>

              {formattedDate}
            </div>
          )}


          <div
            className="
              grid
              grid-cols-2
              gap-2
              mt-4
            "
          >

            <button
              type="button"
              disabled={
                !openAvailable
              }
              onClick={() =>
                handleOpenResource(
                  resource
                )
              }
              className="
                h-10
                rounded-lg
                border
                border-outline-variant
                text-primary
                text-sm
                font-semibold
                hover:bg-primary/5
                transition-colors
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >
              Open
            </button>


            <button
              type="button"
              disabled={
                !resource.ragReady
              }
              onClick={() =>
                handleOpenQa(
                  resource
                )
              }
              className="
                h-10
                rounded-lg
                flex
                items-center
                justify-center
                gap-2
                text-sm
                font-semibold
                text-white
                bg-gradient-to-r
                from-secondary
                to-tertiary
                hover:opacity-90
                transition-opacity
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >

              <span
                className="
                  material-symbols-outlined
                  text-[16px]
                "
              >
                auto_awesome
              </span>

              Ask Copilot

            </button>

          </div>

        </article>
      );
    }


    // =================================================
    // LIST VIEW
    // =================================================

    return (
      <article
        key={
          resource.id
        }
        className="
          rounded-2xl
          border
          border-outline-variant
          bg-surface-container-lowest
          p-4
          md:p-5
          flex
          flex-col
          lg:grid
          lg:grid-cols-[56px_minmax(0,1fr)_170px_auto]
          lg:items-center
          gap-4
          hover:border-primary/30
          hover:shadow-[0_10px_28px_rgba(0,35,111,0.05)]
          transition-all
        "
      >

        {/* ICON */}

        <div
          className={`
            w-12
            h-12
            md:w-14
            md:h-14
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
          <span
            className="
              material-symbols-outlined
              text-[23px]
            "
          >
            {getResourceIcon(
              resource.type
            )}
          </span>
        </div>


        {/* CONTENT */}

        <div className="min-w-0">

          <div
            className="
              font-label-caps
              text-[10px]
              text-secondary
              font-bold
              tracking-wide
              mb-1
            "
          >
            {
              resource.subjectCode
            }
          </div>


          <h3
            className="
              font-title-md
              text-[17px]
              md:text-[18px]
              leading-6
              font-bold
              text-on-surface
            "
          >
            {resource.title}
          </h3>


          {resource.desc && (
            <p
              className="
                font-body-sm
                text-sm
                text-on-surface-variant
                mt-1
                line-clamp-2
              "
            >
              {resource.desc}
            </p>
          )}


          <div
            className="
              flex
              flex-wrap
              gap-2
              mt-3
            "
          >

            {resource.type && (
              <span
                className="
                  px-2
                  py-1
                  rounded-md
                  bg-secondary-container
                  text-on-secondary-container
                  text-[10px]
                  font-semibold
                "
              >
                {resource.type}
              </span>
            )}


            {resource.semester !==
              null && (
              <span
                className="
                  px-2
                  py-1
                  rounded-md
                  bg-surface-container
                  text-on-surface-variant
                  text-[10px]
                  font-semibold
                "
              >
                Semester{" "}
                {
                  resource.semester
                }
              </span>
            )}


            {resource.uploadedBy && (
              <span
                className="
                  px-2
                  py-1
                  rounded-md
                  bg-surface-container
                  text-on-surface-variant
                  text-[10px]
                  font-semibold
                "
              >
                Uploaded by{" "}
                {
                  resource.uploadedBy
                }
              </span>
            )}

          </div>

        </div>


        {/* META */}

        <div
          className="
            flex
            lg:flex-col
            flex-wrap
            gap-2
            text-xs
            text-on-surface-variant
          "
        >

          {formattedDate && (
            <div
              className="
                flex
                items-center
                gap-1.5
              "
            >
              <span
                className="
                  material-symbols-outlined
                  text-[17px]
                "
              >
                calendar_today
              </span>

              {formattedDate}
            </div>
          )}


          <div
            className="
              flex
              items-center
              gap-1.5
            "
          >
            <span
              className="
                material-symbols-outlined
                text-[17px]
              "
            >
              draft
            </span>

            {resource.type ||
              "Resource"}
          </div>

        </div>


        {/* ACTIONS */}

        <div
          className="
            flex
            items-center
            gap-2
            lg:justify-end
            shrink-0
          "
        >

          <button
            type="button"
            disabled={
              !openAvailable
            }
            onClick={() =>
              handleOpenResource(
                resource
              )
            }
            className="
              h-10
              px-4
              rounded-lg
              border
              border-outline-variant
              text-primary
              text-sm
              font-semibold
              hover:bg-primary/5
              transition-colors
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
          >
            Open
          </button>


          <button
            type="button"
            disabled={
              !resource.ragReady
            }
            onClick={() =>
              handleOpenQa(
                resource
              )
            }
            className="
              h-10
              px-4
              rounded-lg
              flex
              items-center
              gap-2
              text-sm
              font-semibold
              text-white
              bg-gradient-to-r
              from-secondary
              to-tertiary
              hover:opacity-90
              transition-opacity
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
          >

            <span
              className="
                material-symbols-outlined
                text-[16px]
              "
            >
              auto_awesome
            </span>

            Ask Copilot

          </button>

        </div>

      </article>
    );
  }


  // ===================================================
  // RENDER PAGE
  // ===================================================

  return (
    <StudentPageLayout
      activePath="/resources"
      eyebrow="STUDY RESOURCES"
      title="Resource Hub"
      subtitle="Access subject-wise study material, notes, PDFs, and academic resources."
    >

      <div
        className="
          w-full
          pb-8
        "
      >

        {/* =================================================
            STATISTICS
        ================================================== */}

        {!loading &&
          !error && (

          <section
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              xl:grid-cols-4
              gap-4
              mb-5
            "
          >

            {/* SUBJECTS */}

            <div
              className="
                rounded-2xl
                border
                border-outline-variant
                bg-gradient-to-br
                from-emerald-50
                to-white
                p-4
                flex
                items-center
                gap-4
              "
            >

              <div
                className="
                  w-12
                  h-12
                  rounded-xl
                  bg-secondary-container
                  text-secondary
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <span
                  className="
                    material-symbols-outlined
                    text-[25px]
                  "
                >
                  folder
                </span>
              </div>


              <div>

                <div
                  className="
                    text-2xl
                    font-bold
                    text-secondary
                  "
                >
                  {
                    statistics
                      .subjects
                  }
                </div>

                <div
                  className="
                    font-semibold
                    text-on-surface
                    text-sm
                  "
                >
                  Subjects
                </div>

                <div
                  className="
                    text-xs
                    text-on-surface-variant
                    mt-0.5
                  "
                >
                  Available subjects
                </div>

              </div>

            </div>


            {/* TOTAL RESOURCES */}

            <div
              className="
                rounded-2xl
                border
                border-outline-variant
                bg-gradient-to-br
                from-violet-50
                to-white
                p-4
                flex
                items-center
                gap-4
              "
            >

              <div
                className="
                  w-12
                  h-12
                  rounded-xl
                  bg-tertiary-fixed
                  text-tertiary
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <span
                  className="
                    material-symbols-outlined
                    text-[25px]
                  "
                >
                  description
                </span>
              </div>


              <div>

                <div
                  className="
                    text-2xl
                    font-bold
                    text-tertiary
                  "
                >
                  {
                    statistics
                      .totalResources
                  }
                </div>

                <div
                  className="
                    font-semibold
                    text-on-surface
                    text-sm
                  "
                >
                  Total Resources
                </div>

                <div
                  className="
                    text-xs
                    text-on-surface-variant
                    mt-0.5
                  "
                >
                  Available files
                </div>

              </div>

            </div>


            {/* PDF */}

            <div
              className="
                rounded-2xl
                border
                border-outline-variant
                bg-gradient-to-br
                from-rose-50
                to-white
                p-4
                flex
                items-center
                gap-4
              "
            >

              <div
                className="
                  w-12
                  h-12
                  rounded-xl
                  bg-error-container
                  text-error
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <span
                  className="
                    material-symbols-outlined
                    text-[25px]
                  "
                >
                  picture_as_pdf
                </span>
              </div>


              <div>

                <div
                  className="
                    text-2xl
                    font-bold
                    text-error
                  "
                >
                  {
                    statistics
                      .pdfResources
                  }
                </div>

                <div
                  className="
                    font-semibold
                    text-on-surface
                    text-sm
                  "
                >
                  PDF Resources
                </div>

                <div
                  className="
                    text-xs
                    text-on-surface-variant
                    mt-0.5
                  "
                >
                  Available PDFs
                </div>

              </div>

            </div>


            {/* FOURTH */}

            <div
              className={`
                rounded-2xl
                border
                border-outline-variant
                p-4
                flex
                items-center
                gap-4
                ${statistics.fourth.cardStyle}
              `}
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
                  ${statistics.fourth.iconStyle}
                `}
              >
                <span
                  className="
                    material-symbols-outlined
                    text-[25px]
                  "
                >
                  {
                    statistics
                      .fourth
                      .icon
                  }
                </span>
              </div>


              <div>

                <div
                  className="
                    text-2xl
                    font-bold
                    text-primary
                  "
                >
                  {
                    statistics
                      .fourth
                      .value
                  }
                </div>

                <div
                  className="
                    font-semibold
                    text-on-surface
                    text-sm
                  "
                >
                  {
                    statistics
                      .fourth
                      .label
                  }
                </div>

                <div
                  className="
                    text-xs
                    text-on-surface-variant
                    mt-0.5
                  "
                >
                  {
                    statistics
                      .fourth
                      .sublabel
                  }
                </div>

              </div>

            </div>

          </section>

        )}


        {/* =================================================
            FILTER BAR
        ================================================== */}

        {!loading &&
          !error &&
          normalizedResources.length >
            0 && (

          <section
            className="
              rounded-2xl
              border
              border-outline-variant
              bg-surface-container-lowest
              p-3
              md:p-4
              mb-4
            "
          >

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-[minmax(300px,1fr)_180px_170px_170px_170px]
                gap-3
              "
            >

              {/* SEARCH */}

              <div className="relative">

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
                  value={
                    searchTerm
                  }
                  onChange={(event) => {
                    setSearchTerm(
                      event.target.value
                    );

                    /*
                      Search means user wants resources.
                    */

                    setSubjectsOnly(
                      false
                    );
                  }}
                  placeholder="Search notes, papers, videos..."
                  className="
                    w-full
                    h-11
                    bg-surface
                    border
                    border-outline-variant
                    rounded-xl
                    pl-10
                    pr-4
                    text-sm
                    text-on-surface
                    placeholder:text-outline
                    focus:outline-none
                    focus:border-primary
                    focus:ring-2
                    focus:ring-primary/10
                  "
                />

              </div>


              {/* SUBJECT DROPDOWN */}

              <select
                value={
                  activeSubjectCode
                }
                onChange={(event) => {
                  const subjectCode =
                    event.target.value;


                  setActiveSubjectCode(
                    subjectCode
                  );


                  /*
                    Dropdown is a direct resource filter,
                    so show resource results.
                  */

                  setSubjectsOnly(
                    false
                  );


                  setQuickMessage("");
                }}
                className="
                  h-11
                  px-3
                  rounded-xl
                  border
                  border-outline-variant
                  bg-surface
                  text-sm
                  font-semibold
                  text-on-surface
                  focus:outline-none
                  focus:border-primary
                "
              >

                <option value="ALL">
                  All Subjects
                </option>


                {subjects.map(
                  (subject) => (

                    <option
                      key={
                        subject.code
                      }
                      value={
                        subject.code
                      }
                    >
                      {
                        subject.code
                      }{" "}
                      -{" "}
                      {
                        subject.title
                      }
                    </option>

                  )
                )}

              </select>


              {/* TYPE */}

              <select
                value={
                  typeFilter
                }
                onChange={(event) => {
                  setTypeFilter(
                    event.target.value
                  );

                  setSubjectsOnly(
                    false
                  );
                }}
                className="
                  h-11
                  px-3
                  rounded-xl
                  border
                  border-outline-variant
                  bg-surface
                  text-sm
                  font-semibold
                  text-on-surface
                  focus:outline-none
                  focus:border-primary
                "
              >

                <option value="ALL">
                  All Types
                </option>


                {resourceTypes.map(
                  (type) => (

                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>

                  )
                )}

              </select>


              {/* SEMESTER */}

              <select
                value={
                  semesterFilter
                }
                onChange={(event) => {
                  setSemesterFilter(
                    event.target.value
                  );

                  setSubjectsOnly(
                    false
                  );
                }}
                className="
                  h-11
                  px-3
                  rounded-xl
                  border
                  border-outline-variant
                  bg-surface
                  text-sm
                  font-semibold
                  text-on-surface
                  focus:outline-none
                  focus:border-primary
                "
              >

                <option value="ALL">
                  All Semesters
                </option>


                {semesters.map(
                  (semester) => (

                    <option
                      key={
                        semester
                      }
                      value={
                        semester
                      }
                    >
                      Semester{" "}
                      {semester}
                    </option>

                  )
                )}

              </select>


              {/* SORT */}

              <select
                value={
                  sortOption
                }
                onChange={(event) => {
                  setSortOption(
                    event.target.value
                  );

                  setSubjectsOnly(
                    false
                  );
                }}
                className="
                  h-11
                  px-3
                  rounded-xl
                  border
                  border-outline-variant
                  bg-surface
                  text-sm
                  font-semibold
                  text-on-surface
                  focus:outline-none
                  focus:border-primary
                "
              >

                <option value="LATEST">
                  Latest First
                </option>

                <option value="OLDEST">
                  Oldest First
                </option>

                <option value="TITLE_ASC">
                  Title A-Z
                </option>

                <option value="TITLE_DESC">
                  Title Z-A
                </option>

              </select>

            </div>

          </section>

        )}


        {/* =================================================
            ERROR
        ================================================== */}

        {error && (

          <section
            className="
              rounded-2xl
              border
              border-error/20
              bg-error-container
              text-on-error-container
              p-5
              mb-5
            "
          >

            <div
              className="
                flex
                items-start
                gap-3
              "
            >

              <span className="material-symbols-outlined">
                error
              </span>


              <div className="flex-1">

                <h3 className="font-semibold">
                  Unable to load resources
                </h3>

                <p className="text-sm mt-1">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={
                    loadResources
                  }
                  className="
                    mt-3
                    px-4
                    h-9
                    rounded-lg
                    bg-error
                    text-on-error
                    text-sm
                    font-semibold
                  "
                >
                  Retry
                </button>

              </div>

            </div>

          </section>

        )}


        {/* =================================================
            LOADING
        ================================================== */}

        {loading && (

          <section className="space-y-4">

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                xl:grid-cols-4
                gap-4
              "
            >

              {[1, 2, 3, 4].map(
                (item) => (

                  <div
                    key={item}
                    className="
                      h-[108px]
                      rounded-2xl
                      bg-surface-container
                      animate-pulse
                    "
                  />

                )
              )}

            </div>


            <div
              className="
                rounded-2xl
                border
                border-outline-variant
                bg-surface-container-lowest
                p-12
                text-center
              "
            >

              <span
                className="
                  material-symbols-outlined
                  text-4xl
                  text-primary
                  animate-spin
                "
              >
                progress_activity
              </span>

              <p
                className="
                  text-sm
                  text-on-surface-variant
                  mt-3
                "
              >
                Loading study resources...
              </p>

            </div>

          </section>

        )}


        {/* =================================================
            NO RESOURCES
        ================================================== */}

        {!loading &&
          !error &&
          normalizedResources.length ===
            0 && (

          <section
            className="
              rounded-2xl
              border
              border-outline-variant
              bg-surface-container-lowest
              p-12
              text-center
            "
          >

            <div
              className="
                w-16
                h-16
                rounded-2xl
                bg-surface-container
                flex
                items-center
                justify-center
                mx-auto
              "
            >

              <span
                className="
                  material-symbols-outlined
                  text-3xl
                  text-outline
                "
              >
                folder_open
              </span>

            </div>


            <h3
              className="
                font-title-md
                text-xl
                font-bold
                text-on-surface
                mt-4
              "
            >
              No resources available yet
            </h3>


            <p
              className="
                font-body-sm
                text-on-surface-variant
                mt-2
              "
            >
              Study material will appear here once it has been added.
            </p>

          </section>

        )}


        {/* =================================================
            SUBJECTS
        ================================================== */}

        {!loading &&
          !error &&
          subjects.length >
            0 && (

          <section
            id="subjects-section"
            className="
              rounded-2xl
              border
              border-outline-variant
              bg-surface-container-lowest
              p-4
              mb-4
              scroll-mt-5
            "
          >

            <div
              className="
                flex
                flex-col
                sm:flex-row
                sm:items-center
                sm:justify-between
                gap-2
                mb-4
              "
            >

              <div>

                <h2
                  className="
                    font-title-md
                    text-base
                    font-bold
                    text-on-surface
                  "
                >
                  Subjects
                </h2>


                <p
                  className="
                    text-xs
                    text-on-surface-variant
                    mt-1
                  "
                >
                  Select a subject to view its study resources.
                </p>

              </div>


              {subjectsOnly && (
                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    text-xs
                    font-semibold
                    text-secondary
                  "
                >
                  <span
                    className="
                      material-symbols-outlined
                      text-[17px]
                    "
                  >
                    touch_app
                  </span>

                  Choose a subject
                </div>
              )}

            </div>


            {/*
              IMPORTANT:

              ONLY REAL SUBJECTS ARE SHOWN HERE.

              There is intentionally NO
              "All Subjects" card inside this section.
            */}

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                gap-3
              "
            >

              {subjects.map(
                (subject) => {
                  const isActive =
                    !subjectsOnly &&
                    subject.code ===
                      activeSubjectCode;


                  const resourceCount =
                    subject.resources
                      .length;


                  return (

                    <button
                      key={
                        subject.code
                      }
                      type="button"
                      onClick={() =>
                        selectSubject(
                          subject.code
                        )
                      }
                      className={`
                        relative
                        w-full
                        min-h-[112px]
                        rounded-xl
                        border
                        px-5
                        py-4
                        text-left
                        overflow-hidden
                        transition-all

                        ${
                          isActive
                            ? `
                              border-secondary
                              bg-secondary-container/25
                              shadow-[0_4px_16px_rgba(0,106,97,0.08)]
                            `
                            : `
                              border-outline-variant
                              bg-surface-container-low
                              hover:bg-surface-container-lowest
                              hover:border-primary/30
                              hover:shadow-[0_4px_16px_rgba(0,35,111,0.05)]
                            `
                        }
                      `}
                    >

                      {/* ACTIVE TOP BAR */}

                      {isActive && (

                        <div
                          className={`
                            absolute
                            top-0
                            left-0
                            right-0
                            h-[3px]
                            ${subject.theme.accent}
                          `}
                        />

                      )}


                      <div
                        className="
                          flex
                          items-start
                          justify-between
                          gap-4
                        "
                      >

                        {/* SUBJECT INFORMATION */}

                        <div className="min-w-0">

                          <div
                            className={`
                              text-[11px]
                              font-bold
                              tracking-wide

                              ${
                                isActive
                                  ? subject
                                      .theme
                                      .text
                                  : "text-secondary"
                              }
                            `}
                          >
                            {
                              subject.code
                            }
                          </div>


                          <h3
                            className="
                              font-title-md
                              text-[17px]
                              font-bold
                              text-on-surface
                              mt-1
                              truncate
                            "
                          >
                            {
                              subject.title
                            }
                          </h3>


                          <div
                            className="
                              flex
                              flex-wrap
                              items-center
                              gap-2
                              mt-3
                            "
                          >

                            {/* RESOURCE COUNT */}

                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1
                                px-2
                                py-1
                                rounded-md
                                bg-surface-container-lowest
                                border
                                border-outline-variant
                                text-[11px]
                                text-on-surface-variant
                              "
                            >
                              <span
                                className="
                                  material-symbols-outlined
                                  text-[14px]
                                "
                              >
                                description
                              </span>

                              {
                                resourceCount
                              }{" "}

                              {
                                resourceCount ===
                                1
                                  ? "resource"
                                  : "resources"
                              }
                            </span>


                            {/* SEMESTER */}

                            {subject.semester !==
                              null &&
                              subject.semester !==
                                undefined && (

                              <span
                                className="
                                  inline-flex
                                  items-center
                                  px-2
                                  py-1
                                  rounded-md
                                  bg-surface-container-lowest
                                  border
                                  border-outline-variant
                                  text-[11px]
                                  text-on-surface-variant
                                "
                              >
                                Semester{" "}
                                {
                                  subject.semester
                                }
                              </span>

                            )}

                          </div>

                        </div>


                        {/* ICON */}

                        <div
                          className={`
                            w-11
                            h-11
                            rounded-xl
                            flex
                            items-center
                            justify-center
                            shrink-0

                            ${
                              isActive
                                ? subject
                                    .theme
                                    .soft
                                : "bg-surface-container-high text-on-surface-variant"
                            }
                          `}
                        >
                          <span
                            className="
                              material-symbols-outlined
                              text-[22px]
                            "
                          >
                            menu_book
                          </span>
                        </div>

                      </div>

                    </button>

                  );
                }
              )}

            </div>

          </section>

        )}


        {/* =================================================
            SUBJECTS ONLY INFORMATION
        ================================================== */}

        {!loading &&
          !error &&
          subjectsOnly &&
          subjects.length >
            0 && (

          <section
            className="
              rounded-xl
              border
              border-secondary/20
              bg-secondary-container/15
              px-4
              py-3
              flex
              items-center
              gap-3
              mb-4
            "
          >

            <div
              className="
                w-9
                h-9
                rounded-lg
                bg-secondary-container
                text-secondary
                flex
                items-center
                justify-center
                shrink-0
              "
            >
              <span
                className="
                  material-symbols-outlined
                  text-[19px]
                "
              >
                info
              </span>
            </div>


            <div>

              <p
                className="
                  text-sm
                  font-semibold
                  text-on-surface
                "
              >
                Select a subject above
              </p>


              <p
                className="
                  text-xs
                  text-on-surface-variant
                  mt-0.5
                "
              >
                Its available notes, PDFs and other study resources will appear after you select it.
              </p>

            </div>

          </section>

        )}


        {/* =================================================
            RESOURCE LIST

            IMPORTANT:
            HIDDEN COMPLETELY WHILE subjectsOnly === true
        ================================================== */}

        {!loading &&
          !error &&
          !subjectsOnly &&
          normalizedResources.length >
            0 && (

          <section
            id="resource-list-section"
            className="
              rounded-2xl
              border
              border-outline-variant
              bg-surface-container-lowest
              p-4
              md:p-5
              scroll-mt-5
            "
          >

            {/* HEADER */}

            <div
              className="
                flex
                flex-col
                sm:flex-row
                sm:items-center
                sm:justify-between
                gap-3
                pb-4
                border-b
                border-outline-variant
              "
            >

              <div>

                <h2
                  className="
                    font-title-md
                    text-lg
                    font-bold
                    text-on-surface
                  "
                >
                  {resourceListTitle}
                </h2>


                {(searchTerm ||
                  typeFilter !==
                    "ALL" ||
                  semesterFilter !==
                    "ALL" ||
                  activeSubjectCode !==
                    "ALL") && (

                  <button
                    type="button"
                    onClick={
                      resetFilters
                    }
                    className="
                      text-xs
                      text-primary
                      font-semibold
                      mt-1
                      hover:underline
                    "
                  >
                    Clear filters and show all resources
                  </button>

                )}

              </div>


              {/* VIEW SWITCH */}

              <div
                className="
                  flex
                  items-center
                  gap-1
                  p-1
                  rounded-lg
                  border
                  border-outline-variant
                  bg-surface-container-low
                  self-start
                  sm:self-auto
                "
              >

                <button
                  type="button"
                  title="Grid view"
                  onClick={() =>
                    setLayoutMode(
                      "GRID"
                    )
                  }
                  className={`
                    w-9
                    h-9
                    rounded-md
                    flex
                    items-center
                    justify-center
                    transition-colors

                    ${
                      layoutMode ===
                      "GRID"
                        ? "bg-primary-fixed text-primary"
                        : "text-on-surface-variant hover:bg-surface"
                    }
                  `}
                >
                  <span
                    className="
                      material-symbols-outlined
                      text-[19px]
                    "
                  >
                    grid_view
                  </span>
                </button>


                <button
                  type="button"
                  title="List view"
                  onClick={() =>
                    setLayoutMode(
                      "LIST"
                    )
                  }
                  className={`
                    w-9
                    h-9
                    rounded-md
                    flex
                    items-center
                    justify-center
                    transition-colors

                    ${
                      layoutMode ===
                      "LIST"
                        ? "bg-secondary-container text-secondary"
                        : "text-on-surface-variant hover:bg-surface"
                    }
                  `}
                >
                  <span
                    className="
                      material-symbols-outlined
                      text-[19px]
                    "
                  >
                    view_list
                  </span>
                </button>

              </div>

            </div>


            {/* QUICK MESSAGE */}

            {quickMessage && (

              <div
                className="
                  mt-4
                  rounded-xl
                  bg-primary-fixed/30
                  text-on-primary-fixed-variant
                  px-4
                  py-3
                  flex
                  items-center
                  justify-between
                  gap-3
                  text-sm
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >

                  <span
                    className="
                      material-symbols-outlined
                      text-[18px]
                    "
                  >
                    info
                  </span>

                  {quickMessage}

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setQuickMessage(
                      ""
                    )
                  }
                  className="
                    w-7
                    h-7
                    rounded-full
                    flex
                    items-center
                    justify-center
                    hover:bg-black/5
                  "
                >
                  <span
                    className="
                      material-symbols-outlined
                      text-[17px]
                    "
                  >
                    close
                  </span>
                </button>

              </div>

            )}


            {/* NO MATCHES */}

            {filteredResources.length ===
            0 ? (

              <div
                className="
                  py-14
                  text-center
                "
              >

                <div
                  className="
                    w-14
                    h-14
                    rounded-2xl
                    bg-surface-container
                    flex
                    items-center
                    justify-center
                    mx-auto
                  "
                >
                  <span
                    className="
                      material-symbols-outlined
                      text-3xl
                      text-outline
                    "
                  >
                    search_off
                  </span>
                </div>


                <h3
                  className="
                    font-semibold
                    text-on-surface
                    mt-4
                  "
                >
                  No resources match your current filters
                </h3>


                <p
                  className="
                    text-sm
                    text-on-surface-variant
                    mt-1
                  "
                >
                  Try changing the search term, subject, type, or semester.
                </p>


                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                  className="
                    mt-4
                    px-4
                    h-10
                    rounded-lg
                    bg-primary
                    text-on-primary
                    text-sm
                    font-semibold
                  "
                >
                  Show All Resources
                </button>

              </div>

            ) : (

              <div
                className={
                  layoutMode ===
                  "GRID"
                    ? "grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4"
                    : "flex flex-col gap-3 mt-4"
                }
              >

                {filteredResources.map(
                  (resource) =>
                    renderResourceCard(
                      resource
                    )
                )}

              </div>

            )}

          </section>

        )}


        {/* =================================================
            QUICK ACCESS
        ================================================== */}

        {!loading &&
          !error &&
          normalizedResources.length >
            0 && (

          <section
            className="
              rounded-2xl
              border
              border-outline-variant
              bg-surface-container-lowest
              p-4
              md:p-5
              mt-4
            "
          >

            <h2
              className="
                font-title-md
                font-bold
                text-on-surface
                mb-4
              "
            >
              Quick Access
            </h2>


            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                xl:grid-cols-4
                gap-3
              "
            >

              {/* RECENTLY ADDED */}

              <button
                type="button"
                onClick={
                  showRecentlyAdded
                }
                className="
                  rounded-xl
                  bg-gradient-to-br
                  from-emerald-50
                  to-white
                  border
                  border-transparent
                  hover:border-secondary/30
                  p-4
                  text-left
                  flex
                  items-center
                  gap-3
                  transition-all
                "
              >

                <div
                  className="
                    w-11
                    h-11
                    rounded-xl
                    bg-secondary-container
                    text-secondary
                    flex
                    items-center
                    justify-center
                    shrink-0
                  "
                >
                  <span className="material-symbols-outlined">
                    schedule
                  </span>
                </div>


                <div>

                  <div
                    className="
                      text-sm
                      font-bold
                      text-secondary
                    "
                  >
                    Recently Added
                  </div>

                  <div
                    className="
                      text-xs
                      text-on-surface-variant
                      mt-1
                    "
                  >
                    Latest uploaded resources
                  </div>

                </div>

              </button>


              {/* PDF */}

              <button
                type="button"
                onClick={
                  showPdfResources
                }
                className="
                  rounded-xl
                  bg-gradient-to-br
                  from-violet-50
                  to-white
                  border
                  border-transparent
                  hover:border-tertiary/30
                  p-4
                  text-left
                  flex
                  items-center
                  gap-3
                  transition-all
                "
              >

                <div
                  className="
                    w-11
                    h-11
                    rounded-xl
                    bg-tertiary-fixed
                    text-tertiary
                    flex
                    items-center
                    justify-center
                    shrink-0
                  "
                >
                  <span className="material-symbols-outlined">
                    picture_as_pdf
                  </span>
                </div>


                <div>

                  <div
                    className="
                      text-sm
                      font-bold
                      text-tertiary
                    "
                  >
                    PDF Resources
                  </div>

                  <div
                    className="
                      text-xs
                      text-on-surface-variant
                      mt-1
                    "
                  >
                    Browse available documents
                  </div>

                </div>

              </button>


              {/* =================================================
                  ALL SUBJECTS

                  THIS BUTTON NOW SHOWS ONLY SUBJECT CARDS
              ================================================== */}

              <button
                type="button"
                onClick={
                  showAllSubjects
                }
                className="
                  rounded-xl
                  bg-gradient-to-br
                  from-orange-50
                  to-white
                  border
                  border-orange-100
                  hover:border-orange-300
                  p-4
                  text-left
                  flex
                  items-center
                  gap-3
                  transition-all
                "
              >

                <div
                  className="
                    w-11
                    h-11
                    rounded-xl
                    bg-orange-100
                    text-orange-700
                    flex
                    items-center
                    justify-center
                    shrink-0
                  "
                >
                  <span className="material-symbols-outlined">
                    folder_copy
                  </span>
                </div>


                <div>

                  <div
                    className="
                      text-sm
                      font-bold
                      text-orange-700
                    "
                  >
                    All Subjects
                  </div>

                  <div
                    className="
                      text-xs
                      text-on-surface-variant
                      mt-1
                    "
                  >
                    Browse all subjects
                  </div>

                </div>

              </button>


              {/* COPILOT */}

              <button
                type="button"
                onClick={
                  openQuickCopilot
                }
                className="
                  rounded-xl
                  bg-gradient-to-br
                  from-blue-50
                  to-violet-50
                  border
                  border-transparent
                  hover:border-primary/30
                  p-4
                  text-left
                  flex
                  items-center
                  gap-3
                  transition-all
                "
              >

                <div
                  className="
                    w-11
                    h-11
                    rounded-xl
                    bg-primary-fixed
                    text-primary
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


                <div>

                  <div
                    className="
                      text-sm
                      font-bold
                      text-primary
                    "
                  >
                    Ask Copilot
                  </div>

                  <div
                    className="
                      text-xs
                      text-on-surface-variant
                      mt-1
                    "
                  >
                    Ask questions from a resource
                  </div>

                </div>

              </button>

            </div>

          </section>

        )}


        {/* =================================================
            TIP
        ================================================== */}

        {!loading &&
          !error &&
          normalizedResources.length >
            0 && (

          <section
            className="
              rounded-xl
              border
              border-outline-variant
              bg-surface-container-lowest
              px-4
              py-3
              mt-4
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                w-8
                h-8
                rounded-lg
                bg-secondary-container
                text-secondary
                flex
                items-center
                justify-center
                shrink-0
              "
            >
              <span
                className="
                  material-symbols-outlined
                  text-[18px]
                "
              >
                lightbulb
              </span>
            </div>


            <p
              className="
                text-sm
                text-on-surface-variant
              "
            >

              <span
                className="
                  font-bold
                  text-on-surface
                "
              >
                Tip:
              </span>{" "}

              Use{" "}

              <span
                className="
                  font-semibold
                  text-tertiary
                "
              >
                Ask Copilot
              </span>{" "}

              to get grounded answers from your study materials.

            </p>

          </section>

        )}

      </div>


      {/* =================================================
          RESOURCE Q&A MODAL
      ================================================== */}

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

            {/* HEADER */}

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

              <div
                className="
                  flex
                  items-start
                  gap-3
                  min-w-0
                "
              >

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

                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      gap-2
                    "
                  >

                    <h2
                      className="
                        font-title-md
                        font-bold
                        text-on-surface
                        text-base
                        md:text-lg
                      "
                    >
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


                  <p
                    className="
                      font-body-sm
                      text-sm
                      font-semibold
                      text-tertiary
                      mt-1
                      truncate
                    "
                  >
                    {
                      selectedResource.title
                    }
                  </p>


                  <p
                    className="
                      font-mono-sm
                      text-xs
                      text-on-surface-variant
                      mt-0.5
                    "
                  >
                    {
                      selectedResource
                        .subjectCode
                    }{" "}
                    ·{" "}
                    {
                      selectedResource
                        .chunkCount
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
                disabled={
                  asking
                }
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


            {/* BODY */}

            <div
              className="
                flex-1
                overflow-y-auto
                p-4
                md:p-5
              "
            >

              {qaMessages.length ===
              0 ? (

                <div
                  className="
                    max-w-xl
                    mx-auto
                    py-6
                  "
                >

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
                      <span
                        className="
                          material-symbols-outlined
                          text-[30px]
                        "
                      >
                        menu_book
                      </span>
                    </div>


                    <h3
                      className="
                        font-title-md
                        font-bold
                        text-on-surface
                        mt-4
                      "
                    >
                      Ask questions from this resource
                    </h3>


                    <p
                      className="
                        font-body-sm
                        text-on-surface-variant
                        mt-2
                        leading-relaxed
                      "
                    >
                      CampusCopilot retrieves relevant sections from this document and answers using only the indexed material.
                    </p>

                  </div>


                  <div
                    className="
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-2
                      mt-6
                    "
                  >

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

                <div
                  className="
                    flex
                    flex-col
                    gap-4
                    max-w-2xl
                    mx-auto
                  "
                >

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
                            <p
                              className="
                                font-body-sm
                                text-sm
                                whitespace-pre-wrap
                                leading-relaxed
                              "
                            >
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

                            <div
                              className="
                                flex
                                items-center
                                gap-2
                                mb-2
                              "
                            >

                              <span
                                className="
                                  material-symbols-outlined
                                  text-tertiary
                                  text-[17px]
                                "
                              >
                                auto_awesome
                              </span>


                              <span
                                className="
                                  font-label-caps
                                  text-xs
                                  font-bold
                                  text-tertiary
                                "
                              >
                                CampusCopilot Intelligence
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
                                  RESOURCE GROUNDED
                                </span>

                              )}

                            </div>


                            <p
                              className="
                                font-body-sm
                                text-sm
                                text-on-surface
                                whitespace-pre-wrap
                                leading-relaxed
                              "
                            >
                              {
                                message.text
                              }
                            </p>


                            {message.retrieval && (

                              <div
                                className="
                                  font-mono-sm
                                  mt-3
                                  pt-2
                                  border-t
                                  border-outline-variant
                                  text-[10px]
                                  text-outline
                                  flex
                                  flex-wrap
                                  gap-x-3
                                  gap-y-1
                                "
                              >

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

                        <div
                          className="
                            flex
                            items-center
                            gap-2
                            font-label-caps
                            text-sm
                            text-tertiary
                            font-semibold
                          "
                        >

                          <span
                            className="
                              material-symbols-outlined
                              animate-pulse
                              text-[18px]
                            "
                          >
                            auto_awesome
                          </span>

                          Searching this resource...

                        </div>

                      </div>

                    </div>

                  )}

                </div>

              )}


              {/* Q&A ERROR */}

              {qaError && (

                <div
                  className="
                    max-w-2xl
                    mx-auto
                    mt-4
                  "
                >

                  <div
                    className={`rounded-xl p-3 text-sm flex items-start gap-2 ${
                      qaErrorCode ===
                      "AI_QUOTA_EXCEEDED"
                        ? "bg-surface-container-low border border-outline-variant text-on-surface-variant"
                        : "bg-error-container text-on-error-container"
                    }`}
                  >

                    <span
                      className="
                        material-symbols-outlined
                        text-[18px]
                        shrink-0
                      "
                    >
                      {qaErrorCode ===
                      "AI_QUOTA_EXCEEDED"
                        ? "schedule"
                        : "error"}
                    </span>


                    <div>

                      <p
                        className="
                          font-body-sm
                          font-semibold
                        "
                      >
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
                          className="
                            mt-2
                            text-primary
                            font-bold
                            text-xs
                            hover:underline
                          "
                        >
                          Open resource instead
                        </button>

                      )}

                    </div>

                  </div>

                </div>

              )}

            </div>


            {/* INPUT */}

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

              <div
                className="
                  max-w-2xl
                  mx-auto
                "
              >

                <div
                  className="
                    flex
                    items-end
                    gap-2
                  "
                >

                  <textarea
                    value={
                      question
                    }
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
                    maxLength={
                      2000
                    }
                    disabled={
                      asking
                    }
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


                <div
                  className="
                    font-mono-sm
                    flex
                    justify-between
                    items-center
                    mt-1.5
                    text-[10px]
                    text-outline
                  "
                >

                  <span>
                    Answers are limited to the selected study resource.
                  </span>

                  <span>
                    {
                      question.length
                    }
                    /2000
                  </span>

                </div>

              </div>

            </form>

          </div>

        </div>

      )}

    </StudentPageLayout>
  );
}