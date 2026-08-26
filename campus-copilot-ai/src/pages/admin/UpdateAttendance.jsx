import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminSidebar from "../../components/admin/AdminSidebar";

const API_URL = "http://localhost:5000";

export default function UpdateAttendance() {
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const [sessionType, setSessionType] = useState(
    "Theory Lecture (1 Hour)"
  );

  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [studentList, setStudentList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prevent second submission from frontend
  const [sessionSubmitted, setSessionSubmitted] =
    useState(false);

  const [error, setError] = useState("");

  // =====================================================
  // LOAD SUBJECTS AND SECTIONS
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

        setError("");
        setIsSaved(false);
        setSessionSubmitted(false);

        const response = await fetch(
          `${API_URL}/api/attendance/roster?section=${encodeURIComponent(
            selectedSection
          )}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load students"
          );
        }

        const realStudents =
          Array.isArray(data)
            ? data.map((student) => ({
                id: student.STUDENT_ROLL,
                name: student.NAME,

                // Default every student to present.
                // Admin can toggle absent manually.
                status: "present",
              }))
            : [];

        setStudentList(realStudents);
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
    setSelectedSubject(e.target.value);

    // New session combination
    setIsSaved(false);
    setSessionSubmitted(false);
    setError("");
  };

  // =====================================================
  // SECTION CHANGE
  // =====================================================

  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value);

    // New session combination
    setIsSaved(false);
    setSessionSubmitted(false);
    setError("");
  };

  // =====================================================
  // SESSION TYPE CHANGE
  // =====================================================

  const handleSessionTypeChange = (e) => {
    setSessionType(e.target.value);

    // New session combination
    setIsSaved(false);
    setSessionSubmitted(false);
    setError("");
  };

  // =====================================================
  // TOGGLE PRESENT / ABSENT
  // =====================================================

  const toggleStatus = (id) => {
    if (sessionSubmitted) {
      return;
    }

    setIsSaved(false);

    setStudentList((previous) =>
      previous.map((student) =>
        student.id === id
          ? {
              ...student,

              status:
                student.status === "present"
                  ? "absent"
                  : "present",
            }
          : student
      )
    );
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

    if (studentList.length === 0) {
      setError(
        "There are no students to mark attendance for."
      );
      return;
    }

    // Extra frontend protection
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

      const records =
        studentList.map((student) => ({
          studentRoll: student.id,
          status: student.status,
        }));

      const response = await fetch(
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

            sessionType:
              sessionType,

            records,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save attendance"
        );
      }

      // Only show success if backend really succeeded
      setIsSaved(true);

      // Disable another submission for this session
      setSessionSubmitted(true);
    } catch (err) {
      console.error(
        "Attendance save error:",
        err
      );

      setIsSaved(false);

      setError(
        err.message ||
          "Unable to save attendance."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // PRESENT COUNT
  // =====================================================

  const presentCount =
    studentList.filter(
      (student) =>
        student.status === "present"
    ).length;

  // =====================================================
  // UI
  // DESIGN KEPT SAME
  // =====================================================

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pb-[64px] md:pb-12">

      <AdminSidebar />

      <main className="md:ml-[280px] min-h-screen flex flex-col">

      {/* =================================================
          TOP NAVIGATION BAR
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
          MAIN
      ================================================= */}

      <div className="flex-1 max-w-[1440px] mx-auto w-full p-4 md:p-8 flex flex-col gap-6 pt-6">

        {/* =================================================
            SIDEBAR
        ================================================= */}


        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="flex flex-col gap-6">

          {/* ERROR */}

          {error && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-sm flex items-center gap-2">

              <span className="material-symbols-outlined text-base">
                error
              </span>

              {error}

            </div>
          )}

          {/* =================================================
              FILTERS CARD
          ================================================= */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <h2 className="font-title-md font-bold text-on-surface mb-4">
              Session & Course Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* SUBJECT */}

              <div className="flex flex-col gap-1">

                <label className="font-label-caps text-outline text-xs uppercase">
                  Subject
                </label>

                <select
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  value={selectedSubject}
                  onChange={handleSubjectChange}
                  disabled={loading}
                >

                  {subjects.length === 0 && (
                    <option value="">
                      No subjects available
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
                  value={selectedSection}
                  onChange={handleSectionChange}
                  disabled={loading}
                >

                  {sections.length === 0 && (
                    <option value="">
                      No sections available
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

          </section>

          {/* =================================================
              STUDENT ROSTER
          ================================================= */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-surface-variant">

              <div>

                <h3 className="font-title-md font-bold text-on-surface text-lg">
                  Student Roll Call
                </h3>

                <p className="text-xs text-on-surface-variant">
                  Click student status to toggle Present / Absent.
                </p>

              </div>

              <div className="flex items-center gap-2">

                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                  {presentCount}
                  {" / "}
                  {studentList.length}
                  {" Present"}
                </span>

              </div>

            </div>

            {/* LOADING */}

            {loadingStudents && (
              <div className="py-8 text-center text-sm text-on-surface-variant">
                Loading students...
              </div>
            )}

            {/* NO STUDENTS */}

            {!loadingStudents &&
              studentList.length === 0 && (
                <div className="py-8 text-center">

                  <span className="material-symbols-outlined text-4xl text-outline">
                    groups
                  </span>

                  <p className="text-sm text-on-surface-variant mt-2">
                    No students found in this section.
                  </p>

                </div>
              )}

            {/* STUDENTS */}

            {!loadingStudents &&
              studentList.length > 0 && (
                <div className="flex flex-col divide-y divide-surface-variant">

                  {studentList.map(
                    (student) => (
                      <div
                        key={student.id}
                        className="py-3 flex items-center justify-between gap-4"
                      >

                        <div>

                          <div className="font-semibold text-on-surface text-sm">
                            {student.name}
                          </div>

                          <div className="font-mono-sm text-xs text-outline">
                            {student.id}
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
                            sessionSubmitted
                          }
                          className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer disabled:cursor-not-allowed ${
                            student.status ===
                            "present"
                              ? "bg-secondary text-on-secondary shadow-xs hover:bg-secondary/90"
                              : "bg-error text-on-error shadow-xs hover:bg-error/90"
                          }`}
                        >
                          {student.status}
                        </button>

                      </div>
                    )
                  )}

                </div>
              )}

            {/* SUCCESS */}

            {isSaved && (
              <div className="mt-4 p-3 bg-secondary-container text-on-secondary-container rounded-xl text-xs font-bold flex items-center gap-2">

                <span className="material-symbols-outlined text-base">
                  check_circle
                </span>

                Attendance synced successfully to student records and database!

              </div>
            )}

            {/* SAVE */}

            <div className="mt-6 flex justify-end">

              <button
                type="button"
                onClick={handleSave}
                disabled={
                  isSubmitting ||
                  loadingStudents ||
                  studentList.length === 0 ||
                  sessionSubmitted
                }
                className="px-6 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl hover:bg-primary-container transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >

                <span className="material-symbols-outlined text-[18px]">
                  save
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
