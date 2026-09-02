import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import AdminSidebar from "../../components/admin/AdminSidebar";

const API_URL = "http://localhost:5000";

// =====================================================
// EMPTY STATE FACTORIES
// =====================================================

function createEmptyStudent() {
  return {
    studentId: null,
    fullName: "",
    rollNumber: "",
    email: "",
    department: "",
    semester: "",
    section: "",
  };
}

function createEmptyNewStudent() {
  return {
    fullName: "",
    email: "",
    password: "",
    rollNumber: "",
    department: "",
    semester: "",
    section: "",
  };
}

function createEmptyAcademicSummary() {
  return {
    cgpa: "",
    creditsEarned: "",
    totalProgramCredits: "",
    completedSemesters: "",
  };
}

// =====================================================
// AUTH & NETWORK HELPERS
// =====================================================

function getToken() {
  return localStorage.getItem("campus_token") || "";
}

async function readJson(response) {
  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

async function fetchAllStudents() {
  const response = await fetch(`${API_URL}/api/students`);
  const data = await readJson(response);

  return Array.isArray(data)
    ? data
    : [];
}

async function fetchStudentSearchResults(query) {
  const response = await fetch(
    `${API_URL}/api/students/search?q=${encodeURIComponent(query)}`
  );

  const data = await readJson(response);

  return Array.isArray(data)
    ? data
    : [];
}

async function fetchAcademicSummary(studentRoll) {
  const token = getToken();

  const response = await fetch(
    `${API_URL}/api/students/${encodeURIComponent(
      studentRoll
    )}/academic-summary`,
    {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    }
  );

  return readJson(response);
}

function findExactStudent(students, query) {
  const normalizedQuery = String(query || "")
    .trim()
    .toLowerCase();

  const exact = students.find(
    (student) =>
      String(student.STUDENT_ROLL || "")
        .trim()
        .toLowerCase() === normalizedQuery
  );

  if (exact) {
    return exact;
  }

  if (students.length === 1) {
    return students[0];
  }

  return null;
}

function getStudentManagementPath(studentRoll) {
  if (!studentRoll) {
    return "/admin/students";
  }

  return `/admin/students?student=${encodeURIComponent(
    studentRoll
  )}`;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function UpdateStudent() {
  const [searchParams] = useSearchParams();

  const selectedStudentRoll = String(
    searchParams.get("student") || ""
  ).trim();

  // ---------------------------------------------------
  // SEARCH STATE
  // ---------------------------------------------------

  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // ---------------------------------------------------
  // UI & FORM STATES
  // ---------------------------------------------------

  const [mode, setMode] = useState("search");

  const [studentData, setStudentData] =
    useState(createEmptyStudent);

  const [studentLoaded, setStudentLoaded] =
    useState(false);

  const [newStudent, setNewStudent] =
    useState(createEmptyNewStudent);

  // ---------------------------------------------------
  // ACADEMIC SUMMARY STATE
  // ---------------------------------------------------

  const [academicSummary, setAcademicSummary] =
    useState(createEmptyAcademicSummary);

  const [
    academicSummaryExists,
    setAcademicSummaryExists,
  ] = useState(false);

  const [
    academicSummaryLoading,
    setAcademicSummaryLoading,
  ] = useState(false);

  const [
    academicSummarySaving,
    setAcademicSummarySaving,
  ] = useState(false);

  const [
    academicSummaryError,
    setAcademicSummaryError,
  ] = useState("");

  // ---------------------------------------------------
  // ACTION & FEEDBACK STATES
  // ---------------------------------------------------

  const [saving, setSaving] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ---------------------------------------------------
  // DIRECTORY STATE
  // ---------------------------------------------------

  const [students, setStudents] =
    useState([]);

  const [
    studentsLoading,
    setStudentsLoading,
  ] = useState(true);

  const [
    studentsError,
    setStudentsError,
  ] = useState("");

  const clearMessages =
    useCallback(() => {
      setError("");
      setSuccess("");
    }, []);

  function resetAcademicSummary() {
    setAcademicSummary(
      createEmptyAcademicSummary()
    );

    setAcademicSummaryExists(false);

    setAcademicSummaryError("");
  }

  // ---------------------------------------------------
  // LOAD DIRECTORY
  // ---------------------------------------------------

  const loadStudents =
    useCallback(async () => {
      try {
        setStudentsLoading(true);

        setStudentsError("");

        const data =
          await fetchAllStudents();

        setStudents(data);
      } catch (err) {
        console.error(
          "Students directory error:",
          err
        );

        setStudents([]);

        setStudentsError(
          err.message ||
            "Unable to load students."
        );
      } finally {
        setStudentsLoading(false);
      }
    }, []);

  useEffect(() => {
    let cancelled = false;

    fetchAllStudents()
      .then((data) => {
        if (!cancelled) {
          setStudents(data);
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Students directory error:",
          err
        );

        setStudents([]);

        setStudentsError(
          err.message ||
            "Unable to load students."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setStudentsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------
  // APPLY LOADED DATA TO STATE
  // ---------------------------------------------------

  function applyStudent(student) {
    const roll = String(
      student?.STUDENT_ROLL || ""
    ).trim();

    setStudentData({
      studentId:
        student?.STUDENT_ID ?? null,

      fullName:
        student?.NAME || "",

      rollNumber:
        roll,

      email:
        student?.EMAIL || "",

      department:
        student?.DEPARTMENT || "",

      semester:
        student?.SEMESTER === null ||
        student?.SEMESTER === undefined
          ? ""
          : String(student.SEMESTER),

      section:
        student?.SECTION || "",
    });

    setStudentLoaded(true);

    setSearchResults([]);

    setMode("edit");
  }

  function applyAcademicSummary(data) {
    setAcademicSummary({
      cgpa:
        data?.cgpa === null ||
        data?.cgpa === undefined
          ? ""
          : String(data.cgpa),

      creditsEarned:
        data?.creditsEarned === null ||
        data?.creditsEarned === undefined
          ? ""
          : String(data.creditsEarned),

      totalProgramCredits:
        data?.totalProgramCredits === null ||
        data?.totalProgramCredits === undefined
          ? ""
          : String(data.totalProgramCredits),

      completedSemesters:
        data?.completedSemesters === null ||
        data?.completedSemesters === undefined
          ? ""
          : String(data.completedSemesters),
    });

    setAcademicSummaryExists(
      Boolean(data?.hasAcademicSummary)
    );
  }

  async function loadAcademicSummary(
    studentRoll
  ) {
    if (!studentRoll) {
      resetAcademicSummary();
      return;
    }

    try {
      setAcademicSummaryLoading(true);

      setAcademicSummaryError("");

      const data =
        await fetchAcademicSummary(
          studentRoll
        );

      applyAcademicSummary(data);
    } catch (err) {
      console.error(
        "Academic summary load error:",
        err
      );

      resetAcademicSummary();

      setAcademicSummaryError(
        err.message ||
          "Unable to load academic summary."
      );
    } finally {
      setAcademicSummaryLoading(false);
    }
  }

  async function selectStudent(student) {
    clearMessages();

    applyStudent(student);

    const roll = String(
      student?.STUDENT_ROLL || ""
    ).trim();

    resetAcademicSummary();

    if (roll) {
      await loadAcademicSummary(roll);
    }
  }

  // ---------------------------------------------------
  // URL PARAM AUTO-LOAD EFFECT
  // ---------------------------------------------------

  useEffect(() => {
    if (!selectedStudentRoll) {
      return undefined;
    }

    let cancelled = false;

    async function loadUrlStudent() {
      try {
        setSearching(true);

        setError("");

        const results =
          await fetchStudentSearchResults(
            selectedStudentRoll
          );

        if (cancelled) {
          return;
        }

        if (results.length === 0) {
          setError("No student found.");
          return;
        }

        const student =
          findExactStudent(
            results,
            selectedStudentRoll
          );

        if (!student) {
          setSearchResults(results);
          return;
        }

        applyStudent(student);

        const roll = String(
          student.STUDENT_ROLL || ""
        ).trim();

        if (!roll) {
          return;
        }

        setAcademicSummaryLoading(true);

        try {
          const summary =
            await fetchAcademicSummary(
              roll
            );

          if (!cancelled) {
            applyAcademicSummary(
              summary
            );
          }
        } catch (summaryError) {
          if (!cancelled) {
            console.error(
              "Academic summary load error:",
              summaryError
            );

            resetAcademicSummary();

            setAcademicSummaryError(
              summaryError.message ||
                "Unable to load academic summary."
            );
          }
        } finally {
          if (!cancelled) {
            setAcademicSummaryLoading(
              false
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "URL student load error:",
            err
          );

          setError(
            err.message ||
              "Unable to load student."
          );
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }

    loadUrlStudent();

    return () => {
      cancelled = true;
    };
  }, [selectedStudentRoll]);

  // ---------------------------------------------------
  // SEARCH HANDLER
  // ---------------------------------------------------

  async function handleSearch(event) {
    if (
      event &&
      event.preventDefault
    ) {
      event.preventDefault();
    }

    const query =
      searchInput.trim();

    if (!query) {
      setError(
        "Enter a student name or roll number."
      );

      return;
    }

    try {
      setSearching(true);

      clearMessages();

      setSearchResults([]);

      const results =
        await fetchStudentSearchResults(
          query
        );

      if (results.length === 0) {
        setStudentLoaded(false);

        setError(
          "No student found."
        );

        return;
      }

      const exactStudent =
        findExactStudent(
          results,
          query
        );

      if (exactStudent) {
        await selectStudent(
          exactStudent
        );
      } else {
        setStudentLoaded(false);

        resetAcademicSummary();

        setSearchResults(results);
      }
    } catch (err) {
      console.error(
        "Student search error:",
        err
      );

      setError(
        err.message ||
          "Unable to search student."
      );
    } finally {
      setSearching(false);
    }
  }

  // ---------------------------------------------------
  // INPUT CHANGE HANDLERS
  // ---------------------------------------------------

  function handleStudentChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setStudentData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  }

  function handleNewStudentChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setNewStudent(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  }

  function handleAcademicSummaryChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setAcademicSummary(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setAcademicSummaryError("");
  }

  // ---------------------------------------------------
  // SAVE STUDENT DETAILS
  // ---------------------------------------------------

  async function handleSaveStudent(
    event
  ) {
    event.preventDefault();

    if (!studentData.rollNumber) {
      setError(
        "No student selected."
      );

      return;
    }

    try {
      setSaving(true);

      clearMessages();

      const response =
        await fetch(
          `${API_URL}/api/students/${encodeURIComponent(
            studentData.rollNumber
          )}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                studentData.fullName,

              email:
                studentData.email,

              department:
                studentData.department,

              semester:
                studentData.semester,

              section:
                studentData.section,
            }),
          }
        );

      await readJson(response);

      await loadStudents();

      setSuccess(
        "Student details updated successfully."
      );
    } catch (err) {
      console.error(
        "Student update error:",
        err
      );

      setError(
        err.message ||
          "Unable to update student."
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------
  // SAVE ACADEMIC SUMMARY
  // ---------------------------------------------------

  async function handleSaveAcademicSummary(
    event
  ) {
    event.preventDefault();

    if (!studentData.rollNumber) {
      setError(
        "No student selected."
      );

      return;
    }

    const {
      cgpa,
      creditsEarned,
      totalProgramCredits,
      completedSemesters,
    } = academicSummary;

    if (
      cgpa === "" ||
      creditsEarned === "" ||
      totalProgramCredits === "" ||
      completedSemesters === ""
    ) {
      setError(
        "Enter all four academic summary values."
      );

      return;
    }

    const parsedCgpa =
      Number(cgpa);

    const parsedCreditsEarned =
      Number(creditsEarned);

    const parsedTotalProgramCredits =
      Number(totalProgramCredits);

    const parsedCompletedSemesters =
      Number(completedSemesters);

    if (
      !Number.isFinite(
        parsedCgpa
      ) ||
      parsedCgpa < 0 ||
      parsedCgpa > 10
    ) {
      setError(
        "CGPA must be between 0 and 10."
      );

      return;
    }

    if (
      !Number.isInteger(
        parsedCreditsEarned
      ) ||
      parsedCreditsEarned < 0
    ) {
      setError(
        "Credits earned must be a whole number of 0 or more."
      );

      return;
    }

    if (
      !Number.isInteger(
        parsedTotalProgramCredits
      ) ||
      parsedTotalProgramCredits <
        0
    ) {
      setError(
        "Total program credits must be a whole number of 0 or more."
      );

      return;
    }

    if (
      parsedCreditsEarned >
      parsedTotalProgramCredits
    ) {
      setError(
        "Credits earned cannot exceed total program credits."
      );

      return;
    }

    if (
      !Number.isInteger(
        parsedCompletedSemesters
      ) ||
      parsedCompletedSemesters <
        0 ||
      parsedCompletedSemesters >
        8
    ) {
      setError(
        "Completed semesters must be a whole number between 0 and 8."
      );

      return;
    }

    const currentSemester =
      Number(
        studentData.semester
      );

    if (
      Number.isInteger(
        currentSemester
      ) &&
      currentSemester >= 1 &&
      parsedCompletedSemesters >=
        currentSemester
    ) {
      setError(
        `Completed semesters must be strictly less than the student's current semester (${currentSemester}).`
      );

      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        "Admin login token was not found. Please log in again."
      );

      return;
    }

    try {
      setAcademicSummarySaving(
        true
      );

      clearMessages();

      setAcademicSummaryError("");

      const response =
        await fetch(
          `${API_URL}/api/admin/students/${encodeURIComponent(
            studentData.rollNumber
          )}/academic-summary`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              cgpa:
                parsedCgpa,

              creditsEarned:
                parsedCreditsEarned,

              totalProgramCredits:
                parsedTotalProgramCredits,

              completedSemesters:
                parsedCompletedSemesters,
            }),
          }
        );

      await readJson(response);

      await loadAcademicSummary(
        studentData.rollNumber
      );

      setSuccess(
        "Official academic summary saved successfully."
      );
    } catch (err) {
      console.error(
        "Academic summary save error:",
        err
      );

      setError(
        err.message ||
          "Unable to save academic summary."
      );
    } finally {
      setAcademicSummarySaving(
        false
      );
    }
  }

  // ---------------------------------------------------
  // DELETE STUDENT
  // ---------------------------------------------------

  async function handleDeleteStudent() {
    if (!studentData.rollNumber) {
      setError(
        "No student selected."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${studentData.fullName} (${studentData.rollNumber})?\n\nThis will delete the student and related academic data.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      clearMessages();

      const response =
        await fetch(
          `${API_URL}/api/students/${encodeURIComponent(
            studentData.rollNumber
          )}`,
          {
            method: "DELETE",
          }
        );

      await readJson(response);

      setStudentData(
        createEmptyStudent()
      );

      setStudentLoaded(false);

      setSearchResults([]);

      resetAcademicSummary();

      setMode("search");

      await loadStudents();

      setSuccess(
        "Student deleted successfully."
      );
    } catch (err) {
      console.error(
        "Delete student error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete student."
      );
    } finally {
      setDeleting(false);
    }
  }

  // ---------------------------------------------------
  // CREATE STUDENT
  // ---------------------------------------------------

  async function handleAddStudent(
    event
  ) {
    event.preventDefault();

    if (
      !newStudent.fullName.trim() ||
      !newStudent.email.trim() ||
      !newStudent.password ||
      !newStudent.rollNumber.trim()
    ) {
      setError(
        "Name, email, password and roll number are required."
      );

      return;
    }

    try {
      setCreating(true);

      clearMessages();

      const response =
        await fetch(
          `${API_URL}/api/students`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                newStudent.fullName,

              email:
                newStudent.email,

              password:
                newStudent.password,

              studentRoll:
                newStudent.rollNumber,

              department:
                newStudent.department,

              semester:
                newStudent.semester,

              section:
                newStudent.section,
            }),
          }
        );

      await readJson(response);

      const createdStudent = {
        STUDENT_ID: null,

        NAME:
          newStudent.fullName,

        EMAIL:
          newStudent.email,

        STUDENT_ROLL:
          newStudent.rollNumber,

        DEPARTMENT:
          newStudent.department,

        SEMESTER:
          newStudent.semester,

        SECTION:
          newStudent.section,
      };

      setNewStudent(
        createEmptyNewStudent()
      );

      await loadStudents();

      await selectStudent(
        createdStudent
      );

      setSuccess(
        "Student created successfully."
      );
    } catch (err) {
      console.error(
        "Create student error:",
        err
      );

      setError(
        err.message ||
          "Unable to create student."
      );
    } finally {
      setCreating(false);
    }
  }

  function openAddMode() {
    setMode("add");

    setStudentLoaded(false);

    setSearchResults([]);

    resetAcademicSummary();

    setNewStudent(
      createEmptyNewStudent()
    );

    clearMessages();
  }

  function openSearchMode() {
    setMode("search");

    setStudentLoaded(false);

    setSearchResults([]);

    resetAcademicSummary();

    clearMessages();
  }

  function getInitials() {
    const name = String(
      studentData.fullName || ""
    ).trim();

    if (!name) {
      return "?";
    }

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (word) =>
          word[0]?.toUpperCase()
      )
      .join("");
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body-md antialiased">

      <AdminSidebar />

      <main className="min-h-screen md:ml-[280px] min-w-0">

        {/* HEADER */}

        <header className="sticky top-0 z-30 w-full bg-surface border-b border-outline-variant/50">

          <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">

            <div className="flex items-center gap-3 min-w-0">

              <Link
                to="/admin"
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center shrink-0"
              >
                <span className="material-symbols-outlined">
                  arrow_back
                </span>
              </Link>


              <div className="min-w-0">

                <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
                  Student Management
                </h1>

                <p className="text-xs text-on-surface-variant mt-0.5">
                  Add, search and update student records
                </p>

              </div>

            </div>


            <button
              type="button"
              onClick={openAddMode}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
            >

              <span className="material-symbols-outlined text-[18px]">
                person_add
              </span>

              <span className="hidden sm:inline">
                Add Student
              </span>

            </button>

          </div>

        </header>


        {/* PAGE CONTENT */}

        <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-5">


          {/* MODE BUTTONS */}

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={openSearchMode}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                mode !== "add"
                  ? "bg-secondary-container text-on-secondary-container"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Search / Update
            </button>


            <button
              type="button"
              onClick={openAddMode}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                mode === "add"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              + Add New Student
            </button>

          </div>


          {/* FEEDBACK */}

          {error && (
            <MessageBanner
              type="error"
              icon="error"
              text={error}
            />
          )}

          {success && (
            <MessageBanner
              type="success"
              icon="check_circle"
              text={success}
            />
          )}


          {/* ADD STUDENT */}

          {mode === "add" && (
            <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

              <div className="flex items-start justify-between gap-4 mb-6">

                <div>

                  <h2 className="font-title-md font-bold text-on-surface text-lg">
                    Add New Student
                  </h2>

                  <p className="text-xs text-on-surface-variant mt-1">
                    Create a student academic profile and login account.
                  </p>

                </div>


                <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">

                  <span className="material-symbols-outlined">
                    person_add
                  </span>

                </div>

              </div>


              <form
                onSubmit={handleAddStudent}
                className="space-y-4"
              >

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <InputField
                    label="Full Name"
                    name="fullName"
                    value={newStudent.fullName}
                    onChange={handleNewStudentChange}
                    required
                  />


                  <InputField
                    label="Roll Number"
                    name="rollNumber"
                    value={newStudent.rollNumber}
                    onChange={handleNewStudentChange}
                    required
                  />

                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <InputField
                    label="Email Address"
                    name="email"
                    type="email"
                    value={newStudent.email}
                    onChange={handleNewStudentChange}
                    required
                  />


                  <InputField
                    label="Initial Password"
                    name="password"
                    type="password"
                    minLength={6}
                    value={newStudent.password}
                    onChange={handleNewStudentChange}
                    required
                  />

                </div>


                <InputField
                  label="Department"
                  name="department"
                  value={newStudent.department}
                  onChange={handleNewStudentChange}
                />


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <SelectField
                    label="Semester"
                    name="semester"
                    value={newStudent.semester}
                    onChange={handleNewStudentChange}
                    placeholder="Select Semester"
                    options={[
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                      "8",
                    ]}
                  />


                  <SelectField
                    label="Section"
                    name="section"
                    value={newStudent.section}
                    onChange={handleNewStudentChange}
                    placeholder="Select Section"
                    options={[
                      "A",
                      "B",
                      "C",
                    ]}
                  />

                </div>


                <div className="flex justify-end pt-2">

                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >

                    <span className="material-symbols-outlined text-[18px]">
                      person_add
                    </span>

                    {creating
                      ? "Creating..."
                      : "Create Student"}

                  </button>

                </div>

              </form>

            </section>
          )}


          {/* SEARCH & MANAGE */}

          {mode !== "add" && (
            <>


              {/* SEARCH BAR */}

              <form
                onSubmit={handleSearch}
                className="flex gap-2 w-full"
              >

                <div className="relative flex-1 min-w-0">

                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">
                    search
                  </span>


                  <input
                    id="student-search-input"
                    name="studentSearch"
                    type="text"
                    autoComplete="off"
                    placeholder="Search student by name or roll number..."
                    value={searchInput}
                    onChange={(e) =>
                      setSearchInput(
                        e.target.value
                      )
                    }
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />

                </div>


                <button
                  type="submit"
                  disabled={searching}
                  className="px-5 md:px-6 rounded-xl bg-primary text-on-primary font-semibold text-sm disabled:opacity-50 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                >

                  {searching
                    ? "Searching..."
                    : "Search"}

                </button>

              </form>


              {/* SEARCH RESULTS */}

              {searchResults.length > 0 && (
                <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 overflow-hidden shadow-sm">

                  {searchResults.map(
                    (student) => (
                      <button
                        key={
                          student.STUDENT_ID ||
                          student.STUDENT_ROLL
                        }
                        type="button"
                        onClick={() =>
                          selectStudent(
                            student
                          )
                        }
                        className="w-full p-4 text-left border-b last:border-b-0 border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                      >

                        <p className="font-semibold text-on-surface">
                          {student.NAME}
                        </p>

                        <p className="text-xs text-on-surface-variant mt-1">

                          {student.STUDENT_ROLL}

                          {" • "}

                          {student.DEPARTMENT ||
                            "No department"}

                        </p>

                      </button>
                    )
                  )}

                </section>
              )}


              {/* EMPTY SEARCH */}

              {!studentLoaded &&
                searchResults.length === 0 && (
                  <section className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-10 text-center shadow-sm">

                    <span className="material-symbols-outlined text-5xl text-outline">
                      person_search
                    </span>

                    <h2 className="font-bold text-lg mt-3">
                      Search for a student
                    </h2>

                    <p className="text-sm text-on-surface-variant mt-1">
                      Enter a student name or roll number above to manage their details and official academic summary.
                    </p>

                  </section>
                )}


              {/* SELECTED STUDENT */}

              {studentLoaded && (
                <>


                  {/* PROFILE + EDIT */}

                  <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">


                    {/* LEFT PROFILE */}

                    <div className="lg:col-span-4 h-full bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-6 shadow-sm flex flex-col">


                      {/* EXISTING IDENTITY */}

                      <div className="flex flex-col items-center text-center">

                        <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-3xl shadow-sm">
                          {getInitials()}
                        </div>


                        <h2 className="font-title-md font-bold text-on-surface text-lg mt-4">
                          {studentData.fullName}
                        </h2>


                        <p className="text-xs text-outline mt-1 break-all">
                          {studentData.rollNumber}
                        </p>


                        <span className="mt-3 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold uppercase">
                          Student
                        </span>

                      </div>


                      {/* STUDENT INFO - ADDED TO USE EMPTY SPACE */}

                      <div className="w-full mt-5 pt-4 border-t border-outline-variant/60">

                        <div className="flex items-center gap-2 mb-3">

                          <span className="material-symbols-outlined text-primary text-[18px]">
                            badge
                          </span>

                          <h3 className="text-sm font-bold text-on-surface">
                            Student Info
                          </h3>

                        </div>


                        <div className="space-y-3">


                          {/* DEPARTMENT */}

                          <div>

                            <p className="text-[10px] uppercase tracking-wide text-outline font-semibold">
                              Department
                            </p>

                            <p className="text-xs font-semibold text-on-surface mt-1 leading-relaxed">
                              {studentData.department ||
                                "--"}
                            </p>

                          </div>


                          {/* SEMESTER + SECTION */}

                          <div className="grid grid-cols-2 gap-3">

                            <div>

                              <p className="text-[10px] uppercase tracking-wide text-outline font-semibold">
                                Semester
                              </p>

                              <p className="text-xs font-semibold text-on-surface mt-1">
                                {studentData.semester ||
                                  "--"}
                              </p>

                            </div>


                            <div>

                              <p className="text-[10px] uppercase tracking-wide text-outline font-semibold">
                                Section
                              </p>

                              <p className="text-xs font-semibold text-on-surface mt-1">
                                {studentData.section ||
                                  "--"}
                              </p>

                            </div>

                          </div>


                          {/* EMAIL */}

                          <div>

                            <p className="text-[10px] uppercase tracking-wide text-outline font-semibold">
                              Email
                            </p>

                            <p className="text-xs font-semibold text-on-surface mt-1 break-all">
                              {studentData.email ||
                                "--"}
                            </p>

                          </div>


                          {/* STUDENT ID */}

                          <div>

                            <p className="text-[10px] uppercase tracking-wide text-outline font-semibold">
                              Student ID
                            </p>

                            <p className="text-xs font-semibold text-on-surface mt-1">
                              {studentData.studentId ??
                                "--"}
                            </p>

                          </div>

                        </div>

                      </div>


                      {/* EXISTING CGPA / CREDITS */}

                      <div className="grid grid-cols-2 gap-3 mt-auto pt-5">

                        <MiniStat
                          label="CGPA"
                          value={
                            academicSummaryExists &&
                            academicSummary.cgpa !== ""
                              ? academicSummary.cgpa
                              : "--"
                          }
                        />


                        <MiniStat
                          label="Credits"
                          value={
                            academicSummaryExists &&
                            academicSummary.creditsEarned !== ""
                              ? academicSummary.creditsEarned
                              : "--"
                          }
                        />

                      </div>

                    </div>


                    {/* Right: Edit Student Details Card */}
<div className="lg:col-span-8 h-full bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm flex flex-col">

  <div className="mb-5">

    <h2 className="font-title-md font-bold text-on-surface">
      Edit Student Details
    </h2>

    <p className="text-xs text-on-surface-variant mt-1">
      Update the student's core Oracle record.
    </p>

  </div>


  <form
    onSubmit={handleSaveStudent}
    className="space-y-4"
  >

    {/* FULL NAME + ROLL NUMBER */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      <InputField
        label="Full Name"
        name="fullName"
        value={studentData.fullName}
        onChange={handleStudentChange}
        required
      />


      <InputField
        label="Roll / ID Number"
        value={studentData.rollNumber}
        readOnly
        className="bg-surface-container-high text-outline cursor-not-allowed"
        helpText="Roll number cannot be edited here."
      />

    </div>


    {/* EMAIL */}
    <InputField
      label="Email Address"
      name="email"
      type="email"
      value={studentData.email}
      onChange={handleStudentChange}
      required
    />


    {/* DEPARTMENT */}
    <InputField
      label="Department"
      name="department"
      value={studentData.department}
      onChange={handleStudentChange}
    />


    {/* SEMESTER + SECTION */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      <SelectField
        label="Semester"
        name="semester"
        value={studentData.semester}
        onChange={handleStudentChange}
        placeholder="Select Semester"
        options={[
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
        ]}
      />


      <SelectField
        label="Section"
        name="section"
        value={studentData.section}
        onChange={handleStudentChange}
        placeholder="Select Section"
        options={[
          "A",
          "B",
          "C",
        ]}
      />

    </div>


    {/* ACTION BUTTONS */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3">

      <button
        type="button"
        onClick={handleDeleteStudent}
        disabled={deleting || saving}
        className="px-5 py-2.5 border border-error text-error font-bold text-sm rounded-xl hover:bg-error-container transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
      >

        <span className="material-symbols-outlined text-[18px]">
          delete
        </span>

        {deleting
          ? "Deleting..."
          : "Delete Student"}

      </button>


      <button
        type="submit"
        disabled={saving || deleting}
        className="px-6 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity"
      >

        <span className="material-symbols-outlined text-[18px]">
          save
        </span>

        {saving
          ? "Saving..."
          : "Save Student Details"}

      </button>

    </div>

  </form>


  {/* =====================================================
      ACADEMIC RECORD STATUS
      Uses the remaining empty space without redesigning.
  ===================================================== */}

  <div className="mt-auto pt-5">

    <div className="border-t border-outline-variant/60 pt-4">

      <div className="flex items-center justify-between mb-4">

        <div className="flex items-center gap-2">

          <span className="material-symbols-outlined text-secondary text-[18px]">
            verified
          </span>

          <h3 className="text-sm font-bold text-on-surface">
            Academic Record Status
          </h3>

        </div>


        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold ${
            academicSummaryExists
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          {academicSummaryExists
            ? "RECORDED"
            : "NOT RECORDED"}
        </span>

      </div>


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* CURRENT SEMESTER */}
        <div className="rounded-xl bg-surface-container-low border border-outline-variant/50 p-3">

          <p className="text-[10px] uppercase tracking-wide text-outline font-semibold">
            Current Semester
          </p>

          <p className="text-sm font-bold text-primary mt-1">
            {studentData.semester || "--"}
          </p>

        </div>


        {/* COMPLETED SEMESTERS */}
        <div className="rounded-xl bg-surface-container-low border border-outline-variant/50 p-3">

          <p className="text-[10px] uppercase tracking-wide text-outline font-semibold">
            Completed
          </p>

          <p className="text-sm font-bold text-primary mt-1">
            {academicSummaryExists &&
            academicSummary.completedSemesters !== ""
              ? academicSummary.completedSemesters
              : "--"}
          </p>

        </div>


        {/* CGPA */}
        <div className="rounded-xl bg-surface-container-low border border-outline-variant/50 p-3">

          <p className="text-[10px] uppercase tracking-wide text-outline font-semibold">
            CGPA
          </p>

          <p className="text-sm font-bold text-primary mt-1">
            {academicSummaryExists &&
            academicSummary.cgpa !== ""
              ? academicSummary.cgpa
              : "--"}
          </p>

        </div>


        {/* CREDIT PROGRESS */}
        <div className="rounded-xl bg-surface-container-low border border-outline-variant/50 p-3">

          <p className="text-[10px] uppercase tracking-wide text-outline font-semibold">
            Credit Progress
          </p>

          <p className="text-sm font-bold text-primary mt-1">

            {academicSummaryExists &&
            academicSummary.creditsEarned !== "" &&
            academicSummary.totalProgramCredits !== "" &&
            Number(academicSummary.totalProgramCredits) > 0
              ? `${Math.round(
                  (Number(academicSummary.creditsEarned) /
                    Number(academicSummary.totalProgramCredits)) *
                    100
                )}%`
              : "--"}

          </p>

        </div>

      </div>


      {/* CREDIT PROGRESS BAR */}
      {academicSummaryExists &&
        academicSummary.creditsEarned !== "" &&
        academicSummary.totalProgramCredits !== "" &&
        Number(academicSummary.totalProgramCredits) > 0 && (

          <div className="mt-4">

            <div className="flex items-center justify-between mb-2">

              <span className="text-[10px] text-outline">
                Credit Completion
              </span>

              <span className="text-[10px] font-semibold text-on-surface-variant">

                {academicSummary.creditsEarned}

                {" / "}

                {academicSummary.totalProgramCredits}

              </span>

            </div>


            <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">

              <div
                className="h-full bg-secondary rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    (Number(academicSummary.creditsEarned) /
                      Number(academicSummary.totalProgramCredits)) *
                      100
                  )}%`,
                }}
              />

            </div>

          </div>

        )}

    </div>

  </div>

</div>

                  </section>


                  {/* OFFICIAL ACADEMIC SUMMARY */}

                  <section className="w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">

                      <div>

                        <h2 className="font-title-md font-bold text-on-surface text-lg flex items-center gap-2">

                          <span className="material-symbols-outlined text-secondary">
                            school
                          </span>

                          Official Academic Summary

                        </h2>


                        <p className="text-xs text-on-surface-variant mt-1">
                          These official values appear on the student's Profile page.
                        </p>

                      </div>


                      <span
                        className={`self-start px-3 py-1 rounded-full text-[10px] font-bold ${
                          academicSummaryExists
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >

                        {academicSummaryExists
                          ? "RECORDED"
                          : "NOT RECORDED"}

                      </span>

                    </div>


                    {academicSummaryError && (
                      <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-sm flex items-center gap-2">

                        <span className="material-symbols-outlined">
                          error
                        </span>

                        {academicSummaryError}

                      </div>
                    )}


                    {academicSummaryLoading ? (

                      <div className="py-10 text-center text-on-surface-variant">

                        <span className="material-symbols-outlined text-3xl text-primary animate-pulse">
                          progress_activity
                        </span>

                        <p className="mt-2 text-sm">
                          Loading academic summary...
                        </p>

                      </div>

                    ) : (

                      <form
                        onSubmit={handleSaveAcademicSummary}
                        className="space-y-4"
                      >


                        {!academicSummaryExists && (

                          <div className="p-3 rounded-xl border border-outline-variant bg-surface-container-low flex items-start gap-3">

                            <span className="material-symbols-outlined text-primary text-[20px]">
                              info
                            </span>

                            <p className="text-xs text-on-surface-variant">
                              No official academic summary is stored for this student yet. Enter all four values below.
                            </p>

                          </div>

                        )}


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                          {/* CGPA */}

                          <div className="flex flex-col gap-1">

                            <label className="font-label-caps text-outline text-xs uppercase">
                              CGPA
                            </label>

                            <input
                              type="text"
                              inputMode="decimal"
                              name="cgpa"
                              placeholder="0.00 - 10.00"
                              value={
                                academicSummary.cgpa ??
                                ""
                              }
                              onChange={
                                handleAcademicSummaryChange
                              }
                              className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              required
                            />

                          </div>


                          {/* COMPLETED SEMESTERS */}

                          <div className="flex flex-col gap-1">

                            <label className="font-label-caps text-outline text-xs uppercase">
                              Completed Semesters
                            </label>

                            <input
                              type="text"
                              inputMode="numeric"
                              name="completedSemesters"
                              placeholder="Completed semesters"
                              value={
                                academicSummary.completedSemesters ??
                                ""
                              }
                              onChange={
                                handleAcademicSummaryChange
                              }
                              className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              required
                            />


                            <span className="text-[10px] text-outline">

                              Must be strictly less than the current semester

                              {studentData.semester
                                ? ` (${studentData.semester}).`
                                : "."}

                            </span>

                          </div>

                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                          {/* CREDITS EARNED */}

                          <div className="flex flex-col gap-1">

                            <label className="font-label-caps text-outline text-xs uppercase">
                              Credits Earned
                            </label>

                            <input
                              type="text"
                              inputMode="numeric"
                              name="creditsEarned"
                              placeholder="Official earned credits"
                              value={
                                academicSummary.creditsEarned ??
                                ""
                              }
                              onChange={
                                handleAcademicSummaryChange
                              }
                              className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              required
                            />

                          </div>


                          {/* TOTAL PROGRAM CREDITS */}

                          <div className="flex flex-col gap-1">

                            <label className="font-label-caps text-outline text-xs uppercase">
                              Total Program Credits
                            </label>

                            <input
                              type="text"
                              inputMode="numeric"
                              name="totalProgramCredits"
                              placeholder="Official program total"
                              value={
                                academicSummary.totalProgramCredits ??
                                ""
                              }
                              onChange={
                                handleAcademicSummaryChange
                              }
                              className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              required
                            />

                          </div>

                        </div>


                        <div className="flex justify-end pt-1">

                          <button
                            type="submit"
                            disabled={
                              academicSummarySaving ||
                              deleting
                            }
                            className="px-5 py-2.5 bg-secondary text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                          >

                            <span className="material-symbols-outlined text-[18px]">
                              verified
                            </span>


                            {academicSummarySaving
                              ? "Saving Academic Summary..."
                              : academicSummaryExists
                              ? "Update Academic Summary"
                              : "Save Academic Summary"}

                          </button>

                        </div>

                      </form>

                    )}

                  </section>

                </>
              )}

            </>
          )}


          {/* STUDENT DIRECTORY */}

          <StudentDirectory
            students={students}
            loading={studentsLoading}
            error={studentsError}
            onRetry={loadStudents}
          />

        </div>

      </main>

    </div>
  );
}


// =====================================================
// INPUT FIELD
// =====================================================

function InputField({
  label,
  helpText,
  className = "",
  value,
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">

      {label && (
        <label className="font-label-caps text-outline text-xs uppercase">
          {label}
        </label>
      )}

      <input
        value={value ?? ""}
        {...props}
        className={`w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary ${className}`}
      />

      {helpText && (
        <span className="text-[10px] text-outline">
          {helpText}
        </span>
      )}

    </div>
  );
}


// =====================================================
// SELECT FIELD
// =====================================================

function SelectField({
  label,
  options = [],
  placeholder,
  value,
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">

      {label && (
        <label className="font-label-caps text-outline text-xs uppercase">
          {label}
        </label>
      )}

      <select
        value={value ?? ""}
        {...props}
        className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
      >

        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}

        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          )
        )}

      </select>

    </div>
  );
}


// =====================================================
// MINI STAT
// =====================================================

function MiniStat({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-surface-container-low border border-outline-variant/50 px-3 py-2">

      <p className="text-[10px] text-outline uppercase">
        {label}
      </p>

      <p className="font-bold text-primary mt-1">
        {value}
      </p>

    </div>
  );
}


// =====================================================
// MESSAGE BANNER
// =====================================================

function MessageBanner({
  type,
  icon,
  text,
}) {
  const style =
    type === "error"
      ? "bg-error-container text-on-error-container"
      : "bg-secondary-container text-on-secondary-container";

  return (
    <div
      className={`p-3 rounded-xl flex items-center gap-2 text-sm font-semibold ${style}`}
    >

      <span className="material-symbols-outlined">
        {icon}
      </span>

      <span>
        {text}
      </span>

    </div>
  );
}


// =====================================================
// STUDENT DIRECTORY
// =====================================================

function StudentDirectory({
  students,
  loading,
  error,
  onRetry,
}) {
  return (
    <section className="w-full bg-surface-container-lowest border border-outline-variant/70 rounded-2xl shadow-sm overflow-hidden">

      <div className="p-5 flex items-center justify-between gap-4 border-b border-outline-variant/70">

        <div>

          <h2 className="font-title-md font-bold text-on-surface">
            Student Directory
          </h2>

          <p className="font-body-sm text-xs text-on-surface-variant mt-1">
            All registered students
          </p>

        </div>


        <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold whitespace-nowrap">

          {students.length}{" "}

          {students.length === 1
            ? "Student"
            : "Students"}

        </span>

      </div>


      {loading ? (

        <div className="p-10 text-center text-on-surface-variant">

          <span className="material-symbols-outlined text-3xl text-primary animate-pulse">
            progress_activity
          </span>

          <p className="font-body-sm text-sm mt-2">
            Loading students...
          </p>

        </div>

      ) : error ? (

        <div className="p-10 text-center">

          <span className="material-symbols-outlined text-4xl text-error">
            error
          </span>

          <p className="font-title-md font-bold text-on-surface mt-2">
            Unable to load students.
          </p>

          <p className="font-body-sm text-xs text-on-surface-variant mt-1">
            {error}
          </p>


          <button
            type="button"
            onClick={onRetry}
            className="mt-4 px-4 py-2 border border-primary text-primary rounded-xl font-semibold text-sm hover:bg-primary-container transition-colors"
          >
            Retry
          </button>

        </div>

      ) : students.length === 0 ? (

        <div className="p-10 text-center">

          <span className="material-symbols-outlined text-4xl text-outline">
            group_off
          </span>

          <p className="font-title-md font-bold text-on-surface mt-2">
            No students found.
          </p>

          <p className="font-body-sm text-xs text-on-surface-variant mt-1">
            Students added to CampusCopilot will appear here.
          </p>

        </div>

      ) : (

        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm border-collapse">

            <thead>

              <tr className="border-b border-outline-variant/70 text-outline font-label-caps text-xs uppercase">

                <th className="py-2.5 px-3">
                  Student
                </th>

                <th className="py-2.5 px-3">
                  Roll ID
                </th>

                <th className="py-2.5 px-3">
                  Department
                </th>

                <th className="py-2.5 px-3">
                  Semester
                </th>

                <th className="py-2.5 px-3">
                  Section
                </th>

                <th className="py-2.5 px-3 text-right">
                  Actions
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-outline-variant/70">

              {students.map(
                (
                  student,
                  index
                ) => (

                  <tr
                    key={
                      student.STUDENT_ID ||
                      student.STUDENT_ROLL ||
                      index
                    }
                    className="hover:bg-surface-container-low transition-colors"
                  >

                    <td className="py-3 px-3 font-semibold text-on-surface">

                      {student.NAME ||
                        "Unknown Student"}

                    </td>


                    <td className="py-3 px-3 font-mono-sm text-xs text-outline">

                      {student.STUDENT_ROLL ||
                        "-"}

                    </td>


                    <td className="py-3 px-3 text-on-surface-variant">

                      {student.DEPARTMENT ||
                        "Not assigned"}

                    </td>


                    <td className="py-3 px-3 text-on-surface-variant">

                      {student.SEMESTER ||
                        "-"}

                    </td>


                    <td className="py-3 px-3 text-on-surface-variant">

                      {student.SECTION ||
                        "-"}

                    </td>


                    <td className="py-3 px-3 text-right">

                      <Link
                        to={getStudentManagementPath(
                          student.STUDENT_ROLL
                        )}
                        className="text-primary hover:underline font-semibold text-xs"
                      >
                        Edit
                      </Link>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

    </section>
  );
}
