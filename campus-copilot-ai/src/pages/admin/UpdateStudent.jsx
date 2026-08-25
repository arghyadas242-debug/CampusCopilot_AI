import { useState } from "react";
import { Link } from "react-router";

const API_URL = "http://localhost:5000";

export default function UpdateStudent() {
  const [searchId, setSearchId] = useState("");

  const [searchResults, setSearchResults] = useState([]);

  const [studentData, setStudentData] = useState({
    studentId: null,
    fullName: "",
    rollNumber: "",
    email: "",
    department: "",
    semester: "",
    section: "",
  });

  const [studentLoaded, setStudentLoaded] = useState(false);

  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // SEARCH STUDENT
  // =====================================================

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchId.trim()) {
      setError("Enter a student name or roll number.");
      return;
    }

    try {
      setSearching(true);
      setError("");
      setSuccess("");
      setSearchResults([]);
      setStudentLoaded(false);

      const response = await fetch(
        `${API_URL}/api/students/search?q=${encodeURIComponent(
          searchId.trim()
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to search student"
        );
      }

      if (!Array.isArray(data) || data.length === 0) {
        setError("No student found.");
        return;
      }

      // If exact roll or only one result, open immediately
      const exactStudent =
        data.find(
          (student) =>
            String(student.STUDENT_ROLL).toLowerCase() ===
            searchId.trim().toLowerCase()
        ) || (data.length === 1 ? data[0] : null);

      if (exactStudent) {
        loadStudent(exactStudent);
      } else {
        setSearchResults(data);
      }
    } catch (err) {
      console.error("Search error:", err);

      setError(
        err.message || "Unable to search student."
      );
    } finally {
      setSearching(false);
    }
  };

  // =====================================================
  // LOAD SELECTED STUDENT
  // =====================================================

  const loadStudent = (student) => {
    setStudentData({
      studentId: student.STUDENT_ID,
      fullName: student.NAME || "",
      rollNumber: student.STUDENT_ROLL || "",
      email: student.EMAIL || "",
      department: student.DEPARTMENT || "",
      semester: student.SEMESTER
        ? String(student.SEMESTER)
        : "",
      section: student.SECTION || "",
    });

    setSearchId(student.STUDENT_ROLL || "");
    setStudentLoaded(true);
    setSearchResults([]);
    setError("");
    setSuccess("");
  };

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setStudentData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // SAVE STUDENT
  // =====================================================

  const handleSave = async (e) => {
    e.preventDefault();

    if (!studentData.rollNumber) {
      setError("No student selected.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/students/${encodeURIComponent(
          studentData.rollNumber
        )}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: studentData.fullName,
            email: studentData.email,
            department: studentData.department,
            semester: studentData.semester,
            section: studentData.section,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update student"
        );
      }

      setSuccess(
        "Student profile updated successfully."
      );
    } catch (err) {
      console.error("Student update error:", err);

      setError(
        err.message || "Unable to update student."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // AVATAR
  // =====================================================

  const getInitials = () => {
    if (!studentData.fullName) {
      return "?";
    }

    return studentData.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased min-h-screen flex flex-col md:flex-row pb-12">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="hidden md:flex flex-col h-screen w-[280px] fixed left-0 top-0 py-md bg-surface-container-low border-r border-outline-variant/30 z-40">

        <div className="px-md mb-lg flex items-center gap-sm">

          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-lg">
            CC
          </div>

          <div>
            <h1 className="font-headline-lg-mobile text-primary font-bold">
              Admin Portal
            </h1>

            <p className="font-body-sm text-outline text-xs">
              Student Management
            </p>
          </div>

        </div>

        <nav className="flex-1 px-sm space-y-1">

          <Link
            to="/admin"
            className="flex items-center gap-3 text-on-surface-variant mx-2 px-4 py-2.5 rounded-xl hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined">
              dashboard
            </span>

            <span className="font-title-md text-sm">
              Dashboard
            </span>
          </Link>

          <Link
            to="/admin/students"
            className="flex items-center gap-3 bg-secondary-container text-on-secondary-container mx-2 px-4 py-2.5 rounded-xl font-bold transition-all"
          >
            <span className="material-symbols-outlined">
              group
            </span>

            <span className="font-title-md text-sm">
              Student Directory
            </span>
          </Link>

          <Link
            to="/admin/attendance"
            className="flex items-center gap-3 text-on-surface-variant mx-2 px-4 py-2.5 rounded-xl hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined">
              fact_check
            </span>

            <span className="font-title-md text-sm">
              Attendance
            </span>
          </Link>

        </nav>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="flex-1 md:ml-[280px] flex flex-col min-h-screen">

        {/* Header */}

        <header className="sticky top-0 bg-surface z-30 border-b border-outline-variant/50 px-6 py-4 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <Link
              to="/admin"
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center"
            >
              <span className="material-symbols-outlined">
                arrow_back
              </span>
            </Link>

            <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
              Update Student Details
            </h1>

          </div>

        </header>

        <div className="px-margin-mobile md:px-margin-desktop py-6 max-w-4xl mx-auto w-full">

          {/* =================================================
              SEARCH
          ================================================= */}

          <form
            onSubmit={handleSearch}
            className="flex gap-2 mb-6"
          >

            <div className="relative flex-1">

              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>

              <input
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-md text-on-surface"
                placeholder="Search student by name or roll number..."
                type="text"
                value={searchId}
                onChange={(e) =>
                  setSearchId(e.target.value)
                }
              />

            </div>

            <button
              type="submit"
              disabled={searching}
              className="px-5 rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>

          </form>

          {/* Error */}

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-error-container text-on-error-container flex items-center gap-2 text-sm">

              <span className="material-symbols-outlined">
                error
              </span>

              {error}

            </div>
          )}

          {/* Success */}

          {success && (
            <div className="mb-5 p-3 bg-secondary-container text-on-secondary-container rounded-xl text-sm font-bold flex items-center gap-2">

              <span className="material-symbols-outlined">
                check_circle
              </span>

              {success}

            </div>
          )}

          {/* =================================================
              MULTIPLE SEARCH RESULTS
          ================================================= */}

          {searchResults.length > 0 && (

            <div className="mb-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/70 overflow-hidden">

              <div className="p-4 border-b border-outline-variant">
                <h2 className="font-bold">
                  Select Student
                </h2>
              </div>

              {searchResults.map((student) => (

                <button
                  key={student.STUDENT_ID}
                  type="button"
                  onClick={() =>
                    loadStudent(student)
                  }
                  className="w-full text-left p-4 border-b last:border-b-0 border-outline-variant hover:bg-surface-container-low transition-colors"
                >

                  <div className="font-semibold">
                    {student.NAME}
                  </div>

                  <div className="text-xs text-on-surface-variant mt-1">
                    {student.STUDENT_ROLL}
                    {" • "}
                    {student.DEPARTMENT || "No department"}
                  </div>

                </button>
              ))}

            </div>
          )}

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {!studentLoaded &&
            searchResults.length === 0 && (

              <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-10 text-center">

                <span className="material-symbols-outlined text-5xl text-outline">
                  person_search
                </span>

                <h2 className="font-bold text-lg mt-3">
                  Search for a student
                </h2>

                <p className="text-sm text-on-surface-variant mt-1">
                  Enter a student roll number or name to
                  edit their academic details.
                </p>

              </div>
            )}

          {/* =================================================
              STUDENT FORM
          ================================================= */}

          {studentLoaded && (

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

              {/* Profile */}

              <div className="md:col-span-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-6 flex flex-col items-center text-center shadow-sm">

                <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-3xl mb-3 shadow-md">
                  {getInitials()}
                </div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  {studentData.fullName}
                </h2>

                <p className="font-body-sm text-outline text-xs mt-0.5">
                  {studentData.rollNumber}
                </p>

                <div className="mt-3">

                  <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold uppercase">
                    Student
                  </span>

                </div>

              </div>

              {/* Form */}

              <div className="md:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-6 shadow-sm">

                <form
                  onSubmit={handleSave}
                  className="flex flex-col gap-4"
                >

                  {/* Name + Roll */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="flex flex-col gap-1">

                      <label className="font-label-caps text-outline text-xs uppercase">
                        Full Name
                      </label>

                      <input
                        className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                        name="fullName"
                        value={studentData.fullName}
                        onChange={handleChange}
                        required
                      />

                    </div>

                    <div className="flex flex-col gap-1">

                      <label className="font-label-caps text-outline text-xs uppercase">
                        Roll / ID Number
                      </label>

                      <input
                        className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-sm font-mono-sm font-semibold text-outline cursor-not-allowed"
                        value={studentData.rollNumber}
                        readOnly
                      />

                      <span className="text-[10px] text-outline">
                        Roll number cannot be edited here.
                      </span>

                    </div>

                  </div>

                  {/* Email */}

                  <div className="flex flex-col gap-1">

                    <label className="font-label-caps text-outline text-xs uppercase">
                      Email Address
                    </label>

                    <input
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                      name="email"
                      type="email"
                      value={studentData.email}
                      onChange={handleChange}
                      required
                    />

                  </div>

                  {/* Department */}

                  <div className="flex flex-col gap-1">

                    <label className="font-label-caps text-outline text-xs uppercase">
                      Department
                    </label>

                    <input
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                      name="department"
                      value={studentData.department}
                      onChange={handleChange}
                      placeholder="Computer Science & Engineering"
                    />

                  </div>

                  {/* Semester + Section */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="flex flex-col gap-1">

                      <label className="font-label-caps text-outline text-xs uppercase">
                        Semester
                      </label>

                      <select
                        className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                        name="semester"
                        value={studentData.semester}
                        onChange={handleChange}
                      >
                        <option value="">
                          Select Semester
                        </option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                      </select>

                    </div>

                    <div className="flex flex-col gap-1">

                      <label className="font-label-caps text-outline text-xs uppercase">
                        Section
                      </label>

                      <select
                        className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                        name="section"
                        value={studentData.section}
                        onChange={handleChange}
                      >
                        <option value="">
                          Select Section
                        </option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>

                    </div>

                  </div>

                  {/* Save */}

                  <div className="mt-4 flex justify-end">

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >

                      <span className="material-symbols-outlined text-[18px]">
                        save
                      </span>

                      {saving
                        ? "Saving..."
                        : "Save Changes"}

                    </button>

                  </div>

                </form>

              </div>

            </div>
          )}

        </div>

      </main>

    </div>
  );
}
