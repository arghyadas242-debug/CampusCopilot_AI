import { useEffect, useState } from "react";
import StudentPageLayout from "../../components/student/StudentPageLayout";
import { authService } from "../../services/api";

const API_URL = "http://localhost:5000";

export default function StudentIDPage() {
  const [studentProfile, setStudentProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =====================================================
  // CURRENT AUTHENTICATED USER
  // =====================================================

  const currentUser =
    authService.getCurrentUser();

  // =====================================================
  // REAL STUDENT DETAILS
  // =====================================================

  const studentName =
    studentProfile?.NAME ||
    currentUser?.name ||
    "Student";

  const studentRoll =
    studentProfile?.STUDENT_ROLL ||
    currentUser?.rollNumber ||
    currentUser?.studentRoll ||
    "--";

  const department =
    studentProfile?.DEPARTMENT ||
    currentUser?.department ||
    "Department not available";

  const semester =
    studentProfile?.SEMESTER ??
    currentUser?.semester ??
    null;

  const section =
    studentProfile?.SECTION ||
    currentUser?.section ||
    "";

  // =====================================================
  // INITIALS
  // =====================================================

  const getInitials = (name) => {
    const parts = String(
      name || "Student"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return (
        parts[0][0] +
        parts[1][0]
      ).toUpperCase();
    }

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return "--";
  };

  const initials =
    getInitials(studentName);

  // =====================================================
  // LOAD REAL STUDENT FROM ORACLE
  // =====================================================

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        setError("");

        const loggedInUser =
          authService.getCurrentUser();

        const roll =
          loggedInUser?.rollNumber ||
          loggedInUser?.studentRoll;

        if (!roll) {
          throw new Error(
            "Student roll number was not found. Please log in again."
          );
        }

        const response =
          await fetch(
            `${API_URL}/api/students/${encodeURIComponent(
              roll
            )}`,
            {
              headers: localStorage.getItem("campus_token")
                ? { Authorization: `Bearer ${localStorage.getItem("campus_token")}` }
                : {},
            }
          );

        if (!response.ok) {
          let message =
            "Unable to load student profile.";

          try {
            const data =
              await response.json();

            if (data?.error) {
              message =
                data.error;
            }
          } catch {
            // Keep generic error.
          }

          throw new Error(
            message
          );
        }

        const data =
          await response.json();

        if (
          !data ||
          !data.STUDENT_ROLL ||
          !data.NAME
        ) {
          throw new Error(
            "Invalid student profile data received."
          );
        }

        setStudentProfile(
          data
        );
      } catch (err) {
        console.error(
          "Student ID profile error:",
          err
        );

        setError(
          err.message ||
            "Unable to load student profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadStudent();
  }, []);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <StudentPageLayout
        activePath="/student-id"
        eyebrow="STUDENT IDENTITY"
        title="Digital Student ID"
        subtitle="Your secure campus identity and academic profile in one place."
      >
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-center">

          <span className="material-symbols-outlined text-primary text-5xl">
            badge
          </span>

          <p className="mt-2 text-on-surface-variant">
            Loading digital student ID...
          </p>

        </div>
      </StudentPageLayout>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <StudentPageLayout
        activePath="/student-id"
        eyebrow="STUDENT IDENTITY"
        title="Digital Student ID"
        subtitle="Your secure campus identity and academic profile in one place."
      >
        <div className="mx-auto max-w-md rounded-xl border border-error/30 bg-surface-container-lowest px-6 py-10 text-center">

          <span className="material-symbols-outlined text-error text-5xl">
            error
          </span>

          <h2 className="font-bold text-error mt-2">
            Unable to Load Student ID
          </h2>

          <p className="text-on-surface-variant mt-1">
            {error}
          </p>

        </div>
      </StudentPageLayout>
    );
  }

  return (
    <StudentPageLayout
      activePath="/student-id"
      eyebrow="STUDENT IDENTITY"
      title="Digital Student ID"
      subtitle="Your secure campus identity and academic profile in one place."
    >
      <div className="flex justify-center py-2 md:py-6">
        <div className="w-full max-w-[380px] relative group">

          {/* ID Card */}

          <div className="relative bg-surface rounded-2xl border border-outline-variant overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl">

            {/* Accent */}

            <div className="h-3 w-full bg-gradient-to-r from-primary via-primary-container to-secondary" />

            {/* Card Body */}

            <div className="p-6 flex flex-col items-center">

              {/* Branding */}

              <div className="w-full flex justify-between items-start mb-6">

                <div className="flex flex-col">

                  <span className="font-label-caps text-outline text-xs uppercase tracking-widest font-bold">
                    Student Pass
                  </span>

                  <span className="font-title-md text-primary font-bold mt-0.5">
                    CampusCopilot
                  </span>

                </div>

                <span
                  className="material-symbols-outlined text-primary text-3xl"
                  style={{
                    fontVariationSettings:
                      "'FILL' 1",
                  }}
                >
                  school
                </span>

              </div>

              {/* Student Details */}

              <div className="flex flex-col items-center text-center w-full relative">

                <div className="w-[110px] h-[110px] rounded-full border-4 border-secondary/40 flex items-center justify-center p-1 mb-3 relative bg-primary/5 shadow-sm">

                  <div className="w-full h-full rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-3xl shadow-inner">

                    {initials}

                  </div>

                </div>

                <h2 className="font-headline-lg-mobile font-bold text-on-surface text-xl">

                  {studentName}

                </h2>

                <p className="font-body-md text-on-surface-variant text-sm mt-1">

                  {department}

                </p>

                <div className="flex items-center justify-center gap-2 mt-2 mb-3">

                  {semester !== null && (
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-xs font-semibold">

                      Semester {semester}

                    </span>
                  )}

                  {section && (
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-xs font-semibold">

                      Section {section}

                    </span>
                  )}

                </div>

                <div className="bg-surface-container-low rounded-xl px-4 py-2 mb-4 border border-outline-variant/60 w-full text-center">

                  <span className="font-mono-sm text-primary font-bold tracking-wider text-sm">

                    ID: {studentRoll}

                  </span>

                </div>

              </div>

              {/* Verification */}

              <div className="w-full flex flex-col items-center pt-4 border-t border-outline-variant/60">

                <p className="font-label-caps text-on-surface-variant mb-2.5 uppercase tracking-wider text-xs font-semibold">

                  Campus Verification

                </p>

                <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-outline-variant shadow-inner flex flex-col items-center justify-center">

                  <div className="w-full h-full border-2 border-dashed border-primary/40 rounded-xl flex flex-col items-center justify-center text-center p-3 bg-slate-50">

                    <span className="material-symbols-outlined text-primary text-6xl mb-2">

                      qr_code_2

                    </span>

                    <span className="text-[11px] text-outline font-semibold">

                      Verification QR not configured

                    </span>

                    <span className="text-[10px] text-outline mt-1">

                      Student ID: {studentRoll}

                    </span>

                  </div>

                </div>

              </div>

            </div>

            {/* Footer */}

            <div className="bg-surface-container-low p-3 text-center border-t border-outline-variant/60">

              <span className="font-mono-sm text-outline text-xs flex items-center justify-center gap-1.5 font-medium">

                <span className="material-symbols-outlined text-[16px] text-secondary">

                  verified_user

                </span>

                Academic profile verified from CampusCopilot records

              </span>

            </div>

          </div>

          {/* Glow */}

          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-lg opacity-20 -z-10 group-hover:opacity-35 transition-opacity" />

        </div>

      </div>
    </StudentPageLayout>
  );
}
