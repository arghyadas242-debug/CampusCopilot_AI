import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminSidebar from "../../components/admin/AdminSidebar";

const API_URL = "http://localhost:5000";

export default function ResourceManagement() {
  const [resources, setResources] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [formData, setFormData] = useState({
    subjectCode: "",
    title: "",
    description: "",
    resourceType: "PDF",
    resourceUrl: "",
    semester: "",
    uploadedBy: "Academic Office",
  });

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resourceTypes = [
    "PDF",
    "Notes",
    "Question Paper",
    "Video",
    "Link",
    "Other",
  ];

  // =====================================================
  // LOAD RESOURCES + SUBJECTS
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        resourcesResponse,
        subjectsResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/api/admin/resources`
        ),

        fetch(
          `${API_URL}/api/subjects`
        ),
      ]);

      const resourcesData =
        await resourcesResponse.json();

      const subjectsData =
        await subjectsResponse.json();

      if (!resourcesResponse.ok) {
        throw new Error(
          resourcesData.error ||
            "Unable to load resources"
        );
      }

      if (!subjectsResponse.ok) {
        throw new Error(
          subjectsData.error ||
            "Unable to load subjects"
        );
      }

      setResources(
        Array.isArray(resourcesData)
          ? resourcesData
          : []
      );

      setSubjects(
        Array.isArray(subjectsData)
          ? subjectsData
          : []
      );
    } catch (err) {
      console.error(
        "Resource management load error:",
        err
      );

      setError(
        err.message ||
          "Unable to load resource data."
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
      subjectCode: "",
      title: "",
      description: "",
      resourceType: "PDF",
      resourceUrl: "",
      semester: "",
      uploadedBy: "Academic Office",
    });
  };

  // =====================================================
  // ADD / UPDATE RESOURCE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.subjectCode ||
      !formData.title.trim() ||
      !formData.resourceType ||
      !formData.resourceUrl.trim()
    ) {
      setError(
        "Subject, title, resource type and resource URL are required."
      );

      return;
    }

    if (
      formData.semester &&
      (
        Number(formData.semester) < 1 ||
        Number(formData.semester) > 8
      )
    ) {
      setError(
        "Semester must be between 1 and 8."
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
        ? `${API_URL}/api/admin/resources/${editingId}`
        : `${API_URL}/api/admin/resources`;

      const response = await fetch(url, {
        method: isEditing
          ? "PUT"
          : "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          subjectCode:
            formData.subjectCode,

          title:
            formData.title,

          description:
            formData.description,

          resourceType:
            formData.resourceType,

          resourceUrl:
            formData.resourceUrl,

          semester:
            formData.semester,

          uploadedBy:
            formData.uploadedBy,
        }),
      });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save resource"
        );
      }

      setSuccess(
        isEditing
          ? "Resource updated successfully."
          : "Resource added successfully."
      );

      resetForm();

      await loadData();
    } catch (err) {
      console.error(
        "Save resource error:",
        err
      );

      setError(
        err.message ||
          "Unable to save resource."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT RESOURCE
  // =====================================================

  const handleEdit = (resource) => {
    setEditingId(
      resource.RESOURCE_ID
    );

    setFormData({
      subjectCode:
        resource.SUBJECT_CODE || "",

      title:
        resource.TITLE || "",

      description:
        resource.DESCRIPTION || "",

      resourceType:
        resource.RESOURCE_TYPE ||
        "PDF",

      resourceUrl:
        resource.RESOURCE_URL || "",

      semester:
        resource.SEMESTER
          ? String(resource.SEMESTER)
          : "",

      uploadedBy:
        resource.UPLOADED_BY ||
        "Academic Office",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE RESOURCE
  // =====================================================

  const handleDelete = async (
    resource
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${resource.TITLE}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        resource.RESOURCE_ID
      );

      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/admin/resources/${resource.RESOURCE_ID}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to delete resource"
        );
      }

      if (
        editingId ===
        resource.RESOURCE_ID
      ) {
        resetForm();
      }

      setSuccess(
        "Resource deleted successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Delete resource error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete resource."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (!value) {
      return "--";
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // RESOURCE ICON
  // =====================================================

  const getResourceIcon = (type) => {
    switch (type) {
      case "PDF":
        return "picture_as_pdf";

      case "Notes":
        return "description";

      case "Question Paper":
        return "quiz";

      case "Video":
        return "play_circle";

      case "Link":
        return "link";

      default:
        return "folder_open";
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pb-[64px] md:pb-12">

      <AdminSidebar />

      <main className="md:ml-[280px] min-h-screen flex flex-col">

      {/* HEADER */}

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
              Resource Management
            </h1>

          </div>

          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant text-xs">

            <span className="material-symbols-outlined text-primary text-base">
              folder_open
            </span>

            <span className="font-semibold text-on-surface">
              {resources.length} Resources
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

          {/* =================================================
              ADD / EDIT RESOURCE
          ================================================= */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-start justify-between mb-5">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">

                  {editingId
                    ? "Edit Resource"
                    : "Add Study Resource"}

                </h2>

                <p className="text-xs text-on-surface-variant mt-1">

                  {editingId
                    ? "Update the selected study resource."
                    : "Add notes, PDFs, question papers, videos or useful links."}

                </p>

              </div>

              <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">

                <span className="material-symbols-outlined">

                  {editingId
                    ? "edit"
                    : "upload_file"}

                </span>

              </div>

            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >

              {/* SUBJECT + TYPE */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Subject
                  </label>

                  <select
                    name="subjectCode"
                    value={
                      formData.subjectCode
                    }
                    onChange={handleChange}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
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

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Resource Type
                  </label>

                  <select
                    name="resourceType"
                    value={
                      formData.resourceType
                    }
                    onChange={handleChange}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  >

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

                </div>

              </div>

              {/* TITLE */}

              <div className="flex flex-col gap-1">

                <label className="font-label-caps text-outline text-xs uppercase">
                  Resource Title
                </label>

                <input
                  name="title"
                  value={
                    formData.title
                  }
                  onChange={handleChange}
                  placeholder="Example: DBMS Normalization Notes"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  required
                />

              </div>

              {/* DESCRIPTION */}

              <div className="flex flex-col gap-1">

                <label className="font-label-caps text-outline text-xs uppercase">
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    formData.description
                  }
                  onChange={handleChange}
                  placeholder="Describe what this resource contains..."
                  className="w-full min-h-[100px] rounded-xl border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface focus:outline-none focus:border-primary resize-y"
                />

              </div>

              {/* URL */}

              <div className="flex flex-col gap-1">

                <label className="font-label-caps text-outline text-xs uppercase">
                  Resource URL
                </label>

                <input
                  type="url"
                  name="resourceUrl"
                  value={
                    formData.resourceUrl
                  }
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  required
                />

                <p className="text-xs text-outline">
                  Paste the PDF, Drive, video or study-material link.
                </p>

              </div>

              {/* SEMESTER + UPLOADER */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Semester
                  </label>

                  <select
                    name="semester"
                    value={
                      formData.semester
                    }
                    onChange={handleChange}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  >

                    <option value="">
                      All Semesters
                    </option>

                    {[1, 2, 3, 4, 5, 6, 7, 8].map(
                      (semester) => (
                        <option
                          key={semester}
                          value={semester}
                        >
                          Semester {semester}
                        </option>
                      )
                    )}

                  </select>

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Uploaded By
                  </label>

                  <input
                    name="uploadedBy"
                    value={
                      formData.uploadedBy
                    }
                    onChange={handleChange}
                    placeholder="Academic Office"
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  />

                </div>

              </div>

              {/* BUTTONS */}

              <div className="mt-3 flex justify-end gap-3">

                {editingId && (
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
                    save
                  </span>

                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Add Resource"}

                </button>

              </div>

            </form>

          </section>

          {/* =================================================
              RESOURCE LIST
          ================================================= */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-surface-variant">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  Study Resources
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  Resources currently stored in the academic database.
                </p>

              </div>

              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                {resources.length} Total
              </span>

            </div>

            {/* LOADING */}

            {loading && (
              <div className="py-10 text-center text-sm text-on-surface-variant">
                Loading resources...
              </div>
            )}

            {/* EMPTY */}

            {!loading &&
              resources.length === 0 && (
                <div className="py-10 text-center">

                  <span className="material-symbols-outlined text-5xl text-outline">
                    folder_open
                  </span>

                  <p className="text-sm text-on-surface-variant mt-2">
                    No resources found.
                  </p>

                </div>
              )}

            {/* RESOURCES */}

            {!loading &&
              resources.length > 0 && (
                <div className="flex flex-col divide-y divide-surface-variant">

                  {resources.map(
                    (resource) => (

                      <div
                        key={
                          resource.RESOURCE_ID
                        }
                        className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                      >

                        {/* RESOURCE DETAILS */}

                        <div className="flex gap-4 flex-1">

                          <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">

                            <span className="material-symbols-outlined text-[26px]">
                              {getResourceIcon(
                                resource.RESOURCE_TYPE
                              )}
                            </span>

                          </div>

                          <div className="flex-1">

                            <div className="flex flex-wrap items-center gap-2 mb-2">

                              <h3 className="font-bold text-on-surface">
                                {resource.TITLE}
                              </h3>

                              <span className="px-2 py-0.5 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold">
                                {
                                  resource.SUBJECT_CODE
                                }
                              </span>

                              <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-bold">
                                {
                                  resource.RESOURCE_TYPE
                                }
                              </span>

                              {resource.SEMESTER && (
                                <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-lg text-xs font-semibold">

                                  Semester{" "}
                                  {
                                    resource.SEMESTER
                                  }

                                </span>
                              )}

                            </div>

                            {resource.DESCRIPTION && (
                              <p className="text-sm text-on-surface-variant mb-3">
                                {
                                  resource.DESCRIPTION
                                }
                              </p>
                            )}

                            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-outline">

                              {resource.SUBJECT_NAME && (
                                <span className="flex items-center gap-1">

                                  <span className="material-symbols-outlined text-[15px]">
                                    menu_book
                                  </span>

                                  {
                                    resource.SUBJECT_NAME
                                  }

                                </span>
                              )}

                              <span className="flex items-center gap-1">

                                <span className="material-symbols-outlined text-[15px]">
                                  person
                                </span>

                                {
                                  resource.UPLOADED_BY
                                }

                              </span>

                              <span className="flex items-center gap-1">

                                <span className="material-symbols-outlined text-[15px]">
                                  calendar_month
                                </span>

                                {formatDate(
                                  resource.CREATED_AT
                                )}

                              </span>

                            </div>

                            {/* OPEN RESOURCE */}

                            <a
                              href={
                                resource.RESOURCE_URL
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-primary hover:underline"
                            >

                              <span className="material-symbols-outlined text-[17px]">
                                open_in_new
                              </span>

                              Open Resource

                            </a>

                          </div>

                        </div>

                        {/* ACTIONS */}

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                resource
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
                                resource
                              )
                            }
                            disabled={
                              deletingId ===
                              resource.RESOURCE_ID
                            }
                            className="px-4 py-2 border border-error text-error rounded-xl text-sm font-semibold hover:bg-error-container flex items-center gap-2 transition-all disabled:opacity-50"
                          >

                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>

                            {deletingId ===
                            resource.RESOURCE_ID
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
