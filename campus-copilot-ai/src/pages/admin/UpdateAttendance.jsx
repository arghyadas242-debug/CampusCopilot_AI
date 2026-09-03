import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminSidebar from "../../components/admin/AdminSidebar";

const API_URL = "http://localhost:5000";

export default function UpdateAttendance() {
  // =====================================================
  // FILTER / SESSION STATE
  // =====================================================

  const [selectedSubject, setSelectedSubject] =
    useState("");

  const [selectedSection, setSelectedSection] =
    useState("");

  const [sessionType, setSessionType] =
    useState("Theory Lecture (1 Hour)");

  // =====================================================
  // DATABASE DATA
  // =====================================================

  const [subjects, setSubjects] =
    useState([]);

  const [sections, setSections] =
    useState([]);

  const [studentList, setStudentList] =
    useState([]);

  // =====================================================
  // UI STATE
  // =====================================================

  const [loading, setLoading] =
    useState(true);

  const [
    loadingStudents,
    setLoadingStudents,
  ] = useState(false);

  const [isSaved, setIsSaved] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    sessionSubmitted,
    setSessionSubmitted,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    savedSessionId,
    setSavedSessionId,
  ] = useState(null);

  // =====================================================
  // RESET SESSION UI STATE
  // =====================================================

  const resetSessionState = () => {
    setIsSaved(false);
    setSessionSubmitted(false);
    setError("");
    setSuccessMessage("");
    setSavedSessionId(null);
  };

  // =====================================================
  // RESET CURRENT ROLL CALL
  //
  // Theory and Lab are independent sessions.
  // When admin switches session type or subject,
  // reset everybody to PRESENT and mark manually.
  // =====================================================

  const resetStudentStatuses = () => {
    setStudentList((previous) =>
      previous.map((student) => ({
        ...student,
        status: "present",
      }))
    );
  };

  // =====================================================
  // LOAD SUBJECTS + SECTIONS
  // =====================================================

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          subjectsResponse,
          sectionsResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/api/attendance/subjects`
          ),

          fetch(
            `${API_URL}/api/attendance/sections`
          ),
        ]);

        const subjectsData =
          await subjectsResponse.json();

        const sectionsData =
          await sectionsResponse.json();

        if (!subjectsResponse.ok) {
          throw new Error(
            subjectsData.error ||
              "Unable to load subjects"
          );
        }

        if (!sectionsResponse.ok) {
          throw new Error(
            sectionsData.error ||
              "Unable to load sections"
          );
        }

        const realSubjects =
          Array.isArray(subjectsData)
            ? subjectsData
            : [];

        const realSections =
          Array.isArray(sectionsData)
            ? sectionsData
            : [];

        setSubjects(realSubjects);
        setSections(realSections);

        if (realSubjects.length > 0) {
          setSelectedSubject(
            realSubjects[0].SUBJECT_CODE
          );
        }

        if (realSections.length > 0) {
          setSelectedSection(
            realSections[0].SECTION
          );
        }
      } catch (err) {
        console.error(
          "Attendance setup error:",
          err
        );

        setError(
          err.message ||
            "Unable to load attendance data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // =====================================================
  // LOAD STUDENTS WHEN SECTION CHANGES
  // =====================================================

  useEffect(() => {
    if (!selectedSection) {
      setStudentList([]);
      return;
    }

    const loadStudents = async () => {
      try {
        setLoadingStudents(true);

        resetSessionState();

        const response = await fetch(
          `${API_URL}/api/attendance/roster?section=${encodeURIComponent(
            selectedSection
          )}`
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load students"
          );
        }

        const realStudents =
          Array.isArray(data)
            ? data.map((student) => ({
                id:
                  student.STUDENT_ROLL,

                name:
                  student.NAME,

                /*
                  Every new attendance session starts
                  with PRESENT selected.

                  The admin can individually toggle
                  students to ABSENT.
                */
                status: "present",
              }))
            : [];

        setStudentList(
          realStudents
        );
      } catch (err) {
        console.error(
          "Roster load error:",
          err
        );

        setStudentList([]);

        setError(
          err.message ||
            "Unable to load student roster."
        );
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [selectedSection]);

  // =====================================================
  // SUBJECT CHANGE
  // =====================================================

  const handleSubjectChange = (e) => {
    setSelectedSubject(
      e.target.value
    );

    /*
      Different subject =
      different attendance session.

      Do not carry old roll-call statuses.
    */
    resetStudentStatuses();

    resetSessionState();
  };

  // =====================================================
  // SECTION CHANGE
  // =====================================================

  const handleSectionChange = (e) => {
    setSelectedSection(
      e.target.value
    );

    resetSessionState();
  };

  // =====================================================
  // SESSION TYPE CHANGE
  //
  // VERY IMPORTANT:
  //
  // Theory and Lab must be treated independently.
  //
  // Example:
  //
  // Theory -> ABSENT
  // Lab    -> PRESENT
  //
  // Therefore switching Theory/Lab resets the
  // roll call instead of carrying previous statuses.
  // =====================================================

  const handleSessionTypeChange = (e) => {
    setSessionType(
      e.target.value
    );

    resetStudentStatuses();

    resetSessionState();
  };

  // =====================================================
  // TOGGLE PRESENT / ABSENT
  // =====================================================

  const toggleStatus = (id) => {
    if (
      sessionSubmitted ||
      isSubmitting
    ) {
      return;
    }

    setIsSaved(false);
    setSuccessMessage("");

    setStudentList((previous) =>
      previous.map((student) =>
        student.id === id
          ? {
              ...student,

              status:
                student.status ===
                "present"
                  ? "absent"
                  : "present",
            }
          : student
      )
    );
  };

  // =====================================================
  // MARK ALL PRESENT
  // =====================================================

  const markAllPresent = () => {
    if (
      sessionSubmitted ||
      isSubmitting
    ) {
      return;
    }

    setStudentList((previous) =>
      previous.map((student) => ({
        ...student,
        status: "present",
      }))
    );

    setIsSaved(false);
    setSuccessMessage("");
  };

  // =====================================================
  // MARK ALL ABSENT
  // =====================================================

  const markAllAbsent = () => {
    if (
      sessionSubmitted ||
      isSubmitting
    ) {
      return;
    }

    setStudentList((previous) =>
      previous.map((student) => ({
        ...student,
        status: "absent",
      }))
    );

    setIsSaved(false);
    setSuccessMessage("");
  };

  // =====================================================
  // SAVE ATTENDANCE
  // =====================================================

  const handleSave = async (e) => {
    e.preventDefault();

    if (!selectedSubject) {
      setError(
        "Please select a subject."
      );

      return;
    }

    if (!selectedSection) {
      setError(
        "Please select a section."
      );

      return;
    }

    if (!sessionType) {
      setError(
        "Please select a session type."
      );

      return;
    }

    if (
      studentList.length === 0
    ) {
      setError(
        "There are no students to mark attendance for."
      );

      return;
    }

    /*
      Frontend duplicate protection.

      Backend unique session protection
      remains the final authority.
    */
    if (sessionSubmitted) {
      setError(
        "This attendance session has already been submitted."
      );

      return;
    }

    try {
      setIsSubmitting(true);

      setError("");
      setIsSaved(false);
      setSuccessMessage("");
      setSavedSessionId(null);

      const records =
        studentList.map(
          (student) => ({
            studentRoll:
              student.id,

            status:
              student.status,
          })
        );

      const response =
        await fetch(
          `${API_URL}/api/attendance/mark`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              subjectCode:
                selectedSubject,

              section:
                selectedSection,

              sessionType,

              records,
            }),
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save attendance"
        );
      }

      /*
        Only lock the current session when
        backend confirms successful save.
      */
      setIsSaved(true);
      setSessionSubmitted(true);

      setSavedSessionId(
        data.sessionId || null
      );

      setSuccessMessage(
        data.message ||
          "Attendance saved successfully"
      );
    } catch (err) {
      console.error(
        "Attendance save error:",
        err
      );

      setIsSaved(false);

      /*
        IMPORTANT:

        Do not set sessionSubmitted=true here.

        If backend rejects Theory because it is
        already submitted, admin must still be
        able to change dropdown to Lab and submit
        the Lab attendance separately.
      */

      setSessionSubmitted(false);

      setError(
        err.message ||
          "Unable to save attendance."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // ATTENDANCE COUNTS
  // =====================================================

  const presentCount =
    studentList.filter(
      (student) =>
        student.status ===
        "present"
    ).length;

  const absentCount =
    studentList.filter(
      (student) =>
        student.status ===
        "absent"
    ).length;

  const selectedSubjectData =
    subjects.find(
      (subject) =>
        subject.SUBJECT_CODE ===
        selectedSubject
    );

  const selectedSubjectName =
    selectedSubjectData
      ?.SUBJECT_NAME ||
    selectedSubject;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pb-[64px] md:pb-12">
      <AdminSidebar />

      <main className="md:ml-[280px] min-h-screen flex flex-col">
        {/* =================================================
            TOP NAVIGATION
        ================================================= */}

        <header className="sticky top-0 w-full z-40 bg-surface border-b border-outline-variant shadow-xs">
          <div className="flex justify-between items-center px-4 md:px-8 py-3 max-w-[1440px] mx-auto w-full">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center"
              >
                <span className="material-symbols-outlined">
                  arrow_back
                </span>
              </Link>

              <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
                Update Attendance
              </h1>
            </div>

            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant text-xs">
              <span className="material-symbols-outlined text-primary text-base">
                calendar_month
              </span>

              <span className="font-semibold text-on-surface">
                Today, Session Active
              </span>
            </div>
          </div>
        </header>

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <div className="flex-1 max-w-[1440px] mx-auto w-full p-4 md:p-8 flex flex-col gap-6 pt-6">
          <div className="flex flex-col gap-6">
            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-sm flex items-start gap-2">
                <span className="material-symbols-outlined text-base mt-0.5">
                  error
                </span>

                <div>
                  <p className="font-semibold">
                    {error}
                  </p>

                  {error
                    .toLowerCase()
                    .includes(
                      "already been submitted"
                    ) && (
                    <p className="text-xs mt-1 opacity-80">
                      If this was the
                      Theory class, change
                      Session Type to Lab
                      Practical to record
                      the Lab attendance
                      separately.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* =================================================
                SESSION / COURSE DETAILS
            ================================================= */}

            <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-title-md font-bold text-on-surface">
                    Session & Course Details
                  </h2>

                  <p className="text-xs text-on-surface-variant mt-1">
                    Theory and Lab are
                    stored as separate
                    attendance sessions.
                  </p>
                </div>

                {selectedSubject &&
                  selectedSection && (
                    <div className="text-xs bg-primary/5 border border-primary/15 text-primary rounded-xl px-3 py-2">
                      <span className="font-bold">
                        Current Session:
                      </span>{" "}
                      {selectedSubject}
                      {" • "}
                      Section{" "}
                      {selectedSection}
                    </div>
                  )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* SUBJECT */}

                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-outline text-xs uppercase">
                    Subject
                  </label>

                  <select
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    value={
                      selectedSubject
                    }
                    onChange={
                      handleSubjectChange
                    }
                    disabled={
                      loading ||
                      isSubmitting
                    }
                  >
                    {subjects.length ===
                      0 && (
                      <option value="">
                        No subjects
                        available
                      </option>
                    )}

                    {subjects.map(
                      (subject) => (
                        <option
                          key={
                            subject.SUBJECT_CODE
                          }
                          value={
                            subject.SUBJECT_CODE
                          }
                        >
                          {
                            subject.SUBJECT_CODE
                          }
                          {" - "}
                          {
                            subject.SUBJECT_NAME
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* SECTION */}

                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-outline text-xs uppercase">
                    Section
                  </label>

                  <select
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    value={
                      selectedSection
                    }
                    onChange={
                      handleSectionChange
                    }
                    disabled={
                      loading ||
                      isSubmitting
                    }
                  >
                    {sections.length ===
                      0 && (
                      <option value="">
                        No sections
                        available
                      </option>
                    )}

                    {sections.map(
                      (section) => (
                        <option
                          key={
                            section.SECTION
                          }
                          value={
                            section.SECTION
                          }
                        >
                          Section{" "}
                          {
                            section.SECTION
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* SESSION TYPE */}

                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-outline text-xs uppercase">
                    Session Type
                  </label>

                  <select
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    value={sessionType}
                    onChange={
                      handleSessionTypeChange
                    }
                    disabled={
                      isSubmitting
                    }
                  >
                    <option value="Theory Lecture (1 Hour)">
                      Theory Lecture (1 Hour)
                    </option>

                    <option value="Lab Practical (2 Hours)">
                      Lab Practical (2 Hours)
                    </option>
                  </select>
                </div>
              </div>

              {/* SESSION INFORMATION */}

              <div className="mt-4 p-3 rounded-xl bg-surface-container-low border border-outline-variant/70 flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  info
                </span>

                <p className="text-xs text-on-surface-variant">
                  Changing from{" "}
                  <strong>
                    Theory
                  </strong>{" "}
                  to{" "}
                  <strong>
                    Lab
                  </strong>{" "}
                  starts an independent
                  roll call. A student can
                  therefore be Present in
                  Theory and Absent in Lab,
                  or vice versa.
                </p>
              </div>
            </section>

            {/* =================================================
                STUDENT ROLL CALL
            ================================================= */}

            <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-surface-variant">
                <div>
                  <h3 className="font-title-md font-bold text-on-surface text-lg">
                    Student Roll Call
                  </h3>

                  <p className="text-xs text-on-surface-variant mt-1">
                    {selectedSubjectName ||
                      "Subject"}
                    {" • "}
                    Section{" "}
                    {selectedSection ||
                      "--"}
                    {" • "}
                    {sessionType}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* PRESENT COUNT */}

                  <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                    {presentCount}
                    {" / "}
                    {
                      studentList.length
                    }
                    {" Present"}
                  </span>

                  {/* ABSENT COUNT */}

                  <span className="px-3 py-1 bg-error-container text-on-error-container rounded-full text-xs font-bold">
                    {absentCount}
                    {" Absent"}
                  </span>
                </div>
              </div>

              {/* =================================================
                  BULK ACTIONS
              ================================================= */}

              {!loadingStudents &&
                studentList.length >
                  0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      type="button"
                      onClick={
                        markAllPresent
                      }
                      disabled={
                        sessionSubmitted ||
                        isSubmitting
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary-container text-on-secondary-container hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark All Present
                    </button>

                    <button
                      type="button"
                      onClick={
                        markAllAbsent
                      }
                      disabled={
                        sessionSubmitted ||
                        isSubmitting
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-error-container text-on-error-container hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark All Absent
                    </button>
                  </div>
                )}

              {/* =================================================
                  LOADING
              ================================================= */}

              {loadingStudents && (
                <div className="py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary animate-spin">
                    progress_activity
                  </span>

                  <p className="text-sm text-on-surface-variant mt-2">
                    Loading students...
                  </p>
                </div>
              )}

              {/* =================================================
                  EMPTY
              ================================================= */}

              {!loadingStudents &&
                studentList.length ===
                  0 && (
                  <div className="py-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline">
                      groups
                    </span>

                    <p className="text-sm text-on-surface-variant mt-2">
                      No students found
                      in this section.
                    </p>
                  </div>
                )}

              {/* =================================================
                  STUDENTS
              ================================================= */}

              {!loadingStudents &&
                studentList.length >
                  0 && (
                  <div className="flex flex-col divide-y divide-surface-variant">
                    {studentList.map(
                      (student) => (
                        <div
                          key={
                            student.id
                          }
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {student.name
                                ?.split(" ")
                                .filter(
                                  Boolean
                                )
                                .slice(0, 2)
                                .map(
                                  (
                                    word
                                  ) =>
                                    word[0]
                                )
                                .join("")
                                .toUpperCase() ||
                                "ST"}
                            </div>

                            <div className="min-w-0">
                              <div className="font-semibold text-on-surface text-sm truncate">
                                {
                                  student.name
                                }
                              </div>

                              <div className="font-mono-sm text-xs text-outline">
                                {
                                  student.id
                                }
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              toggleStatus(
                                student.id
                              )
                            }
                            disabled={
                              sessionSubmitted ||
                              isSubmitting
                            }
                            className={`min-w-[92px] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${
                              student.status ===
                              "present"
                                ? "bg-secondary text-on-secondary shadow-xs hover:bg-secondary/90"
                                : "bg-error text-on-error shadow-xs hover:bg-error/90"
                            }`}
                          >
                            {
                              student.status
                            }
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}

              {/* =================================================
                  SUCCESS
              ================================================= */}

              {isSaved && (
                <div className="mt-5 p-4 bg-secondary-container text-on-secondary-container rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined">
                    check_circle
                  </span>

                  <div>
                    <p className="text-sm font-bold">
                      {successMessage ||
                        "Attendance saved successfully."}
                    </p>

                    <p className="text-xs mt-1 opacity-80">
                      {selectedSubject}
                      {" • "}
                      Section{" "}
                      {selectedSection}
                      {" • "}
                      {sessionType}

                      {savedSessionId
                        ? ` • Session ${savedSessionId}`
                        : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* =================================================
                  SAVE BUTTON
              ================================================= */}

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-on-surface-variant">
                  <span className="font-semibold text-on-surface">
                    {presentCount}
                  </span>{" "}
                  present,
                  {" "}
                  <span className="font-semibold text-on-surface">
                    {absentCount}
                  </span>{" "}
                  absent out of{" "}
                  <span className="font-semibold text-on-surface">
                    {
                      studentList.length
                    }
                  </span>{" "}
                  students.
                </div>

                <button
                  type="button"
                  onClick={
                    handleSave
                  }
                  disabled={
                    isSubmitting ||
                    loadingStudents ||
                    studentList.length ===
                      0 ||
                    sessionSubmitted
                  }
                  className="px-6 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl hover:bg-primary-container transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isSubmitting
                      ? "progress_activity"
                      : sessionSubmitted
                      ? "check_circle"
                      : "save"}
                  </span>

                  {isSubmitting
                    ? "Saving..."
                    : sessionSubmitted
                    ? "Attendance Submitted"
                    : "Save & Sync to Database"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}