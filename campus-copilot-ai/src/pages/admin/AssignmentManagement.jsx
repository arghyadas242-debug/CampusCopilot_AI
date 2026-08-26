import { useEffect, useState } from "react";
import { Link } from "react-router";

const API_URL = "http://localhost:5000";

export default function AssignmentManagement() {
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [formData, setFormData] = useState({
    studentRoll: "",
    subjectCode: "",
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
    status: "pending",
  });

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // FORMAT ORACLE DATE FOR <input type="date">
  // =====================================================

  const formatDateForInput = (value) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // FORMAT DATE FOR DISPLAY
  // =====================================================

  const formatDateForDisplay = (value) => {
    if (!value) {
      return "No due date";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =====================================================
  // LOAD ALL DATA
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        assignmentsResponse,
        studentsResponse,
        subjectsResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/api/admin/assignments`
        ),

        fetch(
          `${API_URL}/api/students`
        ),

        fetch(
          `${API_URL}/api/subjects`
        ),
      ]);

      const assignmentsData =
        await assignmentsResponse.json();

      const studentsData =
        await studentsResponse.json();

      const subjectsData =
        await subjectsResponse.json();

      if (!assignmentsResponse.ok) {
        throw new Error(
          assignmentsData.error ||
            "Unable to load assignments"
        );
      }

      if (!studentsResponse.ok) {
        throw new Error(
          studentsData.error ||
            "Unable to load students"
        );
      }

      if (!subjectsResponse.ok) {
        throw new Error(
          subjectsData.error ||
            "Unable to load subjects"
        );
      }

      setAssignments(
        Array.isArray(assignmentsData)
          ? assignmentsData
          : []
      );

      setStudents(
        Array.isArray(studentsData)
          ? studentsData
          : []
      );

      setSubjects(
        Array.isArray(subjectsData)
          ? subjectsData
          : []
      );
    } catch (err) {
      console.error(
        "Assignment management load error:",
        err
      );

      setError(
        err.message ||
          "Unable to load assignment data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setEditingId(null);

    setFormData({
      studentRoll: "",
      subjectCode: "",
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
      status: "pending",
    });
  };

  // =====================================================
  // ADD / UPDATE ASSIGNMENT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.studentRoll ||
      !formData.subjectCode ||
      !formData.title.trim() ||
      !formData.dueDate
    ) {
      setError(
        "Student, subject, title and due date are required."
      );

      return;
    }

    try {
      setSaving(true);

      setError("");
      setSuccess("");

      const isEditing =
        editingId !== null;

      const url = isEditing
        ? `${API_URL}/api/admin/assignments/${editingId}`
        : `${API_URL}/api/admin/assignments`;

      const response = await fetch(url, {
        method: isEditing
          ? "PUT"
          : "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          studentRoll:
            formData.studentRoll,

          subjectCode:
            formData.subjectCode,

          title:
            formData.title,

          description:
            formData.description,

          dueDate:
            formData.dueDate,

          priority:
            formData.priority,

          status:
            formData.status,
        }),
      });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save assignment"
        );
      }

      setSuccess(
        isEditing
          ? "Assignment updated successfully."
          : "Assignment created successfully."
      );

      resetForm();

      await loadData();
    } catch (err) {
      console.error(
        "Save assignment error:",
        err
      );

      setError(
        err.message ||
          "Unable to save assignment."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT ASSIGNMENT
  // =====================================================

  const handleEdit = (assignment) => {
    setEditingId(
      assignment.ID
    );

    setFormData({
      studentRoll:
        assignment.STUDENT_ROLL || "",

      subjectCode:
        assignment.SUBJECT_CODE || "",

      title:
        assignment.TITLE || "",

      description:
        assignment.DESCRIPTION || "",

      dueDate:
        formatDateForInput(
          assignment.DUE_DATE
        ),

      priority:
        (
          assignment.PRIORITY ||
          "medium"
        ).toLowerCase(),

      status:
        (
          assignment.STATUS ||
          "pending"
        ).toLowerCase(),
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE ASSIGNMENT
  // =====================================================

  const handleDelete = async (
    assignment
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${assignment.TITLE}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        assignment.ID
      );

      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/admin/assignments/${assignment.ID}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to delete assignment"
        );
      }

      if (
        editingId === assignment.ID
      ) {
        resetForm();
      }

      setSuccess(
        "Assignment deleted successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Delete assignment error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete assignment."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // PRIORITY STYLE
  // =====================================================

  const getPriorityClass = (
    priority
  ) => {
    const value =
      String(priority || "")
        .toLowerCase();

    if (value === "high") {
      return "bg-error-container text-on-error-container";
    }

    if (value === "low") {
      return "bg-surface-container-high text-on-surface-variant";
    }

    return "bg-secondary-container text-on-secondary-container";
  };

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusClass = (
    status
  ) => {
    const value =
      String(status || "")
        .toLowerCase();

    if (
      value === "completed" ||
      value === "submitted"
    ) {
      return "bg-secondary-container text-on-secondary-container";
    }

    return "bg-primary-container text-on-primary-container";
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pb-[64px] md:pb-12">

      {/* =================================================
          HEADER
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
              Assignment Management
            </h1>

          </div>

          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant text-xs">

            <span className="material-symbols-outlined text-primary text-base">
              assignment
            </span>

            <span className="font-semibold text-on-surface">
              {assignments.length} Assignments
            </span>

          </div>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="flex-1 max-w-[1440px] mx-auto w-full p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-6">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <nav className="hidden md:flex flex-col py-6 bg-surface border border-outline-variant rounded-2xl shadow-sm col-span-3">

          <div className="px-4 mb-4">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                AD
              </div>

              <div>

                <div className="font-title-md font-bold text-primary text-sm">
                  Admin Portal
                </div>

                <div className="font-label-caps text-outline text-xs">
                  Academic Office
                </div>

              </div>

            </div>

          </div>

          <Link
            to="/admin"
            className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high mx-2 px-4 py-2.5 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined">
              dashboard
            </span>

            <span>
              Dashboard
            </span>
          </Link>

          <Link
            to="/admin/students"
            className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high mx-2 px-4 py-2.5 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined">
              groups
            </span>

            <span>
              Students
            </span>
          </Link>

          <Link
            to="/admin/attendance"
            className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high mx-2 px-4 py-2.5 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined">
              fact_check
            </span>

            <span>
              Attendance
            </span>
          </Link>

          <Link
            to="/admin/subjects"
            className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high mx-2 px-4 py-2.5 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined">
              menu_book
            </span>

            <span>
              Subjects
            </span>
          </Link>

          <Link
            to="/admin/assignments"
            className="flex items-center gap-3 bg-secondary-container text-on-secondary-container rounded-xl mx-2 px-4 py-2.5 font-bold transition-all"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              assignment
            </span>

            <span>
              Assignments
            </span>
          </Link>

        </nav>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="col-span-1 md:col-span-9 flex flex-col gap-6">

          {/* ERROR */}

          {error && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-sm flex items-center gap-2">

              <span className="material-symbols-outlined text-base">
                error
              </span>

              {error}

            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="p-3 bg-secondary-container text-on-secondary-container rounded-xl text-sm font-bold flex items-center gap-2">

              <span className="material-symbols-outlined text-base">
                check_circle
              </span>

              {success}

            </div>
          )}

          {/* =================================================
              ADD / EDIT FORM
          ================================================= */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-start justify-between mb-5">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  {editingId
                    ? "Edit Assignment"
                    : "Add New Assignment"}
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  {editingId
                    ? "Update the selected assignment."
                    : "Create an assignment for a student."}
                </p>

              </div>

              <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">

                <span className="material-symbols-outlined">
                  {editingId
                    ? "edit"
                    : "assignment_add"}
                </span>

              </div>

            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >

              {/* Student + Subject */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Student
                  </label>

                  <select
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="studentRoll"
                    value={
                      formData.studentRoll
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >

                    <option value="">
                      Select Student
                    </option>

                    {students.map(
                      (student) => (
                        <option
                          key={
                            student.STUDENT_ROLL
                          }
                          value={
                            student.STUDENT_ROLL
                          }
                        >
                          {student.NAME}
                          {" - "}
                          {
                            student.STUDENT_ROLL
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Subject
                  </label>

                  <select
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="subjectCode"
                    value={
                      formData.subjectCode
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >

                    <option value="">
                      Select Subject
                    </option>

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

              </div>

              {/* Title */}

              <div className="flex flex-col gap-1">

                <label className="font-label-caps text-outline text-xs uppercase">
                  Assignment Title
                </label>

                <input
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  name="title"
                  value={
                    formData.title
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: DBMS Lab Report"
                  required
                />

              </div>

              {/* Description */}

              <div className="flex flex-col gap-1">

                <label className="font-label-caps text-outline text-xs uppercase">
                  Description
                </label>

                <textarea
                  className="w-full min-h-[100px] rounded-xl border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface focus:outline-none focus:border-primary resize-y"
                  name="description"
                  value={
                    formData.description
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter assignment instructions..."
                />

              </div>

              {/* Date + Priority + Status */}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Due Date
                  </label>

                  <input
                    type="date"
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="dueDate"
                    value={
                      formData.dueDate
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Priority
                  </label>

                  <select
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="priority"
                    value={
                      formData.priority
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="low">
                      Low
                    </option>

                    <option value="medium">
                      Medium
                    </option>

                    <option value="high">
                      High
                    </option>
                  </select>

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Status
                  </label>

                  <select
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="status"
                    value={
                      formData.status
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="pending">
                      Pending
                    </option>

                    <option value="submitted">
                      Submitted
                    </option>

                    <option value="completed">
                      Completed
                    </option>
                  </select>

                </div>

              </div>

              {/* Buttons */}

              <div className="mt-3 flex justify-end gap-3">

                {editingId && (
                  <button
                    type="button"
                    onClick={
                      resetForm
                    }
                    className="px-5 py-2.5 border border-outline-variant text-on-surface-variant font-bold text-sm rounded-xl hover:bg-surface-container-low transition-all"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl hover:bg-primary-container transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >

                  <span className="material-symbols-outlined text-[18px]">
                    save
                  </span>

                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Add Assignment"}

                </button>

              </div>

            </form>

          </section>

          {/* =================================================
              ASSIGNMENT LIST
          ================================================= */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-surface-variant">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  Current Assignments
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  Assignments currently stored in the academic database.
                </p>

              </div>

              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                {assignments.length} Total
              </span>

            </div>

            {loading && (
              <div className="py-10 text-center text-sm text-on-surface-variant">
                Loading assignments...
              </div>
            )}

            {!loading &&
              assignments.length === 0 && (
                <div className="py-10 text-center">

                  <span className="material-symbols-outlined text-5xl text-outline">
                    assignment
                  </span>

                  <p className="text-sm text-on-surface-variant mt-2">
                    No assignments found.
                  </p>

                </div>
              )}

            {!loading &&
              assignments.length > 0 && (
                <div className="flex flex-col divide-y divide-surface-variant">

                  {assignments.map(
                    (assignment) => (

                      <div
                        key={
                          assignment.ID
                        }
                        className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >

                        <div className="flex-1">

                          <div className="flex flex-wrap items-center gap-2 mb-2">

                            <h3 className="font-bold text-on-surface">
                              {
                                assignment.TITLE
                              }
                            </h3>

                            <span className="px-2 py-0.5 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold">
                              {
                                assignment.SUBJECT_CODE
                              }
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold ${getPriorityClass(
                                assignment.PRIORITY
                              )}`}
                            >
                              {assignment.PRIORITY ||
                                "Medium"}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold capitalize ${getStatusClass(
                                assignment.STATUS
                              )}`}
                            >
                              {assignment.STATUS ||
                                "pending"}
                            </span>

                          </div>

                          <p className="text-sm text-on-surface-variant">
                            {
                              assignment.DESCRIPTION
                            }
                          </p>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-outline">

                            <span className="flex items-center gap-1">

                              <span className="material-symbols-outlined text-[15px]">
                                person
                              </span>

                              {
                                assignment.STUDENT_NAME
                              }

                              {" ("}

                              {
                                assignment.STUDENT_ROLL
                              }

                              {")"}

                            </span>

                            <span className="flex items-center gap-1">

                              <span className="material-symbols-outlined text-[15px]">
                                calendar_month
                              </span>

                              Due:{" "}
                              {formatDateForDisplay(
                                assignment.DUE_DATE
                              )}

                            </span>

                          </div>

                        </div>

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                assignment
                              )
                            }
                            className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low flex items-center gap-2 transition-all"
                          >

                            <span className="material-symbols-outlined text-[18px]">
                              edit
                            </span>

                            Edit

                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                assignment
                              )
                            }
                            disabled={
                              deletingId ===
                              assignment.ID
                            }
                            className="px-4 py-2 border border-error text-error rounded-xl text-sm font-semibold hover:bg-error-container flex items-center gap-2 transition-all disabled:opacity-50"
                          >

                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>

                            {deletingId ===
                            assignment.ID
                              ? "Deleting..."
                              : "Delete"}

                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>
              )}

          </section>

        </div>

      </main>

    </div>
  );
}