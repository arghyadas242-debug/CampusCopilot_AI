import { useEffect, useState } from "react";
import { Link } from "react-router";
import { authService } from "../../services/api";
import StudentNotificationBell from "./StudentNotificationBell";

const API_URL = "http://localhost:5000";

export default function StudentIDPage() {
  const [studentProfile, setStudentProfile] = useState(null);
  const [error, setError] = useState("");

  const currentUser = authService.getCurrentUser();

  // =====================================================
  // REAL STUDENT DETAILS
  // =====================================================

  const studentName =
    studentProfile?.NAME ||
    currentUser?.name ||
    currentUser?.fullName ||
    "Student";

  const studentRoll =
    studentProfile?.STUDENT_ROLL ||
    currentUser?.rollNumber ||
    currentUser?.studentRoll ||
    "--";

  const department =
    studentProfile?.DEPARTMENT ||
    currentUser?.department ||
    "Department not set";

  // =====================================================
  // INITIALS
  // =====================================================

  const getInitials = (name) => {
    return String(name || "Student")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("");
  };

  const initials =
    getInitials(studentName);

  // =====================================================
  // LOAD STUDENT FROM ORACLE
  // =====================================================

  useEffect(() => {
    async function loadStudent() {
      try {
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

        const response = await fetch(
          `${API_URL}/api/students/${encodeURIComponent(
            roll
          )}`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load student profile"
          );
        }

        const data =
          await response.json();

        setStudentProfile(data);
      } catch (err) {
        console.error(
          "Student ID profile error:",
          err
        );

        setError(
          err.message ||
            "Unable to load student profile."
        );
      }
    }

    loadStudent();
  }, []);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">

      {/* TopAppBar */}

      <header className="sticky top-0 w-full z-50 bg-surface border-b border-surface-container-high flex justify-between items-center px-4 py-3 md:px-8 md:py-4 shadow-xs">

        <div className="flex items-center gap-3">

          <Link
            to="/dashboard"
            className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs"
          >
            {initials}
          </Link>

          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
            CampusCopilot
          </span>

        </div>

        <div className="flex items-center gap-2">
          <StudentNotificationBell />
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-primary px-3.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            Dashboard
          </Link>
        </div>

      </header>

      {/* Main Content */}

      <main className="flex-1 w-full max-w-5xl mx-auto py-8 pb-24 md:pb-12 px-4 flex flex-col items-center justify-center">

        <div className="text-center mb-6">

          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Digital Student ID
          </h1>

          <p className="text-sm text-on-surface-variant mt-1">
            Official verified credential for gate entry, lab access, and library issues.
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div className="w-full max-w-[380px] mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-sm flex items-center gap-2">

            <span className="material-symbols-outlined text-[18px]">
              error
            </span>

            {error}

          </div>
        )}

        <div className="w-full max-w-[380px] relative group">

          {/* ID Card Container */}

          <div className="relative bg-surface rounded-2xl border border-outline-variant overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl">

            {/* Card Header Accent */}

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
                    National Tech University
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

              {/* Photo & Details */}

              <div className="flex flex-col items-center text-center w-full relative">

                <div className="w-[110px] h-[110px] rounded-full border-4 border-secondary/40 flex items-center justify-center p-1 mb-3 relative bg-primary/5 shadow-sm">

                  <div className="w-full h-full rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-3xl shadow-inner">

                    {initials}

                  </div>

                </div>

                <h2 className="font-headline-lg-mobile font-bold text-on-surface text-xl">

                  {studentName}

                </h2>

                <p className="font-body-md text-on-surface-variant text-sm mb-3">

                  {department}

                </p>

                <div className="bg-surface-container-low rounded-xl px-4 py-2 mb-4 border border-outline-variant/60 w-full text-center">

                  <span className="font-mono-sm text-primary font-bold tracking-wider text-sm">

                    ID: {studentRoll}

                  </span>

                </div>

              </div>

              {/* QR Code Section */}

              <div className="w-full flex flex-col items-center pt-4 border-t border-outline-variant/60">

                <p className="font-label-caps text-on-surface-variant mb-2.5 uppercase tracking-wider text-xs font-semibold">

                  Scan for Campus Gate & Library Access

                </p>

                <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-outline-variant shadow-inner flex flex-col items-center justify-center">

                  {/* Visual QR Pattern representation */}

                  <div className="w-full h-full border-2 border-dashed border-primary/40 rounded-xl flex flex-col items-center justify-center text-center p-2 bg-slate-50">

                    <span className="material-symbols-outlined text-primary text-6xl mb-1">

                      qr_code_2

                    </span>

                    <span className="font-mono-sm text-[11px] text-outline font-semibold">

                      SECURE TOKEN: 9942-8821

                    </span>

                  </div>

                </div>

              </div>

            </div>

            {/* Card Footer */}

            <div className="bg-surface-container-low p-3 text-center border-t border-outline-variant/60">

              <span className="font-mono-sm text-outline text-xs flex items-center justify-center gap-1.5 font-medium">

                <span className="material-symbols-outlined text-[16px] text-secondary">
                  verified_user
                </span>

                Valid Academic Year: 2025–2026

              </span>

            </div>

          </div>

          {/* Background Glow */}

          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-lg opacity-20 -z-10 group-hover:opacity-35 transition-opacity" />

        </div>

      </main>

      {/* Bottom Nav Bar (Mobile) */}

      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">

        <div className="flex justify-around items-center px-4 w-full h-full">

          <Link
            to="/dashboard"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              dashboard
            </span>

            <span className="text-[10px] mt-1">
              Home
            </span>
          </Link>

          <Link
            to="/attendance"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              analytics
            </span>

            <span className="text-[10px] mt-1">
              Attendance
            </span>
          </Link>

          <Link
            to="/ai-chat"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              smart_toy
            </span>

            <span className="text-[10px] mt-1">
              Copilot
            </span>
          </Link>

          <Link
            to="/student-id"
            className="flex flex-col items-center justify-center text-primary font-bold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              badge
            </span>

            <span className="text-[10px] mt-1">
              ID Card
            </span>
          </Link>

          <Link
            to="/profile"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              account_circle
            </span>

            <span className="text-[10px] mt-1">
              Profile
            </span>
          </Link>

        </div>

      </nav>

    </div>
  );
}
