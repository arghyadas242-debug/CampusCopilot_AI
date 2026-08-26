import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminSidebar from "../../components/admin/AdminSidebar";

const API_URL = "http://localhost:5000";

export default function NoticeManagement() {
  const [notices, setNotices] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    category: "General",
    tag: "General",
    tagColor: "blue",
    content: "",
    aiSummary: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // LOAD NOTICES
  // =====================================================

  const loadNotices = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/admin/notices`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load notices"
        );
      }

      setNotices(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Notice management load error:",
        err
      );

      setError(
        err.message ||
          "Unable to load notices."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
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
      title: "",
      author: "",
      category: "General",
      tag: "General",
      tagColor: "blue",
      content: "",
      aiSummary: "",
    });
  };

  // =====================================================
  // ADD / UPDATE NOTICE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.author.trim() ||
      !formData.content.trim()
    ) {
      setError(
        "Title, author and content are required."
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
        ? `${API_URL}/api/admin/notices/${editingId}`
        : `${API_URL}/api/admin/notices`;

      const response = await fetch(url, {
        method: isEditing
          ? "PUT"
          : "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          title:
            formData.title,

          author:
            formData.author,

          category:
            formData.category,

          tag:
            formData.tag,

          tagColor:
            formData.tagColor,

          content:
            formData.content,

          aiSummary:
            formData.aiSummary,
        }),
      });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save notice"
        );
      }

      setSuccess(
        isEditing
          ? "Notice updated successfully."
          : "Notice published successfully."
      );

      resetForm();

      await loadNotices();
    } catch (err) {
      console.error(
        "Save notice error:",
        err
      );

      setError(
        err.message ||
          "Unable to save notice."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT NOTICE
  // =====================================================

  const handleEdit = (notice) => {
    setEditingId(notice.ID);

    setFormData({
      title:
        notice.TITLE || "",

      author:
        notice.AUTHOR || "",

      category:
        notice.CATEGORY ||
        "General",

      tag:
        notice.TAG ||
        "General",

      tagColor:
        notice.TAG_COLOR ||
        "blue",

      content:
        notice.CONTENT || "",

      aiSummary:
        notice.AI_SUMMARY || "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE NOTICE
  // =====================================================

  const handleDelete = async (
    notice
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${notice.TITLE}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(notice.ID);

      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/admin/notices/${notice.ID}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to delete notice"
        );
      }

      if (
        editingId === notice.ID
      ) {
        resetForm();
      }

      setSuccess(
        "Notice deleted successfully."
      );

      await loadNotices();
    } catch (err) {
      console.error(
        "Delete notice error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete notice."
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

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =====================================================
  // TAG STYLE
  // =====================================================

  const getTagClass = (
    color
  ) => {
    const value =
      String(color || "")
        .toLowerCase();

    if (value === "red") {
      return "bg-error-container text-on-error-container";
    }

    if (value === "green") {
      return "bg-secondary-container text-on-secondary-container";
    }

    if (value === "orange") {
      return "bg-tertiary-container text-on-tertiary-container";
    }

    if (value === "purple") {
      return "bg-surface-container-high text-primary";
    }

    return "bg-primary-container text-on-primary-container";
  };

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
              Notice Management
            </h1>

          </div>

          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant text-xs">

            <span className="material-symbols-outlined text-primary text-base">
              campaign
            </span>

            <span className="font-semibold text-on-surface">
              {notices.length} Notices
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

          {/* ADD / EDIT NOTICE */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-start justify-between mb-5">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">

                  {editingId
                    ? "Edit Notice"
                    : "Publish New Notice"}

                </h2>

                <p className="text-xs text-on-surface-variant mt-1">

                  {editingId
                    ? "Update the selected notice."
                    : "Publish an announcement for students."}

                </p>

              </div>

              <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">

                <span className="material-symbols-outlined">

                  {editingId
                    ? "edit"
                    : "add_alert"}

                </span>

              </div>

            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >

              {/* TITLE */}

              <div className="flex flex-col gap-1">

                <label className="font-label-caps text-outline text-xs uppercase">
                  Notice Title
                </label>

                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter notice title"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  required
                />

              </div>

              {/* AUTHOR + CATEGORY */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Author
                  </label>

                  <input
                    name="author"
                    value={formData.author}
                    onChange={handleChange}
                    placeholder="Academic Office"
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    required
                  />

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Category
                  </label>

                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  >
                    <option value="General">
                      General
                    </option>

                    <option value="Academic">
                      Academic
                    </option>

                    <option value="Examination">
                      Examination
                    </option>

                    <option value="Event">
                      Event
                    </option>

                    <option value="Placement">
                      Placement
                    </option>

                    <option value="Emergency">
                      Emergency
                    </option>

                    <option value="Administration">
                      Administration
                    </option>
                  </select>

                </div>

              </div>

              {/* TAG + TAG COLOR */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Tag
                  </label>

                  <input
                    name="tag"
                    value={formData.tag}
                    onChange={handleChange}
                    placeholder="Example: Important"
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  />

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Tag Color
                  </label>

                  <select
                    name="tagColor"
                    value={formData.tagColor}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  >

                    <option value="blue">
                      Blue
                    </option>

                    <option value="green">
                      Green
                    </option>

                    <option value="orange">
                      Orange
                    </option>

                    <option value="red">
                      Red
                    </option>

                    <option value="purple">
                      Purple
                    </option>

                  </select>

                </div>

              </div>

              {/* CONTENT */}

              <div className="flex flex-col gap-1">

                <label className="font-label-caps text-outline text-xs uppercase">
                  Notice Content
                </label>

                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Write the complete notice..."
                  className="w-full min-h-[150px] rounded-xl border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface focus:outline-none focus:border-primary resize-y"
                  required
                />

              </div>

              {/* AI SUMMARY */}

              <div className="flex flex-col gap-1">

                <div className="flex items-center justify-between">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    AI Summary
                  </label>

                  <span className="text-[11px] text-outline">
                    Optional
                  </span>

                </div>

                <textarea
                  name="aiSummary"
                  value={
                    formData.aiSummary
                  }
                  onChange={handleChange}
                  placeholder="Short summary of this notice..."
                  className="w-full min-h-[90px] rounded-xl border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface focus:outline-none focus:border-primary resize-y"
                />

                <p className="text-xs text-outline">
                  We can generate this automatically with AI later.
                </p>

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
                    publish
                  </span>

                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Publish Notice"}

                </button>

              </div>

            </form>

          </section>

          {/* NOTICE LIST */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-surface-variant">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  Published Notices
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  Notices currently available to students.
                </p>

              </div>

              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                {notices.length} Total
              </span>

            </div>

            {loading && (
              <div className="py-10 text-center text-sm text-on-surface-variant">
                Loading notices...
              </div>
            )}

            {!loading &&
              notices.length === 0 && (
                <div className="py-10 text-center">

                  <span className="material-symbols-outlined text-5xl text-outline">
                    campaign
                  </span>

                  <p className="text-sm text-on-surface-variant mt-2">
                    No notices published.
                  </p>

                </div>
              )}

            {!loading &&
              notices.length > 0 && (
                <div className="flex flex-col divide-y divide-surface-variant">

                  {notices.map(
                    (notice) => (

                      <div
                        key={notice.ID}
                        className="py-5 flex flex-col lg:flex-row lg:items-start justify-between gap-5"
                      >

                        <div className="flex-1">

                          <div className="flex flex-wrap items-center gap-2 mb-2">

                            <h3 className="font-bold text-on-surface text-base">
                              {notice.TITLE}
                            </h3>

                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold ${getTagClass(
                                notice.TAG_COLOR
                              )}`}
                            >
                              {notice.TAG ||
                                "General"}
                            </span>

                            {notice.CATEGORY && (
                              <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-lg text-xs font-semibold">
                                {
                                  notice.CATEGORY
                                }
                              </span>
                            )}

                          </div>

                          <p className="text-sm text-on-surface-variant whitespace-pre-line">
                            {notice.CONTENT}
                          </p>

                          {notice.AI_SUMMARY && (
                            <div className="mt-3 rounded-xl bg-primary-container/40 p-3">

                              <div className="flex items-center gap-1 text-xs font-bold text-primary mb-1">

                                <span className="material-symbols-outlined text-[16px]">
                                  auto_awesome
                                </span>

                                AI Summary

                              </div>

                              <p className="text-xs text-on-surface-variant">
                                {
                                  notice.AI_SUMMARY
                                }
                              </p>

                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-outline">

                            <span className="flex items-center gap-1">

                              <span className="material-symbols-outlined text-[15px]">
                                person
                              </span>

                              {notice.AUTHOR}

                            </span>

                            <span className="flex items-center gap-1">

                              <span className="material-symbols-outlined text-[15px]">
                                schedule
                              </span>

                              {formatDate(
                                notice.CREATED_AT
                              )}

                            </span>

                          </div>

                        </div>

                        {/* ACTIONS */}

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                notice
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
                                notice
                              )
                            }
                            disabled={
                              deletingId ===
                              notice.ID
                            }
                            className="px-4 py-2 border border-error text-error rounded-xl text-sm font-semibold hover:bg-error-container flex items-center gap-2 transition-all disabled:opacity-50"
                          >

                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>

                            {deletingId ===
                            notice.ID
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
