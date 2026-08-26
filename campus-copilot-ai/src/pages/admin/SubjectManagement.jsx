import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminSidebar from "../../components/admin/AdminSidebar";

const API_URL = "http://localhost:5000";

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);

  const [formData, setFormData] = useState({
    subjectCode: "",
    subjectName: "",
    facultyName: "",
  });

  const [editingCode, setEditingCode] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingCode, setDeletingCode] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // =====================================================
  // LOAD SUBJECTS
  // =====================================================

  const loadSubjects = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/subjects`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load subjects"
        );
      }

      setSubjects(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Load subjects error:",
        err
      );

      setError(
        err.message ||
          "Unable to load subjects."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
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
    setFormData({
      subjectCode: "",
      subjectName: "",
      facultyName: "",
    });

    setEditingCode(null);
  };

  // =====================================================
  // ADD / UPDATE SUBJECT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.subjectCode.trim() ||
      !formData.subjectName.trim()
    ) {
      setError(
        "Subject code and subject name are required."
      );

      return;
    }

    try {
      setSaving(true);

      setError("");
      setSuccess("");

      const isEditing =
        Boolean(editingCode);

      const url = isEditing
        ? `${API_URL}/api/subjects/${encodeURIComponent(
            editingCode
          )}`
        : `${API_URL}/api/subjects`;

      const response = await fetch(url, {
        method: isEditing
          ? "PUT"
          : "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          isEditing
            ? {
                subjectName:
                  formData.subjectName,

                facultyName:
                  formData.facultyName,
              }
            : {
                subjectCode:
                  formData.subjectCode,

                subjectName:
                  formData.subjectName,

                facultyName:
                  formData.facultyName,
              }
        ),
      });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save subject"
        );
      }

      setSuccess(
        isEditing
          ? "Subject updated successfully."
          : "Subject created successfully."
      );

      resetForm();

      await loadSubjects();
    } catch (err) {
      console.error(
        "Save subject error:",
        err
      );

      setError(
        err.message ||
          "Unable to save subject."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT SUBJECT
  // =====================================================

  const handleEdit = (subject) => {
    setEditingCode(
      subject.SUBJECT_CODE
    );

    setFormData({
      subjectCode:
        subject.SUBJECT_CODE || "",

      subjectName:
        subject.SUBJECT_NAME || "",

      facultyName:
        subject.FACULTY_NAME || "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE SUBJECT
  // =====================================================

  const handleDelete = async (subject) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${subject.SUBJECT_CODE} - ${subject.SUBJECT_NAME}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCode(
        subject.SUBJECT_CODE
      );

      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/subjects/${encodeURIComponent(
          subject.SUBJECT_CODE
        )}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 409 &&
          data.dependencies
        ) {
          const dependencyText =
            Object.entries(
              data.dependencies
            )
              .filter(
                ([, value]) =>
                  Number(value) > 0
              )
              .map(
                ([key, value]) =>
                  `${key}: ${value}`
              )
              .join(", ");

          throw new Error(
            `${data.error} ${dependencyText}`
          );
        }

        throw new Error(
          data.error ||
            "Unable to delete subject"
        );
      }

      setSuccess(
        "Subject deleted successfully."
      );

      if (
        editingCode ===
        subject.SUBJECT_CODE
      ) {
        resetForm();
      }

      await loadSubjects();
    } catch (err) {
      console.error(
        "Delete subject error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete subject."
      );
    } finally {
      setDeletingCode(null);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pb-[64px] md:pb-12">

      <AdminSidebar />

      <main className="md:ml-[280px] min-h-screen flex flex-col">

      {/* TOP BAR */}

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
              Subject Management
            </h1>

          </div>

          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant text-xs">

            <span className="material-symbols-outlined text-primary text-base">
              menu_book
            </span>

            <span className="font-semibold text-on-surface">
              {subjects.length} Subjects
            </span>

          </div>

        </div>

      </header>

      {/* MAIN */}

      <div className="flex-1 max-w-[1440px] mx-auto w-full p-4 md:p-8 flex flex-col gap-6 pt-6">

        {/* SIDEBAR */}


        {/* CONTENT */}

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

          {/* SUCCESS */}

          {success && (
            <div className="p-3 bg-secondary-container text-on-secondary-container rounded-xl text-sm font-bold flex items-center gap-2">

              <span className="material-symbols-outlined text-base">
                check_circle
              </span>

              {success}

            </div>
          )}

          {/* ADD / EDIT SUBJECT */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-start justify-between gap-4 mb-5">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  {editingCode
                    ? "Edit Subject"
                    : "Add New Subject"}
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  {editingCode
                    ? "Update the subject name or faculty."
                    : "Create a new subject in the academic database."}
                </p>

              </div>

              <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">

                <span className="material-symbols-outlined">
                  {editingCode
                    ? "edit"
                    : "add"}
                </span>

              </div>

            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Subject Code
                  </label>

                  <input
                    className={`w-full rounded-xl border border-outline-variant p-2.5 text-sm font-semibold focus:outline-none focus:border-primary ${
                      editingCode
                        ? "bg-surface-container-high text-outline cursor-not-allowed"
                        : "bg-surface-container-low text-on-surface"
                    }`}
                    name="subjectCode"
                    value={
                      formData.subjectCode
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Example: OS303"
                    readOnly={
                      Boolean(editingCode)
                    }
                    required
                  />

                  {editingCode && (
                    <span className="text-[10px] text-outline">
                      Subject code cannot be changed.
                    </span>
                  )}

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Subject Name
                  </label>

                  <input
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="subjectName"
                    value={
                      formData.subjectName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Operating Systems"
                    required
                  />

                </div>

              </div>

              <div className="flex flex-col gap-1">

                <label className="font-label-caps text-outline text-xs uppercase">
                  Faculty Name
                </label>

                <input
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  name="facultyName"
                  value={
                    formData.facultyName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Prof. Name"
                />

              </div>

              <div className="mt-3 flex justify-end gap-3">

                {editingCode && (
                  <button
                    type="button"
                    onClick={resetForm}
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
                    {editingCode
                      ? "save"
                      : "add"}
                  </span>

                  {saving
                    ? "Saving..."
                    : editingCode
                    ? "Save Changes"
                    : "Add Subject"}

                </button>

              </div>

            </form>

          </section>

          {/* SUBJECT LIST */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-surface-variant">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  Current Subjects
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  Subjects currently available in CampusCopilot.
                </p>

              </div>

              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                {subjects.length} Total
              </span>

            </div>

            {loading && (
              <div className="py-10 text-center text-sm text-on-surface-variant">
                Loading subjects...
              </div>
            )}

            {!loading &&
              subjects.length === 0 && (
                <div className="py-10 text-center">

                  <span className="material-symbols-outlined text-5xl text-outline">
                    menu_book
                  </span>

                  <p className="mt-2 text-sm text-on-surface-variant">
                    No subjects found.
                  </p>

                </div>
              )}

            {!loading &&
              subjects.length > 0 && (
                <div className="flex flex-col divide-y divide-surface-variant">

                  {subjects.map(
                    (subject) => (

                      <div
                        key={
                          subject.SUBJECT_CODE
                        }
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >

                        <div className="flex items-center gap-4">

                          <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">

                            <span className="material-symbols-outlined">
                              menu_book
                            </span>

                          </div>

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="font-bold text-on-surface">
                                {
                                  subject.SUBJECT_NAME
                                }
                              </h3>

                              <span className="px-2 py-0.5 bg-surface-container-high rounded-lg text-xs font-mono-sm font-bold text-primary">
                                {
                                  subject.SUBJECT_CODE
                                }
                              </span>

                            </div>

                            <p className="text-xs text-on-surface-variant mt-1">
                              Faculty:{" "}
                              {subject.FACULTY_NAME ||
                                "Not assigned"}
                            </p>

                          </div>

                        </div>

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                subject
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
                                subject
                              )
                            }
                            disabled={
                              deletingCode ===
                              subject.SUBJECT_CODE
                            }
                            className="px-4 py-2 border border-error text-error rounded-xl text-sm font-semibold hover:bg-error-container flex items-center gap-2 transition-all disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>

                            {deletingCode ===
                            subject.SUBJECT_CODE
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

      </div>

      </main>

    </div>
  );
}
