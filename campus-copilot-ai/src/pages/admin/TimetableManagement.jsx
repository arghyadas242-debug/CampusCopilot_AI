import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminSidebar from "../../components/admin/AdminSidebar";

const API_URL = "http://localhost:5000";

export default function TimetableManagement() {
  const [timetable, setTimetable] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [formData, setFormData] = useState({
    studentRoll: "",
    subjectCode: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    room: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        timetableResponse,
        studentsResponse,
        subjectsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/admin/timetable`),

        fetch(`${API_URL}/api/students`),

        fetch(`${API_URL}/api/subjects`),
      ]);

      const timetableData =
        await timetableResponse.json();

      const studentsData =
        await studentsResponse.json();

      const subjectsData =
        await subjectsResponse.json();

      if (!timetableResponse.ok) {
        throw new Error(
          timetableData.error ||
            "Unable to load timetable"
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

      setTimetable(
        Array.isArray(timetableData)
          ? timetableData
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
        "Timetable management load error:",
        err
      );

      setError(
        err.message ||
          "Unable to load timetable data."
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
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      room: "",
    });
  };

  // =====================================================
  // ADD / UPDATE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.studentRoll ||
      !formData.subjectCode ||
      !formData.dayOfWeek ||
      !formData.startTime ||
      !formData.endTime
    ) {
      setError(
        "Student, subject, day, start time and end time are required."
      );

      return;
    }

    if (
      formData.endTime <= formData.startTime
    ) {
      setError(
        "End time must be later than start time."
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
        ? `${API_URL}/api/admin/timetable/${editingId}`
        : `${API_URL}/api/admin/timetable`;

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

          dayOfWeek:
            formData.dayOfWeek,

          startTime:
            formData.startTime,

          endTime:
            formData.endTime,

          room:
            formData.room,
        }),
      });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save timetable entry"
        );
      }

      setSuccess(
        isEditing
          ? "Timetable entry updated successfully."
          : "Timetable entry created successfully."
      );

      resetForm();

      await loadData();
    } catch (err) {
      console.error(
        "Save timetable error:",
        err
      );

      setError(
        err.message ||
          "Unable to save timetable entry."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (entry) => {
    setEditingId(entry.ID);

    setFormData({
      studentRoll:
        entry.STUDENT_ROLL || "",

      subjectCode:
        entry.SUBJECT_CODE || "",

      dayOfWeek:
        entry.DAY_OF_WEEK || "",

      startTime:
        entry.START_TIME || "",

      endTime:
        entry.END_TIME || "",

      room:
        entry.ROOM || "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (entry) => {
    const confirmed =
      window.confirm(
        `Delete ${entry.SUBJECT_NAME} class on ${entry.DAY_OF_WEEK}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(entry.ID);

      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/admin/timetable/${entry.ID}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to delete timetable entry"
        );
      }

      if (editingId === entry.ID) {
        resetForm();
      }

      setSuccess(
        "Timetable entry deleted successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Delete timetable error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete timetable entry."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // GROUP BY DAY
  // =====================================================

  const groupedTimetable =
    days.reduce((result, day) => {
      const records =
        timetable.filter(
          (entry) =>
            entry.DAY_OF_WEEK === day
        );

      if (records.length > 0) {
        result[day] = records;
      }

      return result;
    }, {});

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
              Timetable Management
            </h1>

          </div>

          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant text-xs">

            <span className="material-symbols-outlined text-primary text-base">
              calendar_view_week
            </span>

            <span className="font-semibold text-on-surface">
              {timetable.length} Classes
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

          {/* ADD / EDIT FORM */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-start justify-between mb-5">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  {editingId
                    ? "Edit Class"
                    : "Add New Class"}
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  {editingId
                    ? "Update the selected timetable entry."
                    : "Create a timetable entry for a student."}
                </p>

              </div>

              <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">

                <span className="material-symbols-outlined">
                  {editingId
                    ? "edit"
                    : "calendar_add_on"}
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

              {/* DAY */}

              <div className="flex flex-col gap-1">

                <label className="font-label-caps text-outline text-xs uppercase">
                  Day
                </label>

                <select
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                  name="dayOfWeek"
                  value={
                    formData.dayOfWeek
                  }
                  onChange={
                    handleChange
                  }
                  required
                >

                  <option value="">
                    Select Day
                  </option>

                  {days.map((day) => (
                    <option
                      key={day}
                      value={day}
                    >
                      {day}
                    </option>
                  ))}

                </select>

              </div>

              {/* TIME + ROOM */}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Start Time
                  </label>

                  <input
                    type="time"
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="startTime"
                    value={
                      formData.startTime
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    End Time
                  </label>

                  <input
                    type="time"
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="endTime"
                    value={
                      formData.endTime
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Room
                  </label>

                  <input
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="room"
                    value={
                      formData.room
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Room 302"
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
                    : "Add Class"}

                </button>

              </div>

            </form>

          </section>

          {/* TIMETABLE LIST */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-surface-variant">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  Weekly Timetable
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  Classes currently stored in the academic database.
                </p>

              </div>

              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                {timetable.length} Total
              </span>

            </div>

            {loading && (
              <div className="py-10 text-center text-sm text-on-surface-variant">
                Loading timetable...
              </div>
            )}

            {!loading &&
              timetable.length === 0 && (
                <div className="py-10 text-center">

                  <span className="material-symbols-outlined text-5xl text-outline">
                    calendar_view_week
                  </span>

                  <p className="text-sm text-on-surface-variant mt-2">
                    No timetable entries found.
                  </p>

                </div>
              )}

            {!loading &&
              timetable.length > 0 && (
                <div className="flex flex-col gap-6">

                  {Object.entries(
                    groupedTimetable
                  ).map(
                    ([day, entries]) => (

                      <div key={day}>

                        <div className="flex items-center gap-2 mb-3">

                          <span className="material-symbols-outlined text-primary">
                            calendar_today
                          </span>

                          <h3 className="font-bold text-primary">
                            {day}
                          </h3>

                          <span className="text-xs text-outline">
                            ({entries.length})
                          </span>

                        </div>

                        <div className="flex flex-col divide-y divide-surface-variant border border-outline-variant rounded-xl overflow-hidden">

                          {entries.map(
                            (entry) => (

                              <div
                                key={
                                  entry.ID
                                }
                                className="p-4 bg-surface flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                              >

                                <div className="flex-1">

                                  <div className="flex flex-wrap items-center gap-2 mb-2">

                                    <h4 className="font-bold text-on-surface">
                                      {
                                        entry.SUBJECT_NAME
                                      }
                                    </h4>

                                    <span className="px-2 py-0.5 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold">
                                      {
                                        entry.SUBJECT_CODE
                                      }
                                    </span>

                                  </div>

                                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-on-surface-variant">

                                    <span className="flex items-center gap-1">

                                      <span className="material-symbols-outlined text-[16px]">
                                        person
                                      </span>

                                      {
                                        entry.STUDENT_NAME
                                      }

                                      {" ("}

                                      {
                                        entry.STUDENT_ROLL
                                      }

                                      {")"}

                                    </span>

                                    <span className="flex items-center gap-1">

                                      <span className="material-symbols-outlined text-[16px]">
                                        schedule
                                      </span>

                                      {
                                        entry.START_TIME
                                      }

                                      {" - "}

                                      {
                                        entry.END_TIME
                                      }

                                    </span>

                                    <span className="flex items-center gap-1">

                                      <span className="material-symbols-outlined text-[16px]">
                                        meeting_room
                                      </span>

                                      {
                                        entry.ROOM ||
                                        "Room not assigned"
                                      }

                                    </span>

                                    {entry.FACULTY_NAME && (
                                      <span className="flex items-center gap-1">

                                        <span className="material-symbols-outlined text-[16px]">
                                          school
                                        </span>

                                        {
                                          entry.FACULTY_NAME
                                        }

                                      </span>
                                    )}

                                    {entry.SECTION && (
                                      <span className="flex items-center gap-1">

                                        <span className="material-symbols-outlined text-[16px]">
                                          group
                                        </span>

                                        Section{" "}
                                        {
                                          entry.SECTION
                                        }

                                      </span>
                                    )}

                                  </div>

                                </div>

                                <div className="flex items-center gap-2">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleEdit(
                                        entry
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
                                        entry
                                      )
                                    }
                                    disabled={
                                      deletingId ===
                                      entry.ID
                                    }
                                    className="px-4 py-2 border border-error text-error rounded-xl text-sm font-semibold hover:bg-error-container flex items-center gap-2 transition-all disabled:opacity-50"
                                  >

                                    <span className="material-symbols-outlined text-[18px]">
                                      delete
                                    </span>

                                    {deletingId ===
                                    entry.ID
                                      ? "Deleting..."
                                      : "Delete"}

                                  </button>

                                </div>

                              </div>

                            )
                          )}

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
