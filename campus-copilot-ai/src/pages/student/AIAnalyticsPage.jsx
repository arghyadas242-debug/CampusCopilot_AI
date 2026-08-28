import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  aiService,
  authService,
} from "../../services/api";

import StudentNotificationBell from "./StudentNotificationBell";


function getInitials(name = "") {
  const parts =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 0) {
    return "ST";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}


function getSubjectAccent(score) {
  if (score === null) {
    return "border-t-outline";
  }

  if (score >= 85) {
    return "border-t-secondary";
  }

  if (score >= 75) {
    return "border-t-primary";
  }

  if (score >= 65) {
    return "border-t-tertiary";
  }

  return "border-t-error";
}


function getInsightBadge(type) {
  switch (type) {
    case "HIGH_IMPACT":
      return {
        label:
          "High Impact",

        className:
          "bg-error-container text-on-error-container",
      };


    case "WORKLOAD":
      return {
        label:
          "Workload",

        className:
          "bg-tertiary-container text-on-tertiary",
      };


    case "EXAM":
      return {
        label:
          "Exam Priority",

        className:
          "bg-primary/10 text-primary",
      };


    case "CONSISTENCY":
    default:
      return {
        label:
          "Consistency",

        className:
          "bg-secondary-container text-on-secondary-container",
      };
  }
}


function formatExamDate(value) {
  if (!value) {
    return "Not scheduled";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",
    }
  );
}


export default function AIAnalyticsPage() {
  const currentUser =
    authService.getCurrentUser();


  const studentRoll =
    currentUser?.rollNumber ||
    currentUser?.studentRoll ||
    currentUser?.roll_number ||
    "";


  const studentName =
    currentUser?.name ||
    "Student";


  const initials =
    getInitials(
      studentName
    );


  const [
    analytics,
    setAnalytics,
  ] = useState(null);


  const [
    insights,
    setInsights,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const [
    aiInsightsAvailable,
    setAiInsightsAvailable,
  ] = useState(false);


  // =====================================================
  // LOAD REAL ANALYTICS
  // =====================================================

  const loadAnalytics =
    async () => {

      if (!studentRoll) {
        setError(
          "Your student roll number could not be identified. Please log in again."
        );

        setLoading(false);

        return;
      }


      try {
        setLoading(true);

        setError("");


        const response =
          await aiService
            .getPerformanceAnalytics(
              studentRoll
            );


        setAnalytics(
          response.analytics
        );


        setInsights(
          Array.isArray(
            response.insights
          )
            ? response.insights
            : []
        );


        setAiInsightsAvailable(
          Boolean(
            response.aiInsightsAvailable
          )
        );

      } catch (requestError) {
        console.error(
          "AI Analytics Error:",
          requestError
        );


        setAnalytics(null);

        setInsights([]);


        setError(
          requestError.message ||
            "Unable to load your academic analytics."
        );

      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
    loadAnalytics();
  }, [studentRoll]);


  // =====================================================
  // LOADING
  // =====================================================

  if (
    loading &&
    !analytics
  ) {
    return (
      <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">

        <header className="bg-surface sticky top-0 w-full z-50 flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md border-b border-surface-container-high">

          <div className="flex items-center gap-sm">

            <Link
              to="/profile"
              className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold"
            >
              {initials}
            </Link>


            <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
              CampusCopilot
            </span>

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


        <main className="pt-6 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto">

          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px]">

            <span className="material-symbols-outlined text-primary text-4xl animate-pulse">
              insights
            </span>


            <p className="font-title-md font-semibold text-on-surface mt-3">
              Building your academic analytics...
            </p>


            <p className="font-body-sm text-on-surface-variant mt-1">
              CampusCopilot is checking your live academic records.
            </p>

          </div>

        </main>

      </div>
    );
  }


  // =====================================================
  // ERROR
  // =====================================================

  if (
    error ||
    !analytics
  ) {
    return (
      <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">

        <header className="bg-surface sticky top-0 w-full z-50 flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md border-b border-surface-container-high">

          <div className="flex items-center gap-sm">

            <Link
              to="/profile"
              className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold"
            >
              {initials}
            </Link>


            <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
              CampusCopilot
            </span>

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


        <main className="pt-6 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto">

          <div className="bg-surface-container-lowest border border-error/30 rounded-xl p-8 shadow-sm text-center">

            <span className="material-symbols-outlined text-error text-4xl">
              error
            </span>


            <h2 className="font-title-md font-bold text-on-surface mt-3">
              Analytics unavailable
            </h2>


            <p className="font-body-sm text-on-surface-variant mt-2">
              {error}
            </p>


            <button
              type="button"
              onClick={
                loadAnalytics
              }
              className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold cursor-pointer"
            >
              Retry
            </button>

          </div>

        </main>

      </div>
    );
  }


  // =====================================================
  // REAL DATA
  // =====================================================

  const readinessScore =
    analytics
      ?.readiness
      ?.score;


  const displayReadiness =
    readinessScore === null
      ? "--"
      : readinessScore;


  const readinessProgress =
    readinessScore === null
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            readinessScore
          )
        );


  const subjectScores =
    Array.isArray(
      analytics.subjects
    )
      ? analytics.subjects
      : [];


  const nextExam =
    analytics.exams
      ?.nextExam;


  const primaryInsight =
    insights?.[0];


  const primaryInsightBadge =
    primaryInsight
      ? getInsightBadge(
          primaryInsight.type
        )
      : null;


  const askCopilotQuery =
    "Review my current attendance, pending assignments, upcoming exams and timetable and tell me what I should focus on this week.";


  const askCopilotHref =
    `/ai-chat?q=${encodeURIComponent(
      askCopilotQuery
    )}`;


  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">

      {/* =================================================
          TOP APP BAR
      ================================================= */}

      <header className="bg-surface sticky top-0 w-full z-50 flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md border-b border-surface-container-high">

        <div className="flex items-center gap-sm">

          <Link
            to="/profile"
            className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold"
          >
            {getInitials(
              analytics.student
                ?.name ||
                studentName
            )}
          </Link>


          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
            CampusCopilot
          </span>

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
          MAIN CONTENT
      ================================================= */}

      <main className="pt-6 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto md:grid md:grid-cols-12 md:gap-6">

        {/* Header */}

        <div className="col-span-12 mb-md">

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">

            <div>

              <h1 className="font-headline-lg md:font-display-lg text-primary font-bold">
                AI Performance Analytics
              </h1>


              <p className="font-body-md text-on-surface-variant mt-1 max-w-2xl">
                Personalized academic intelligence based on your live attendance, assignments, exams and timetable.
              </p>

            </div>


            <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary">

              <span className="material-symbols-outlined text-[17px]">
                database
              </span>

              Live campus data

            </div>

          </div>

        </div>


        {/* =================================================
            LEFT COLUMN
        ================================================= */}

        <div className="col-span-12 md:col-span-4 min-w-0 flex flex-col gap-6">

          {/* Readiness */}

          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-md flex flex-col items-center text-center shadow-sm">

            <h3 className="font-title-md text-on-surface font-bold mb-sm w-full text-left">
              Study Readiness Score
            </h3>


            <div className="relative w-40 h-40 flex items-center justify-center my-2">

              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 100 100"
              >

                <circle
                  className="text-surface-container-high"
                  cx="50"
                  cy="50"
                  fill="none"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                />


                <circle
                  className="text-secondary"
                  cx="50"
                  cy="50"
                  fill="none"
                  r="42"
                  stroke="currentColor"
                  strokeDasharray="263.89"
                  strokeDashoffset={
                    263.89 *
                    (
                      1 -
                      readinessProgress /
                        100
                    )
                  }
                  strokeLinecap="round"
                  strokeWidth="8"
                />

              </svg>


              <div className="absolute inset-0 flex flex-col items-center justify-center">

                <span className="font-display-lg text-primary font-bold text-3xl">
                  {displayReadiness}
                </span>


                <span className="font-label-caps text-on-surface-variant text-xs font-semibold">
                  / 100
                </span>

              </div>

            </div>


            <p className="font-body-sm text-on-surface-variant mt-1">

              Current status:{" "}

              <span className="font-semibold text-on-surface">
                {analytics.readiness.status}
              </span>

              . This readiness index combines attendance, assignment completion and current workload.

            </p>


            <p className="text-[10px] text-outline mt-2">
              CampusCopilot readiness is an advisory index, not a university grade or GPA.
            </p>

          </div>


          {/* Subject readiness */}

          <div className="min-w-0 grid grid-cols-2 gap-4">

            {subjectScores.length >
            0 ? (

              subjectScores.map(
                (subject) => (
                  <div
                    key={
                      subject.subjectCode
                    }
                    className={`min-w-0 bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-3 shadow-sm border-t-4 ${getSubjectAccent(
                      subject.readinessScore
                    )}`}
                  >

                    <span className="font-mono-sm text-on-surface-variant text-xs block mb-0.5 break-words">
                      {subject.subjectCode}
                    </span>


                    <span className="font-title-md text-on-surface font-bold block text-lg">
                      {subject.readinessScore ===
                      null
                        ? "--"
                        : `${subject.readinessScore}%`}
                    </span>


                    <span className="text-[11px] font-semibold text-outline break-words">
                      {subject.status}
                    </span>

                  </div>
                )
              )

            ) : (

              <div className="col-span-2 bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 text-center">

                <p className="font-body-sm text-on-surface-variant">
                  No subject analytics are currently available.
                </p>

              </div>

            )}

          </div>


          {/* Primary Copilot recommendation */}

          <div className="min-w-0 bg-tertiary-container/10 border border-outline-variant/70 rounded-xl p-md shadow-sm flex flex-col gap-4">

            <div className="min-w-0 flex items-center gap-2">

              <span className="material-symbols-outlined text-tertiary shrink-0">
                smart_toy
              </span>


              <h3 className="min-w-0 font-title-md text-on-surface font-bold">
                Copilot Recommendation
              </h3>

            </div>


            {primaryInsight ? (

              <div className="min-w-0 flex flex-col gap-3">

                <div>

                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full font-label-caps text-xs font-semibold ${primaryInsightBadge.className}`}
                  >
                    {primaryInsightBadge.label}
                  </span>

                </div>


                <div className="min-w-0">

                  <h4 className="font-title-md text-on-surface font-semibold text-base break-words">
                    {primaryInsight.title}
                  </h4>


                  <p className="font-body-sm text-on-surface-variant text-sm mt-1 break-words">
                    {primaryInsight.description}
                  </p>

                </div>

              </div>

            ) : (

              <p className="font-body-sm text-on-surface-variant text-sm break-words">
                Your academic data is available, but CampusCopilot does not have a new recommendation right now.
              </p>

            )}


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

              <Link
                to={askCopilotHref}
                className="min-w-0 px-3 py-2 bg-primary text-on-primary rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 text-center hover:opacity-90 transition-opacity"
              >

                <span className="material-symbols-outlined text-[17px] shrink-0">
                  smart_toy
                </span>

                Ask Copilot

              </Link>


              <button
                type="button"
                onClick={
                  loadAnalytics
                }
                disabled={loading}
                className="min-w-0 px-3 py-2 border border-primary text-primary bg-transparent rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 text-center cursor-pointer hover:bg-primary/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >

                <span
                  className={`material-symbols-outlined text-[17px] shrink-0 ${
                    loading
                      ? "animate-spin"
                      : ""
                  }`}
                >
                  refresh
                </span>

                {loading
                  ? "Refreshing..."
                  : "Refresh Insight"}

              </button>

            </div>

          </div>

        </div>


        {/* =================================================
            RIGHT COLUMN
        ================================================= */}

        <div className="col-span-12 md:col-span-8 min-w-0 flex flex-col gap-6 mt-md md:mt-0">

          {/* Academic milestone instead of fake SGPA */}

          <div className="min-w-0 bg-gradient-to-r from-primary-container to-tertiary-container text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="min-w-0 flex-1">

              <span className="text-xs uppercase font-bold tracking-widest text-teal-300">
                Academic Outlook
              </span>


              {nextExam ? (
                <>
                  <h3 className="text-2xl font-bold mt-1 text-white">
                    Next Exam:{" "}
                    {nextExam.subjectName}
                  </h3>


                  <p className="text-sm text-white/80 mt-0.5">
                    {nextExam.examType ||
                      "Exam"}{" "}
                    on{" "}
                    {formatExamDate(
                      nextExam.examDate
                    )}
                    {" · "}
                    {nextExam.daysUntil} day(s) remaining.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold mt-1 text-white">
                    No Upcoming Exam Scheduled
                  </h3>


                  <p className="text-sm text-white/80 mt-0.5">
                    CampusCopilot currently has no future exam record for your account.
                  </p>
                </>
              )}


              <p className="text-xs text-white/70 mt-2">
                Overall attendance:{" "}
                {analytics.attendance
                  .percentage ===
                null
                  ? "No data"
                  : `${analytics.attendance.percentage}%`}
                {" · "}
                Pending assignments:{" "}
                {analytics.assignments
                  .pending}
              </p>

            </div>


            <Link
              to="/ai-chat?q=Give me an academic overview and tell me what I should focus on based on my attendance, assignments and exams"
              className="shrink-0 px-4 py-2 bg-white text-primary rounded-lg font-semibold text-xs whitespace-nowrap hover:bg-slate-100 transition-colors shadow-sm self-start md:self-center"
            >
              Optimize Study Schedule
            </Link>

          </div>


          {/* =================================================
              AI INSIGHTS
          ================================================= */}

          <div className="min-w-0 bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-md shadow-sm">

            <div className="flex items-center justify-between mb-4">

              <h3 className="font-title-md text-on-surface font-bold">
                Copilot Study Insights
              </h3>


              {aiInsightsAvailable && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-tertiary">

                  <span className="material-symbols-outlined text-[14px]">
                    auto_awesome
                  </span>

                  AI generated

                </span>
              )}

            </div>


            <div className="min-w-0 flex flex-col gap-4">

              {insights.map(
                (
                  recommendation,
                  index
                ) => {

                  const badge =
                    getInsightBadge(
                      recommendation.type
                    );


                  return (
                    <div
                      key={
                        `${recommendation.type}-${index}`
                      }
                      className="min-w-0 p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-col gap-1"
                    >

                      <div className="flex items-center justify-between">

                        <span
                          className={`px-2.5 py-0.5 rounded-full font-label-caps text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>

                      </div>


                      <h4 className="font-title-md text-on-surface font-semibold text-base mt-1 break-words">
                        {recommendation.title}
                      </h4>


                      <p className="font-body-sm text-on-surface-variant text-sm break-words">
                        {recommendation.description}
                      </p>

                    </div>
                  );
                }
              )}

            </div>

          </div>

        </div>

      </main>


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
            to="/ai-analytics"
            className="flex flex-col items-center justify-center text-primary font-bold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              insights
            </span>

            <span className="text-[10px] mt-1">
              Analytics
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
