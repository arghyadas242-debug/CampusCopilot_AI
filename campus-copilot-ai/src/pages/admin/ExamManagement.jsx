import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminSidebar from "../../components/admin/AdminSidebar";

const API_URL = "http://localhost:5000";

export default function ExamManagement() {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [formData, setFormData] = useState({
    studentRoll: "",
    subjectCode: "",
    examDate: "",
    startTime: "",
    endTime: "",
    room: "",
    examType: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // FORMAT DATE FOR INPUT
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
      return "No date";
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
  // FORMAT TIME
  // =====================================================

  const formatTimeForInput = (value) => {
    if (!value) {
      return "";
    }

    const text = String(value);

    if (/^\d{2}:\d{2}/.test(text)) {
      return text.slice(0, 5);
    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      const hours = String(
        date.getHours()
      ).padStart(2, "0");

      const minutes = String(
        date.getMinutes()
      ).padStart(2, "0");

      return `${hours}:${minutes}`;
    }

    return "";
  };

  // =====================================================
  // LOAD EXAMS + STUDENTS + SUBJECTS
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        examsResponse,
        studentsResponse,
        subjectsResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/api/admin/exams`
        ),

        fetch(
          `${API_URL}/api/students`
        ),

        fetch(
          `${API_URL}/api/subjects`
        ),
      ]);

      const examsData =
        await examsResponse.json();

      const studentsData =
        await studentsResponse.json();

      const subjectsData =
        await subjectsResponse.json();

      if (!examsResponse.ok) {
        throw new Error(
          examsData.error ||
            "Unable to load exams"
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

      setExams(
        Array.isArray(examsData)
          ? examsData
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
        "Exam management load error:",
        err
      );

      setError(
        err.message ||
          "Unable to load exam data."
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
      examDate: "",
      startTime: "",
      endTime: "",
      room: "",
      examType: "",
    });
  };

  // =====================================================
  // ADD / UPDATE EXAM
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.studentRoll ||
      !formData.subjectCode ||
      !formData.examDate ||
      !formData.startTime ||
      !formData.endTime ||
      !formData.examType.trim()
    ) {
      setError(
        "Student, subject, exam date, start time, end time and exam type are required."
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
        ? `${API_URL}/api/admin/exams/${editingId}`
        : `${API_URL}/api/admin/exams`;

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

          examDate:
            formData.examDate,

          startTime:
            formData.startTime,

          endTime:
            formData.endTime,

          room:
            formData.room,

          examType:
            formData.examType,
        }),
      });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save exam"
        );
      }

      setSuccess(
        isEditing
          ? "Exam updated successfully."
          : "Exam created successfully."
      );

      resetForm();

      await loadData();
    } catch (err) {
      console.error(
        "Save exam error:",
        err
      );

      setError(
        err.message ||
          "Unable to save exam."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT EXAM
  // =====================================================

  const handleEdit = (exam) => {
    setEditingId(exam.ID);

    setFormData({
      studentRoll:
        exam.STUDENT_ROLL || "",

      subjectCode:
        exam.SUBJECT_CODE || "",

      examDate:
        formatDateForInput(
          exam.EXAM_DATE
        ),

      startTime:
        formatTimeForInput(
          exam.START_TIME
        ),

      endTime:
        formatTimeForInput(
          exam.END_TIME
        ),

      room:
        exam.ROOM || "",

      examType:
        exam.EXAM_TYPE || "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE EXAM
  // =====================================================

  const handleDelete = async (exam) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete this ${exam.EXAM_TYPE} exam for ${exam.STUDENT_NAME}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(exam.ID);

      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/admin/exams/${exam.ID}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to delete exam"
        );
      }

      if (editingId === exam.ID) {
        resetForm();
      }

      setSuccess(
        "Exam deleted successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Delete exam error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete exam."
      );
    } finally {
      setDeletingId(null);
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
              Exam Management
            </h1>

          </div>

          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant text-xs">

            <span className="material-symbols-outlined text-primary text-base">
              event_note
            </span>

            <span className="font-semibold text-on-surface">
              {exams.length} Exams
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

          {/* ADD / EDIT EXAM */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-start justify-between mb-5">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  {editingId
                    ? "Edit Exam"
                    : "Add New Exam"}
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  {editingId
                    ? "Update the selected examination schedule."
                    : "Create a new examination schedule for a student."}
                </p>

              </div>

              <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">

                <span className="material-symbols-outlined">
                  {editingId
                    ? "edit"
                    : "event_note"}
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

              {/* Exam Date + Exam Type */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Exam Date
                  </label>

                  <input
                    type="date"
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="examDate"
                    value={
                      formData.examDate
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Exam Type
                  </label>

                  <select
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    name="examType"
                    value={
                      formData.examType
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >
                    <option value="">
                      Select Exam Type
                    </option>

                    <option value="Class Test">
                      Class Test
                    </option>

                    <option value="Mid Semester">
                      Mid Semester
                    </option>

                    <option value="End Semester">
                      End Semester
                    </option>

                    <option value="Practical">
                      Practical
                    </option>

                    <option value="Viva">
                      Viva
                    </option>
                  </select>

                </div>

              </div>

              {/* Start + End + Room */}

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
                    : "Add Exam"}

                </button>

              </div>

            </form>

          </section>

          {/* EXAM LIST */}

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-surface-variant">

              <div>

                <h2 className="font-title-md font-bold text-on-surface text-lg">
                  Examination Schedule
                </h2>

                <p className="text-xs text-on-surface-variant mt-1">
                  Exams currently stored in the academic database.
                </p>

              </div>

              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                {exams.length} Total
              </span>

            </div>

            {loading && (
              <div className="py-10 text-center text-sm text-on-surface-variant">
                Loading exams...
              </div>
            )}

            {!loading &&
              exams.length === 0 && (
                <div className="py-10 text-center">

                  <span className="material-symbols-outlined text-5xl text-outline">
                    event_note
                  </span>

                  <p className="text-sm text-on-surface-variant mt-2">
                    No exams found.
                  </p>

                </div>
              )}

            {!loading &&
              exams.length > 0 && (
                <div className="flex flex-col divide-y divide-surface-variant">

                  {exams.map((exam) => (

                    <div
                      key={exam.ID}
                      className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >

                      <div className="flex-1">

                        <div className="flex flex-wrap items-center gap-2 mb-2">

                          <h3 className="font-bold text-on-surface">
                            {exam.SUBJECT_NAME}
                          </h3>

                          <span className="px-2 py-0.5 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold">
                            {exam.SUBJECT_CODE}
                          </span>

                          <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-bold">
                            {exam.EXAM_TYPE}
                          </span>

                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-on-surface-variant">

                          <span className="flex items-center gap-1">

                            <span className="material-symbols-outlined text-[16px]">
                              person
                            </span>

                            {exam.STUDENT_NAME}
                            {" ("}
                            {exam.STUDENT_ROLL}
                            {")"}

                          </span>

                          <span className="flex items-center gap-1">

                            <span className="material-symbols-outlined text-[16px]">
                              calendar_month
                            </span>

                            {formatDateForDisplay(
                              exam.EXAM_DATE
                            )}

                          </span>

                          <span className="flex items-center gap-1">

                            <span className="material-symbols-outlined text-[16px]">
                              schedule
                            </span>

                            {exam.START_TIME}
                            {" - "}
                            {exam.END_TIME}

                          </span>

                          <span className="flex items-center gap-1">

                            <span className="material-symbols-outlined text-[16px]">
                              meeting_room
                            </span>

                            {exam.ROOM ||
                              "Room not assigned"}

                          </span>

                        </div>

                      </div>

                      <div className="flex items-center gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(exam)
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
                            handleDelete(exam)
                          }
                          disabled={
                            deletingId ===
                            exam.ID
                          }
                          className="px-4 py-2 border border-error text-error rounded-xl text-sm font-semibold hover:bg-error-container flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>

                          {deletingId ===
                          exam.ID
                            ? "Deleting..."
                            : "Delete"}
                        </button>

                      </div>

                    </div>

                  ))}

                </div>
              )}

          </section>

        </div>

      </div>

      </main>

    </div>
  );
}
