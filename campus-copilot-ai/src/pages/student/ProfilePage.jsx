import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import StudentPageLayout from "../../components/student/StudentPageLayout";
import {
  authService,
} from "../../services/api";


const API_URL =
  "http://localhost:5000";


// =====================================================
// HELPERS
// =====================================================

function getInitials(name) {
  const parts =
    String(
      name || "Student"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (
    parts.length >= 2
  ) {
    return (
      parts[0][0] +
      parts[1][0]
    ).toUpperCase();
  }


  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }


  return "--";
}


// =====================================================
// AUTH TOKEN
// =====================================================

function getAuthToken() {
  if (
    typeof authService
      ?.getToken ===
    "function"
  ) {
    const serviceToken =
      authService.getToken();

    if (serviceToken) {
      return serviceToken;
    }
  }


  return (
    localStorage.getItem(
      "campus_token"
    ) ||
    ""
  );
}


// =====================================================
// LAST LOGIN FORMATTER
// =====================================================

function formatLastLogin(
  value
) {
  if (!value) {
    return "Not available";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }


  try {
    const formatted =
      new Intl.DateTimeFormat(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit",

          hour12:
            true,

          timeZone:
            "Asia/Kolkata",
        }
      ).format(date);


    return formatted.replace(
      /\b(am|pm)\b/gi,
      (value) =>
        value.toUpperCase()
    );

  } catch {
    return date.toLocaleString(
      "en-IN"
    );
  }
}


// =====================================================
// NUMBER FORMATTER
// =====================================================

function displayValue(
  value,
  fallback = "--"
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }


  return value;
}


// =====================================================
// PROFILE PAGE
// =====================================================

export default function ProfilePage() {
  // ===================================================
  // CURRENT LOCAL USER
  // ===================================================

  const currentUser =
    authService.getCurrentUser();


  // ===================================================
  // PROFILE STATE
  // ===================================================

  const [
    studentInfo,
    setStudentInfo,
  ] = useState(null);


  const [
    accountInfo,
    setAccountInfo,
  ] = useState(null);


  const [
    academicSummary,
    setAcademicSummary,
  ] = useState({
    hasAcademicSummary:
      false,

    cgpa:
      null,

    creditsEarned:
      null,

    totalProgramCredits:
      null,

    completedSemesters:
      null,

    updatedAt:
      null,
  });


  // ===================================================
  // ACADEMIC METRICS
  // ===================================================

  const [
    academicMetrics,
    setAcademicMetrics,
  ] = useState({
    attendancePercentage:
      null,

    attendedClasses:
      0,

    totalClasses:
      0,

    completedAssignments:
      0,

    totalAssignments:
      0,

    upcomingExams:
      0,
  });


  // ===================================================
  // PAGE STATE
  // ===================================================

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  // ===================================================
  // STUDENT ROLL
  // ===================================================

  const studentRoll =
    String(
      currentUser?.rollNumber ||
      currentUser?.studentRoll ||
      currentUser?.student_roll ||
      ""
    ).trim();


  // ===================================================
  // LOAD PROFILE
  // ===================================================

  useEffect(() => {
    let cancelled =
      false;


    async function loadProfile() {
      try {
        setLoading(true);
        setError("");


        if (!studentRoll) {
          throw new Error(
            "Student roll number was not found. Please log in again."
          );
        }


        const token =
          getAuthToken();


        const authHeaders =
          token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {};


        // ===============================================
        // 1. STUDENT RECORD
        // ===============================================

        const studentResponse =
          await fetch(
            `${API_URL}/api/students/${encodeURIComponent(
              studentRoll
            )}`,
            {
              headers:
                authHeaders,
            }
          );


        if (
          !studentResponse.ok
        ) {
          let message =
            "Unable to load student profile.";


          try {
            const data =
              await studentResponse.json();

            if (data?.error) {
              message =
                data.error;
            }

          } catch {
            // Keep generic error.
          }


          throw new Error(
            message
          );
        }


        const studentData =
          await studentResponse.json();


        if (
          !studentData ||
          !studentData.STUDENT_ROLL ||
          !studentData.NAME
        ) {
          throw new Error(
            "Invalid student profile data received."
          );
        }


        if (!cancelled) {
          setStudentInfo({
            studentId:
              studentData.STUDENT_ID ??
              null,

            name:
              studentData.NAME,

            email:
              studentData.EMAIL ||
              "",

            rollNumber:
              studentData.STUDENT_ROLL,

            department:
              studentData.DEPARTMENT ||
              "",

            semester:
              studentData.SEMESTER ??
              null,

            section:
              studentData.SECTION ||
              "",
          });
        }


        // ===============================================
        // 2. ACCOUNT INFORMATION / LAST LOGIN
        // ===============================================

        if (token) {
          try {
            const accountResponse =
              await fetch(
                `${API_URL}/api/auth/me`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              );


            if (
              accountResponse.ok
            ) {
              const accountData =
                await accountResponse.json();


              if (!cancelled) {
                setAccountInfo(
                  accountData?.user ||
                    null
                );
              }

            } else {
              console.warn(
                "Unable to load account information."
              );
            }

          } catch (
            accountError
          ) {
            console.warn(
              "Account information error:",
              accountError
            );
          }
        }


        // ===============================================
        // 3. ACADEMIC SUMMARY
        // CGPA + CREDITS
        // ===============================================

        try {
          const summaryResponse =
            await fetch(
              `${API_URL}/api/students/${encodeURIComponent(
                studentRoll
              )}/academic-summary`,
              {
                headers:
                  authHeaders,
              }
            );


          if (
            summaryResponse.ok
          ) {
            const summaryData =
              await summaryResponse.json();


            if (!cancelled) {
              setAcademicSummary({
                hasAcademicSummary:
                  Boolean(
                    summaryData
                      ?.hasAcademicSummary
                  ),

                cgpa:
                  summaryData?.cgpa ??
                  null,

                creditsEarned:
                  summaryData
                    ?.creditsEarned ??
                  null,

                totalProgramCredits:
                  summaryData
                    ?.totalProgramCredits ??
                  null,

                completedSemesters:
                  summaryData
                    ?.completedSemesters ??
                  null,

                updatedAt:
                  summaryData
                    ?.updatedAt ??
                  null,
              });
            }

          } else {
            console.warn(
              "Unable to load academic summary."
            );
          }

        } catch (
          summaryError
        ) {
          console.warn(
            "Academic summary error:",
            summaryError
          );
        }


        // ===============================================
        // 4. ATTENDANCE
        // ===============================================

        try {
          const attendanceResponse =
            await fetch(
              `${API_URL}/api/attendance/${encodeURIComponent(
                studentRoll
              )}`,
              {
                headers:
                  authHeaders,
              }
            );


          if (
            attendanceResponse.ok
          ) {
            const attendanceData =
              await attendanceResponse.json();


            if (
              Array.isArray(
                attendanceData
              )
            ) {
              let totalAttended =
                0;

              let totalClasses =
                0;


              attendanceData.forEach(
                (item) => {
                  totalAttended +=
                    Number(
                      item
                        ?.ATTENDED_CLASSES ??
                        item
                          ?.attendedClasses ??
                        0
                    ) || 0;


                  totalClasses +=
                    Number(
                      item
                        ?.TOTAL_CLASSES ??
                        item
                          ?.totalClasses ??
                        0
                    ) || 0;
                }
              );


              const percentage =
                totalClasses > 0
                  ? Number(
                      (
                        (
                          totalAttended /
                          totalClasses
                        ) *
                        100
                      ).toFixed(
                        1
                      )
                    )
                  : 0;


              if (!cancelled) {
                setAcademicMetrics(
                  (previous) => ({
                    ...previous,

                    attendancePercentage:
                      percentage,

                    attendedClasses:
                      totalAttended,

                    totalClasses,
                  })
                );
              }
            }
          }

        } catch (
          attendanceError
        ) {
          console.warn(
            "Attendance loading error:",
            attendanceError
          );
        }


        // ===============================================
        // 5. ASSIGNMENTS
        // ===============================================

        try {
          const assignmentResponse =
            await fetch(
              `${API_URL}/api/assignments/${encodeURIComponent(
                studentRoll
              )}`,
              {
                headers:
                  authHeaders,
              }
            );


          if (
            assignmentResponse.ok
          ) {
            const assignmentData =
              await assignmentResponse.json();


            const assignments =
              Array.isArray(
                assignmentData
              )
                ? assignmentData
                : Array.isArray(
                    assignmentData
                      ?.assignments
                  )
                ? assignmentData
                    .assignments
                : [];


            const completed =
              assignments.filter(
                (item) => {
                  const status =
                    String(
                      item?.STATUS ??
                        item?.status ??
                        ""
                    )
                      .trim()
                      .toLowerCase();


                  return (
                    status ===
                      "completed" ||
                    status ===
                      "submitted"
                  );
                }
              ).length;


            if (!cancelled) {
              setAcademicMetrics(
                (previous) => ({
                  ...previous,

                  completedAssignments:
                    completed,

                  totalAssignments:
                    assignments.length,
                })
              );
            }
          }

        } catch (
          assignmentError
        ) {
          console.warn(
            "Assignment loading error:",
            assignmentError
          );
        }


        // ===============================================
        // 6. EXAMS
        // ===============================================

        try {
          const examsResponse =
            await fetch(
              `${API_URL}/api/exams/${encodeURIComponent(
                studentRoll
              )}`,
              {
                headers:
                  authHeaders,
              }
            );


          if (
            examsResponse.ok
          ) {
            const examsData =
              await examsResponse.json();


            const exams =
              Array.isArray(
                examsData
              )
                ? examsData
                : [];


            if (!cancelled) {
              setAcademicMetrics(
                (previous) => ({
                  ...previous,

                  upcomingExams:
                    exams.length,
                })
              );
            }
          }

        } catch (
          examsError
        ) {
          console.warn(
            "Exam loading error:",
            examsError
          );
        }

      } catch (err) {
        console.error(
          "Profile loading error:",
          err
        );


        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load student profile."
          );
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }


    loadProfile();


    return () => {
      cancelled =
        true;
    };

  }, [
    studentRoll,
  ]);


  // ===================================================
  // INITIALS
  // ===================================================

  const initials =
    useMemo(
      () =>
        getInitials(
          studentInfo?.name ||
            currentUser?.name
        ),
      [
        studentInfo?.name,
        currentUser?.name,
      ]
    );


  // ===================================================
  // PROFILE COMPLETENESS
  // ===================================================

  const profileCompleteness =
    useMemo(() => {
      if (!studentInfo) {
        return 0;
      }


      const fields = [
        studentInfo.name,
        studentInfo.email,
        studentInfo.rollNumber,
        studentInfo.department,
        studentInfo.semester,
        studentInfo.section,
        studentInfo.studentId,
      ];


      const completed =
        fields.filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !==
              ""
        ).length;


      return Math.round(
        (
          completed /
          fields.length
        ) *
          100
      );

    }, [
      studentInfo,
    ]);


  // ===================================================
  // LAST LOGIN
  // ===================================================

  const lastLoginText =
    formatLastLogin(
      accountInfo?.lastLogin
    );


  // ===================================================
  // ACCOUNT STATUS
  // ===================================================

  const accountActive =
    Boolean(
      accountInfo
    );


  // ===================================================
  // CGPA
  // ===================================================

  const cgpaText =
    academicSummary
      .hasAcademicSummary &&
    academicSummary.cgpa !==
      null
      ? Number(
          academicSummary.cgpa
        ).toFixed(2)
      : "--";


  const cgpaSubtitle =
    academicSummary
      .hasAcademicSummary &&
    academicSummary
      .completedSemesters !==
      null
      ? `Till Semester ${academicSummary.completedSemesters}`
      : "Not recorded";


  // ===================================================
  // CREDITS
  // ===================================================

  const creditsText =
    academicSummary
      .hasAcademicSummary &&
    academicSummary
      .creditsEarned !== null
      ? academicSummary
          .creditsEarned
      : "--";


  const creditsSubtitle =
    academicSummary
      .hasAcademicSummary &&
    academicSummary
      .totalProgramCredits !==
      null
      ? `of ${academicSummary.totalProgramCredits}`
      : "Not recorded";


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <StudentPageLayout
        activePath="/profile"
        eyebrow="STUDENT PROFILE"
        title="My Profile"
        subtitle="View your CampusCopilot identity, academic records and account information."
      >
        <div className="min-h-[420px] rounded-2xl border border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[34px] animate-pulse">
              account_circle
            </span>
          </div>

          <h2 className="font-title-md font-bold text-on-surface mt-4">
            Loading Student Profile
          </h2>

          <p className="text-sm text-on-surface-variant mt-1">
            Loading your CampusCopilot records...
          </p>
        </div>
      </StudentPageLayout>
    );
  }


  // ===================================================
  // ERROR
  // ===================================================

  if (
    error ||
    !studentInfo
  ) {
    return (
      <StudentPageLayout
        activePath="/profile"
        eyebrow="STUDENT PROFILE"
        title="My Profile"
        subtitle="View your CampusCopilot identity, academic records and account information."
      >
        <div className="min-h-[360px] rounded-2xl border border-error/30 bg-surface-container-lowest flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-error-container text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[34px]">
              error
            </span>
          </div>

          <h2 className="font-title-md font-bold text-on-surface mt-4">
            Unable to Load Profile
          </h2>

          <p className="text-sm text-on-surface-variant mt-2 max-w-md">
            {error ||
              "Student information is unavailable."}
          </p>
        </div>
      </StudentPageLayout>
    );
  }


  // ===================================================
  // MAIN PAGE
  // ===================================================

  return (
    <StudentPageLayout
      activePath="/profile"
      eyebrow="STUDENT PROFILE"
      title="My Profile"
      subtitle="View your CampusCopilot identity, academic records and account information."
    >
      <div className="w-full pb-8 space-y-4">


        {/* =================================================
            TOP PROFILE AREA
        ================================================== */}

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(330px,0.82fr)_minmax(560px,1.58fr)] gap-4">


          {/* ===============================================
              PROFILE CARD
          ================================================ */}

          <div className="rounded-2xl border border-outline-variant overflow-hidden bg-surface-container-lowest">


            {/* HERO */}

            <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-container to-secondary text-white px-6 py-6 text-center">

              <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full border border-white/10" />

              <div className="absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-white/5" />


              <div className="relative z-10">

                <div className="mx-auto w-20 h-20 rounded-full bg-white/15 border-4 border-white/25 backdrop-blur-sm flex items-center justify-center text-2xl font-bold shadow-sm">
                  {initials}
                </div>


                <h2 className="mt-3 text-2xl font-bold font-headline-lg">
                  {studentInfo.name}
                </h2>


                <p className="text-sm text-white/90 mt-0.5">
                  {studentInfo.department ||
                    "Department not available"}
                </p>


                <div className="mt-3 flex flex-wrap justify-center gap-2">

                  <span className="px-3 py-1 rounded-full bg-white text-primary text-xs font-bold">
                    Semester{" "}
                    {displayValue(
                      studentInfo.semester
                    )}
                  </span>


                  <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">
                    Section{" "}
                    {displayValue(
                      studentInfo.section
                    )}
                  </span>

                </div>

              </div>

            </div>


            {/* IDENTITY SUMMARY */}

            <div className="grid grid-cols-3 divide-x divide-outline-variant border-b border-outline-variant">

              <div className="px-3 py-4 text-center">

                <span className="material-symbols-outlined text-primary text-[20px]">
                  badge
                </span>

                <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mt-1">
                  Student ID
                </p>

                <p className="text-sm font-bold text-on-surface mt-1">
                  {displayValue(
                    studentInfo.studentId
                  )}
                </p>

              </div>


              <div className="px-3 py-4 text-center">

                <span className="material-symbols-outlined text-primary text-[20px]">
                  id_card
                </span>

                <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mt-1">
                  University Roll
                </p>

                <p className="text-xs sm:text-sm font-bold text-on-surface mt-1 break-all">
                  {studentInfo.rollNumber}
                </p>

              </div>


              <div className="px-3 py-4 text-center">

                <span className="material-symbols-outlined text-primary text-[20px]">
                  verified_user
                </span>

                <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mt-1">
                  Profile Record
                </p>

                <p className="text-sm font-bold text-on-surface mt-1">
                  Loaded
                </p>

              </div>

            </div>


            {/* DIGITAL ID */}

            <div className="p-4">

              <Link
                to="/student-id"
                className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[20px]">
                  badge
                </span>

                View Digital Student ID
              </Link>

            </div>

          </div>


          {/* ===============================================
              OFFICIAL RECORDS
          ================================================ */}

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">

            <div className="flex items-center justify-between gap-4 mb-4">

              <div>
                <h2 className="font-title-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    school
                  </span>

                  Official Academic Records
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  Verified information from your CampusCopilot student record.
                </p>
              </div>

            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">


              {/* ROLL */}

              <RecordCard
                icon="id_card"
                label="University Roll No"
                value={
                  studentInfo.rollNumber
                }
              />


              {/* EMAIL */}

              <RecordCard
                icon="mail"
                label="University Email"
                value={
                  studentInfo.email ||
                  "Not available"
                }
              />


              {/* DEPARTMENT */}

              <RecordCard
                icon="account_balance"
                label="Department"
                value={
                  studentInfo.department ||
                  "Not available"
                }
              />


              {/* STUDENT ID */}

              <RecordCard
                icon="badge"
                label="Student ID"
                value={displayValue(
                  studentInfo.studentId,
                  "Not available"
                )}
              />


              {/* SEMESTER */}

              <RecordCard
                icon="layers"
                label="Current Semester"
                value={displayValue(
                  studentInfo.semester,
                  "Not available"
                )}
              />


              {/* SECTION */}

              <RecordCard
                icon="groups"
                label="Section"
                value={
                  studentInfo.section ||
                  "Not available"
                }
              />

            </div>

          </div>

        </section>


        {/* =================================================
            ACADEMIC + SECURITY
        ================================================== */}

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(620px,1.55fr)_minmax(360px,0.95fr)] gap-4">


          {/* ===============================================
              ACADEMIC OVERVIEW
          ================================================ */}

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">

            <div className="flex items-center justify-between gap-4 mb-4">

              <div>

                <h2 className="font-title-md font-bold text-on-surface flex items-center gap-2">

                  <span className="material-symbols-outlined text-primary">
                    menu_book
                  </span>

                  Academic Overview

                </h2>


                <p className="text-xs text-on-surface-variant mt-1">
                  Live summary from your academic records.
                </p>

              </div>


              <Link
                to="/ai-analytics"
                className="h-9 px-3 rounded-lg border border-outline-variant text-primary text-xs font-bold flex items-center gap-1 hover:bg-surface-container-low transition-colors"
              >
                View Analytics

                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>

            </div>


            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">


              {/* CGPA */}

              <MetricCard
                icon="trending_up"
                iconClass="bg-secondary-container text-secondary"
                label="CGPA"
                value={cgpaText}
                subtitle={
                  cgpaSubtitle
                }
              />


              {/* CREDITS */}

              <MetricCard
                icon="workspace_premium"
                iconClass="bg-orange-100 text-orange-600"
                label="Credits Earned"
                value={
                  creditsText
                }
                subtitle={
                  creditsSubtitle
                }
              />


              {/* COMPLETED */}

              <MetricCard
                icon="task_alt"
                iconClass="bg-purple-100 text-purple-700"
                label="Completed"
                value={
                  academicMetrics
                    .completedAssignments
                }
                subtitle={
                  academicMetrics
                    .totalAssignments > 0
                    ? `${academicMetrics.completedAssignments} of ${academicMetrics.totalAssignments} assignments`
                    : "Completed assignments"
                }
              />


              {/* ATTENDANCE */}

              <MetricCard
                icon="calendar_month"
                iconClass="bg-primary-fixed text-primary"
                label="Attendance"
                value={
                  academicMetrics
                    .attendancePercentage !==
                  null
                    ? `${academicMetrics.attendancePercentage}%`
                    : "--"
                }
                subtitle={
                  academicMetrics
                    .totalClasses > 0
                    ? `${academicMetrics.attendedClasses}/${academicMetrics.totalClasses} classes`
                    : "Overall attendance"
                }
              />

            </div>


            {!academicSummary.hasAcademicSummary && (
              <div className="mt-3 rounded-lg bg-surface-container-low border border-outline-variant/50 px-3 py-2 flex items-center gap-2">

                <span className="material-symbols-outlined text-primary text-[18px]">
                  info
                </span>

                <p className="text-xs text-on-surface-variant">
                  CGPA and credit information has not been added to your academic record yet.
                </p>

              </div>
            )}

          </div>


          {/* ===============================================
              CAMPUS ACCOUNT & SECURITY
          ================================================ */}

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-sm">


            {/* TITLE */}

            <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-2">

              <span className="material-symbols-outlined text-secondary text-[22px]">
                shield
              </span>

              <h2 className="font-title-md font-bold text-on-surface">
                Campus Account & Security
              </h2>

            </div>


            {/* ACCOUNT STATUS */}

            <SecurityRow
              icon="person"
              label="Account Status"
            >
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  accountActive
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {accountActive
                  ? "Active"
                  : "Unknown"}
              </span>
            </SecurityRow>


            {/* EMAIL */}

            <SecurityRow
              icon="mail"
              label="Email"
            >
              <span className="text-xs font-semibold text-on-surface text-right break-all">
                {studentInfo.email ||
                  accountInfo?.email ||
                  "Not available"}
              </span>
            </SecurityRow>


            {/* PASSWORD */}

            <SecurityRow
              icon="key"
              label="Password"
            >
              <div className="flex items-center gap-2">

                <span className="tracking-[2px] font-bold text-on-surface">
                  ••••••••
                </span>


                <button
                  type="button"
                  onClick={() => {
                    window.alert(
                      "Password change is not configured yet."
                    );
                  }}
                  className="h-8 px-3 rounded-lg border border-primary/40 text-primary text-xs font-bold hover:bg-primary-fixed transition-colors cursor-pointer"
                >
                  Change
                </button>

              </div>
            </SecurityRow>


            {/* LAST LOGIN */}

            <SecurityRow
              icon="schedule"
              label="Last Login"
              last
            >
              <div className="flex items-center gap-2 min-w-0">

                <span className="text-xs font-semibold text-on-surface text-right">
                  {lastLoginText}
                </span>

                <span className="material-symbols-outlined text-outline text-[18px]">
                  chevron_right
                </span>

              </div>
            </SecurityRow>

          </div>

        </section>


        {/* =================================================
            QUICK ACCESS
        ================================================== */}

        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">

          <h2 className="font-title-md font-bold text-on-surface">
            Quick Access
          </h2>


          <p className="text-xs text-on-surface-variant mt-1 mb-4">
            Jump directly to your most-used CampusCopilot pages.
          </p>


          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">

            <QuickAccessCard
              to="/student-id"
              icon="qr_code_2"
              iconClass="bg-primary-fixed text-primary"
              title="Digital ID"
              description="View your secure student identity"
            />


            <QuickAccessCard
              to="/attendance"
              icon="monitoring"
              iconClass="bg-secondary-container text-secondary"
              title="Attendance"
              description="Check subject-wise attendance"
            />


            <QuickAccessCard
              to="/assignments"
              icon="assignment"
              iconClass="bg-orange-100 text-orange-600"
              title="Assignments"
              description="View pending and completed tasks"
            />


            <QuickAccessCard
              to="/exams"
              icon="calendar_month"
              iconClass="bg-primary-fixed text-primary"
              title="Exams"
              description="Check upcoming examinations"
            />


            <QuickAccessCard
              to="/notices"
              icon="campaign"
              iconClass="bg-purple-100 text-purple-700"
              title="Notices"
              description="View campus announcements"
            />

          </div>

        </section>


        {/* =================================================
            PROFILE COMPLETENESS
        ================================================== */}

        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3">

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">


            <div className="w-9 h-9 rounded-lg bg-secondary-container text-secondary flex items-center justify-center shrink-0">

              <span className="material-symbols-outlined text-[21px]">
                info
              </span>

            </div>


            <div className="min-w-0 flex-1">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <p className="text-sm font-bold text-on-surface">
                    Academic record information
                  </p>


                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Your student identity and academic details are loaded from CampusCopilot records. Academic changes should be handled through the appropriate administrative process.
                  </p>

                </div>


                <div className="hidden md:block text-right shrink-0">

                  <p className="text-[10px] uppercase font-bold tracking-wide text-on-surface-variant">
                    Profile Completeness
                  </p>

                  <p className="text-sm font-bold text-primary mt-0.5">
                    {profileCompleteness}%
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

      </div>
    </StudentPageLayout>
  );
}


// =====================================================
// RECORD CARD
// =====================================================

function RecordCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-4 flex items-center gap-3">

      <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">

        <span className="material-symbols-outlined text-[22px]">
          {icon}
        </span>

      </div>


      <div className="min-w-0">

        <p className="text-[10px] uppercase tracking-wide font-bold text-on-surface-variant">
          {label}
        </p>


        <p className="mt-1 text-sm font-bold text-on-surface break-words">
          {value}
        </p>

      </div>

    </div>
  );
}


// =====================================================
// METRIC CARD
// =====================================================

function MetricCard({
  icon,
  iconClass,
  label,
  value,
  subtitle,
}) {
  return (
    <div className="min-h-[170px] rounded-xl border border-outline-variant bg-surface-container-low px-4 py-4 flex flex-col items-center justify-center text-center">

      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center ${iconClass}`}
      >
        <span className="material-symbols-outlined text-[23px]">
          {icon}
        </span>
      </div>


      <p className="text-xs font-bold text-on-surface mt-3">
        {label}
      </p>


      <p className="text-2xl font-extrabold text-primary mt-1">
        {value}
      </p>


      <p className="text-[10px] text-on-surface-variant mt-2">
        {subtitle}
      </p>

    </div>
  );
}


// =====================================================
// SECURITY ROW
// =====================================================

function SecurityRow({
  icon,
  label,
  children,
  last = false,
}) {
  return (
    <div
      className={`min-h-[51px] px-5 flex items-center justify-between gap-4 ${
        last
          ? ""
          : "border-b border-outline-variant"
      }`}
    >

      <div className="flex items-center gap-3 shrink-0">

        <span className="material-symbols-outlined text-primary text-[21px]">
          {icon}
        </span>


        <span className="text-xs text-on-surface">
          {label}
        </span>

      </div>


      <div className="min-w-0 flex justify-end">
        {children}
      </div>

    </div>
  );
}


// =====================================================
// QUICK ACCESS CARD
// =====================================================

function QuickAccessCard({
  to,
  icon,
  iconClass,
  title,
  description,
}) {
  return (
    <Link
      to={to}
      className="min-h-[78px] rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 flex items-center gap-3 hover:bg-surface-container transition-colors"
    >

      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
      >
        <span className="material-symbols-outlined text-[21px]">
          {icon}
        </span>
      </div>


      <div className="min-w-0">

        <p className="text-sm font-bold text-on-surface">
          {title}
        </p>


        <p className="text-[10px] text-on-surface-variant mt-0.5 leading-4">
          {description}
        </p>

      </div>

    </Link>
  );
}