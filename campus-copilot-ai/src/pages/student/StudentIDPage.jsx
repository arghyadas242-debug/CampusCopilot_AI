import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import StudentPageLayout from "../../components/student/StudentPageLayout";
import {
  authService,
  getToken,
  getAuthHeader,
} from "../../services/api";

const API_URL = "http://localhost:5000";
const LEGACY_STORAGE_KEY = "campus_student_id_verification";

const normalizeRoll = (value) =>
  String(value ?? "").trim().toUpperCase();

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0]?.slice(0, 2).toUpperCase() || "--";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  const date = new Date(value);

  if (!value || !Number.isFinite(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function storageKey(profile) {
  return `${LEGACY_STORAGE_KEY}:v2:${encodeURIComponent(
    normalizeRoll(profile.STUDENT_ROLL)
  )}`;
}

function clearStoredVerification(profile) {
  try {
    if (profile) {
      sessionStorage.removeItem(storageKey(profile));
    }
  } catch {
    // Storage may be disabled.
  }
}

function getStoredVerification(profile) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(storageKey(profile)) || "null"
    );

    if (
      normalizeRoll(value?.studentRoll) !==
      normalizeRoll(profile.STUDENT_ROLL)
    ) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

function saveStoredVerification(profile, verification) {
  try {
    sessionStorage.setItem(
      storageKey(profile),
      JSON.stringify({
        studentRoll: normalizeRoll(profile.STUDENT_ROLL),
        ...verification,
      })
    );
  } catch {
    // The verified QR remains usable during this page visit.
  }
}

function extractVerificationToken(value) {
  try {
    const url = new URL(value);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.origin !== window.location.origin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return "";
    }

    return (
      url.pathname.match(
        /^\/verify-student\/([a-fA-F0-9]{64})\/?$/
      )?.[1] || ""
    );
  } catch {
    return "";
  }
}

function invalidQrError(message) {
  const error = new Error(message);
  error.invalidQr = true;
  return error;
}

function sessionError() {
  const error = new Error(
    "Your session has changed or expired. Please log in again."
  );

  error.sessionEnded = true;
  return error;
}

async function requestJson(
  path,
  sessionToken,
  signal,
  method = "GET",
  authenticated = true
) {
  if (!sessionToken || getToken() !== sessionToken) {
    throw sessionError();
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    signal,
    cache: "no-store",
    referrerPolicy: "no-referrer",

    headers: authenticated
      ? method === "POST"
        ? {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          }
        : getAuthHeader()
      : {},

    ...(method === "POST" ? { body: "{}" } : {}),
  });

  if (signal?.aborted) {
    throw new DOMException("Request cancelled", "AbortError");
  }

  if (getToken() !== sessionToken) {
    throw sessionError();
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (signal?.aborted) {
    throw new DOMException("Request cancelled", "AbortError");
  }

  if (getToken() !== sessionToken) {
    throw sessionError();
  }

  if (!response.ok) {
    if (
      response.status === 401 ||
      String(data?.code || "").startsWith("AUTH_TOKEN_")
    ) {
      throw sessionError();
    }

    throw new Error(
      response.status >= 500
        ? "Student ID service is unavailable. Please try again."
        : typeof data?.error === "string"
          ? data.error
          : "Unable to complete this Student ID request."
    );
  }

  return data;
}

async function validateVerification(
  value,
  profile,
  sessionToken,
  signal
) {
  const token = extractVerificationToken(value?.verificationUrl);

  if (!token) {
    throw invalidQrError(
      "The verification link is invalid or uses a different frontend address."
    );
  }

  const data = await requestJson(
    `/api/student-id/verify/${encodeURIComponent(token)}`,
    sessionToken,
    signal,
    "GET",
    false
  );

  if (data?.valid === false) {
    return null;
  }

  if (
    data?.valid !== true ||
    normalizeRoll(data.student?.studentRoll) !==
      normalizeRoll(profile.STUDENT_ROLL)
  ) {
    throw invalidQrError(
      "This verification QR does not match your student profile."
    );
  }

  const expiresAt = data.verification?.expiresAt;
  const expiry = new Date(expiresAt).getTime();

  if (!expiresAt || !Number.isFinite(expiry)) {
    throw new Error(
      "The server returned an invalid verification expiry."
    );
  }

  if (expiry <= Date.now()) {
    return null;
  }

  return {
    verificationUrl: value.verificationUrl,
    expiresAt,
  };
}

export default function StudentIDPage() {
  const [sessionToken] = useState(() => getToken());

  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [copied, setCopied] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const [verificationUrl, setVerificationUrl] = useState("");
  const [verificationExpiresAt, setVerificationExpiresAt] =
    useState("");
  const [verificationLoading, setVerificationLoading] =
    useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationRevoked, setVerificationRevoked] =
    useState(false);

  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const controllersRef = useRef(new Set());
  const messageTimerRef = useRef(null);
  const copiedTimerRef = useRef(null);
  const refreshRef = useRef(null);
  const profileRef = useRef(null);

  const studentName = studentProfile?.NAME || "Student";
  const studentRoll = studentProfile?.STUDENT_ROLL || "--";
  const department =
    studentProfile?.DEPARTMENT || "Department not available";
  const semester = studentProfile?.SEMESTER ?? null;
  const section = studentProfile?.SECTION || "";
  const email = studentProfile?.EMAIL || "";

  const initials = useMemo(
    () => getInitials(studentName),
    [studentName]
  );

  function clearQr() {
    setVerificationUrl("");
    setVerificationExpiresAt("");
  }

  function endSession() {
    controllersRef.current.forEach((controller) =>
      controller.abort()
    );

    clearStoredVerification(profileRef.current);
    clearQr();
    setStudentProfile(null);
    setLoading(false);

    setError(
      "Your session has changed or expired. Please log in again."
    );
  }

  function usableSession() {
    if (!mountedRef.current) {
      return false;
    }

    if (!sessionToken || getToken() !== sessionToken) {
      endSession();
      return false;
    }

    return true;
  }

  function showActionMessage(message) {
    if (!mountedRef.current) {
      return;
    }

    window.clearTimeout(messageTimerRef.current);
    setActionMessage(message);

    messageTimerRef.current = window.setTimeout(
      () => setActionMessage(""),
      2500
    );
  }

  function displayQr(verification) {
    setVerificationUrl(verification.verificationUrl);
    setVerificationExpiresAt(verification.expiresAt);
    setVerificationRevoked(false);
  }

  useEffect(() => {
    mountedRef.current = true;

    const controller = new AbortController();
    controllersRef.current.add(controller);

    // Discard the old cache because it did not identify its owner.
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Storage may be disabled.
    }

    async function load() {
      try {
        const user = authService.getCurrentUser();
        const roll = user?.rollNumber || user?.studentRoll;

        if (!roll) {
          throw new Error(
            "Student roll number was not found. Please log in again."
          );
        }

        const profile = await requestJson(
          `/api/students/${encodeURIComponent(roll)}`,
          sessionToken,
          controller.signal
        );

        if (
          !profile?.NAME ||
          !profile.STUDENT_ROLL ||
          normalizeRoll(profile.STUDENT_ROLL) !==
            normalizeRoll(roll)
        ) {
          throw new Error("Invalid student profile data received.");
        }

        if (controller.signal.aborted) {
          return;
        }

        profileRef.current = profile;
        setStudentProfile(profile);

        const stored = getStoredVerification(profile);

        if (stored) {
          try {
            const verified = await validateVerification(
              stored,
              profile,
              sessionToken,
              controller.signal
            );

            if (controller.signal.aborted) {
              return;
            }

            if (verified) {
              displayQr(verified);
            } else {
              clearStoredVerification(profile);
              setVerificationRevoked(true);
            }
          } catch (err) {
            if (err.sessionEnded) {
              throw err;
            }

            if (err.invalidQr) {
              clearStoredVerification(profile);
            }

            if (!controller.signal.aborted) {
              setVerificationError(
                err.message ||
                  "Unable to validate your verification QR."
              );
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        if (err.sessionEnded) {
          endSession();
        } else {
          setError(
            err.message || "Unable to load student profile."
          );
        }
      } finally {
        controllersRef.current.delete(controller);

        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    function checkSession() {
      if (!sessionToken || getToken() !== sessionToken) {
        endSession();
      } else if (document.visibilityState !== "hidden") {
        refreshRef.current?.();
      }
    }

    load();

    window.addEventListener("storage", checkSession);
    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", checkSession);

    const controllers = controllersRef.current;

    return () => {
      mountedRef.current = false;

      controllers.forEach((item) => item.abort());
      controllers.clear();

      window.clearTimeout(messageTimerRef.current);
      window.clearTimeout(copiedTimerRef.current);

      window.removeEventListener("storage", checkSession);
      window.removeEventListener("focus", checkSession);
      document.removeEventListener(
        "visibilitychange",
        checkSession
      );
    };

    // A different login session must reload this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  async function runVerificationAction(mode) {
    if (
      !usableSession() ||
      !studentProfile ||
      busyRef.current
    ) {
      return;
    }

    busyRef.current = true;

    const controller = new AbortController();
    controllersRef.current.add(controller);

    setVerificationLoading(true);
    setVerificationError("");
    clearQr();

    try {
      if (mode === "revoke") {
        const data = await requestJson(
          "/api/student-id/verification",
          sessionToken,
          controller.signal,
          "DELETE"
        );

        if (
          data?.success !== true ||
          typeof data.revoked !== "boolean"
        ) {
          throw new Error(
            "Revocation was not confirmed by the server."
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        clearStoredVerification(studentProfile);
        setVerificationRevoked(true);
        showActionMessage("No active verification QR remains.");
      } else {
        let candidate;

        if (mode === "create") {
          clearStoredVerification(studentProfile);

          const data = await requestJson(
            "/api/student-id/verification",
            sessionToken,
            controller.signal,
            "POST"
          );

          if (data?.success !== true || !data.verification) {
            throw new Error(
              "QR generation was not confirmed by the server."
            );
          }

          candidate = data.verification;
        } else {
          const status = await requestJson(
            "/api/student-id/verification",
            sessionToken,
            controller.signal
          );

          if (typeof status?.active !== "boolean") {
            throw new Error(
              "Invalid verification status received."
            );
          }

          if (!status.active) {
            clearStoredVerification(studentProfile);
            setVerificationRevoked(true);
            return;
          }

          candidate = getStoredVerification(studentProfile);

          if (!candidate) {
            setVerificationRevoked(false);
            return;
          }
        }

        const verified = await validateVerification(
          candidate,
          studentProfile,
          sessionToken,
          controller.signal
        );

        if (controller.signal.aborted) {
          return;
        }

        if (!verified) {
          clearStoredVerification(studentProfile);
          setVerificationRevoked(true);
          return;
        }

        saveStoredVerification(studentProfile, verified);
        displayQr(verified);

        if (mode === "create") {
          showActionMessage(
            "A new secure verification QR was generated."
          );
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }

      if (err.invalidQr) {
        clearStoredVerification(studentProfile);
      }

      if (err.sessionEnded) {
        endSession();
      } else {
        setVerificationError(
          err.message ||
            "Unable to complete verification. Please try again."
        );
      }
    } finally {
      controllersRef.current.delete(controller);
      busyRef.current = false;

      if (mountedRef.current && !controller.signal.aborted) {
        setVerificationLoading(false);
      }
    }
  }

  refreshRef.current = () => {
    if (studentProfile && !loading && !error) {
      void runVerificationAction("check");
    }
  };

  useEffect(() => {
    if (!verificationUrl || !verificationExpiresAt) {
      return;
    }

    function checkExpiry() {
      if (
        new Date(verificationExpiresAt).getTime() <= Date.now()
      ) {
        clearQr();
        clearStoredVerification(studentProfile);
        setVerificationRevoked(true);
      }
    }

    checkExpiry();

    const timer = window.setInterval(checkExpiry, 1000);

    return () => window.clearInterval(timer);
  }, [
    verificationUrl,
    verificationExpiresAt,
    studentProfile,
  ]);

  const createVerification = () =>
    runVerificationAction("create");

  const handleRegenerateQr = createVerification;

  const handleRevokeQr = () =>
    runVerificationAction("revoke");

  function activeQr() {
    return (
      usableSession() &&
      !busyRef.current &&
      !verificationError &&
      verificationUrl &&
      new Date(verificationExpiresAt).getTime() > Date.now()
    );
  }

  async function handleCopyStudentId() {
    if (!usableSession() || !studentProfile) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(studentRoll));

      if (!usableSession()) {
        return;
      }

      setCopied(true);
      showActionMessage("Student ID copied.");

      window.clearTimeout(copiedTimerRef.current);

      copiedTimerRef.current = window.setTimeout(
        () => setCopied(false),
        2200
      );
    } catch {
      showActionMessage("Unable to copy Student ID.");
    }
  }

  async function handleCopyVerificationLink() {
    if (!activeQr()) {
      showActionMessage(
        "No validated active QR is available."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(verificationUrl);

      if (usableSession()) {
        showActionMessage("Verification link copied.");
      }
    } catch {
      showActionMessage("Unable to copy verification link.");
    }
  }

  async function handleShareId() {
    if (!usableSession() || !studentProfile) {
      return;
    }

    const url = activeQr() ? verificationUrl : "";

    const text = [
      "CampusCopilot Student Identity",
      `Name: ${studentName}`,
      `Student ID: ${studentRoll}`,
      `Department: ${department}`,
      semester !== null ? `Semester: ${semester}` : null,
      section ? `Section: ${section}` : null,
      url ? `Verification: ${url}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "CampusCopilot Student ID",
          text,
          ...(url ? { url } : {}),
        });
      } else {
        await navigator.clipboard.writeText(text);
      }

      if (usableSession()) {
        showActionMessage(
          navigator.share
            ? "Student identity shared."
            : "Student identity copied for sharing."
        );
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        showActionMessage("Unable to share Student ID.");
      }
    }
  }

  function handlePrintId() {
    if (!usableSession() || !studentProfile) {
      return;
    }

    const canPrintQr = activeQr();

    const printWindow = window.open(
      "",
      "_blank",
      "width=760,height=900"
    );

    if (!printWindow) {
      showActionMessage(
        "Please allow pop-ups to print the Student ID."
      );
      return;
    }

    const qrElement = document.getElementById(
      "student-verification-qr"
    );

    const qrSvg =
      (canPrintQr ? qrElement?.outerHTML : "") || "";

    const safeName = escapeHtml(studentName);
    const safeRoll = escapeHtml(studentRoll);
    const safeDepartment = escapeHtml(department);

    const safeSemester =
      semester !== null ? escapeHtml(semester) : "—";

    const safeSection = section ? escapeHtml(section) : "—";
    const safeEmail = email
      ? escapeHtml(email)
      : "Not available";

    const safeInitials = escapeHtml(initials);

    const safeExpiry = verificationExpiresAt
      ? escapeHtml(formatDate(verificationExpiresAt))
      : "";

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>CampusCopilot Student ID - ${safeRoll}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 36px;
      background: #f7f9fb;
      color: #191c1e;
      font-family: Arial, Helvetica, sans-serif;
    }
    .page {
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
    }
    .heading {
      color: #00236f;
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 20px;
    }
    .card {
      border: 1px solid #c5c5d3;
      border-radius: 24px;
      overflow: hidden;
      background: white;
    }
    .identity {
      padding: 32px;
      background: linear-gradient(
        135deg,
        #00236f 0%,
        #1e3a8a 55%,
        #006a61 100%
      );
      color: white;
      text-align: center;
    }
    .avatar {
      width: 100px;
      height: 100px;
      margin: 0 auto 16px;
      border: 4px solid rgba(255, 255, 255, .8);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      font-weight: 800;
    }
    .student-name {
      font-size: 26px;
      font-weight: 800;
    }
    .department {
      margin-top: 7px;
      font-size: 14px;
      opacity: .85;
    }
    .content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 230px;
      gap: 24px;
      padding: 26px;
    }
    .row {
      padding: 11px 0;
      border-bottom: 1px solid #e1e2ea;
    }
    .row:last-child { border-bottom: 0; }
    .label {
      color: #757682;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .value {
      font-size: 14px;
      font-weight: 700;
    }
    .qr-section {
      border-left: 1px solid #e1e2ea;
      padding-left: 24px;
      text-align: center;
    }
    .qr-box {
      width: 190px;
      height: 190px;
      margin: 0 auto;
      padding: 8px;
      border: 1px solid #c5c5d3;
      border-radius: 16px;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-box svg {
      width: 170px;
      height: 170px;
    }
    .qr-label {
      font-size: 12px;
      font-weight: 700;
      color: #006a61;
      margin-top: 12px;
    }
    .expiry {
      font-size: 10px;
      color: #757682;
      margin-top: 5px;
    }
    .footer {
      padding: 14px;
      background: #f2f4f6;
      color: #444651;
      font-size: 11px;
      text-align: center;
    }
    @media print {
      body {
        padding: 0;
        background: white;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="heading">
      CampusCopilot Digital Student ID
    </div>

    <div class="card">
      <div class="identity">
        <div class="avatar">${safeInitials}</div>
        <div class="student-name">${safeName}</div>
        <div class="department">${safeDepartment}</div>
      </div>

      <div class="content">
        <div>
          <div class="row">
            <div class="label">Student ID</div>
            <div class="value">${safeRoll}</div>
          </div>
          <div class="row">
            <div class="label">Department</div>
            <div class="value">${safeDepartment}</div>
          </div>
          <div class="row">
            <div class="label">Semester</div>
            <div class="value">${safeSemester}</div>
          </div>
          <div class="row">
            <div class="label">Section</div>
            <div class="value">${safeSection}</div>
          </div>
          <div class="row">
            <div class="label">Email</div>
            <div class="value">${safeEmail}</div>
          </div>
        </div>

        <div class="qr-section">
          ${
            qrSvg
              ? `
                <div class="qr-box">${qrSvg}</div>
                <div class="qr-label">
                  Secure Verification QR
                </div>
                ${
                  safeExpiry
                    ? `
                      <div class="expiry">
                        Valid until ${safeExpiry}
                      </div>
                    `
                    : ""
                }
              `
              : `<div class="qr-box">QR unavailable</div>`
          }
        </div>
      </div>

      <div class="footer">
        Student profile loaded from CampusCopilot academic records.
      </div>
    </div>
  </div>

  <script>
    window.onload = function () {
      window.print();
    };
  </script>
</body>
</html>
    `);

    printWindow.document.close();
  }

  if (loading) {
    return (
      <StudentPageLayout
        activePath="/student-id"
        eyebrow="STUDENT IDENTITY"
        title="Digital Student ID"
        subtitle="Your secure campus identity and academic profile in one place."
      >
        <div className="min-h-[420px] rounded-2xl border border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[34px] animate-pulse">
              badge
            </span>
          </div>

          <h2 className="text-lg font-bold text-on-surface mt-4">
            Loading Digital Student ID
          </h2>

          <p className="text-sm text-on-surface-variant mt-1">
            Loading your CampusCopilot academic profile...
          </p>
        </div>
      </StudentPageLayout>
    );
  }

  if (error) {
    return (
      <StudentPageLayout
        activePath="/student-id"
        eyebrow="STUDENT IDENTITY"
        title="Digital Student ID"
        subtitle="Your secure campus identity and academic profile in one place."
      >
        <div className="mx-auto max-w-lg rounded-2xl border border-error/30 bg-surface-container-lowest px-6 py-12 text-center">
          <span className="material-symbols-outlined text-error text-5xl">
            error
          </span>

          <h2 className="text-xl font-bold text-error mt-3">
            Unable to Load Student ID
          </h2>

          <p className="text-on-surface-variant mt-2">
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
      <div className="w-full pb-8 space-y-4">
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(300px,0.85fr)_minmax(360px,1.15fr)_minmax(300px,0.85fr)] rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <div className="relative min-h-[440px] overflow-hidden bg-gradient-to-br from-primary via-primary-container to-secondary p-6 md:p-8 text-white flex flex-col items-center justify-center">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full border border-white/10" />
            <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full border border-white/10" />

            <div className="absolute top-8 left-8 text-[10px] tracking-[0.16em] font-bold text-white/70 uppercase">
              CampusCopilot
            </div>

            <div className="w-[118px] h-[118px] rounded-full border-[4px] border-white/80 p-1 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
              <div className="w-full h-full rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-[36px] font-bold">
                {initials}
              </div>
            </div>

            <h2 className="text-2xl md:text-[28px] font-bold mt-5 text-center">
              {studentName}
            </h2>

            <p className="text-sm md:text-[15px] text-white/85 mt-2 text-center">
              {department}
            </p>

            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {semester !== null && (
                <span className="rounded-full bg-white/12 border border-white/15 px-3 py-1 text-xs font-semibold">
                  Semester {semester}
                </span>
              )}

              {section && (
                <span className="rounded-full bg-white/12 border border-white/15 px-3 py-1 text-xs font-semibold">
                  Section {section}
                </span>
              )}
            </div>

            <div className="mt-8 flex items-center gap-2 rounded-full bg-black/10 border border-white/15 px-4 py-2 text-xs font-semibold">
              <span className="material-symbols-outlined text-[17px]">
                verified_user
              </span>
              CampusCopilot Record
            </div>
          </div>

          <div className="p-5 md:p-7 xl:border-l xl:border-outline-variant">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-outline">
                  Student Information
                </p>
                <h3 className="text-lg font-bold text-on-surface mt-1">
                  Academic Identity
                </h3>
              </div>

              <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">
                  badge
                </span>
              </div>
            </div>

            <div className="divide-y divide-outline-variant">
              <InfoRow
                icon="id_card"
                iconClass="bg-primary-fixed text-primary"
                label="Student ID"
                value={studentRoll}
                action={
                  <button
                    type="button"
                    onClick={handleCopyStudentId}
                    className="w-9 h-9 rounded-lg border border-outline-variant text-primary flex items-center justify-center hover:bg-primary/5"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {copied ? "check" : "content_copy"}
                    </span>
                  </button>
                }
              />

              <InfoRow
                icon="school"
                iconClass="bg-secondary-container text-secondary"
                label="Department"
                value={department}
              />

              <InfoRow
                icon="calendar_month"
                iconClass="bg-tertiary-fixed text-tertiary"
                label="Semester"
                value={
                  semester !== null
                    ? `Semester ${semester}`
                    : "Not available"
                }
              />

              <InfoRow
                icon="groups"
                iconClass="bg-orange-100 text-orange-700"
                label="Section"
                value={
                  section
                    ? `Section ${section}`
                    : "Not available"
                }
              />

              <InfoRow
                icon="mail"
                iconClass="bg-blue-50 text-blue-700"
                label="Email"
                value={email || "Not available"}
              />
            </div>
          </div>

          <div className="p-5 md:p-7 bg-surface-container-low/35 xl:border-l xl:border-outline-variant flex flex-col">
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                verified_user
              </span>
              <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-on-surface-variant">
                Campus Verification
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-6">
              {verificationLoading && (
                <div className="w-[210px] h-[210px] rounded-2xl border border-outline-variant bg-white flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[38px] animate-spin">
                    progress_activity
                  </span>
                  <p className="text-xs font-semibold text-on-surface-variant mt-3">
                    Checking secure verification...
                  </p>
                </div>
              )}

              {!verificationLoading && verificationUrl && (
                <>
                  <div className="rounded-2xl border border-secondary/25 bg-white p-4 shadow-[0_8px_24px_rgba(0,35,111,0.06)]">
                    <QRCodeSVG
                      id="student-verification-qr"
                      value={verificationUrl}
                      size={180}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#00236f"
                    />
                  </div>

                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary-container text-secondary px-3 py-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-[16px]">
                      check_circle
                    </span>
                    Active Verification
                  </div>

                  <p className="text-xs text-on-surface-variant text-center mt-3">
                    Scan to verify this student identity.
                  </p>

                  {verificationExpiresAt && (
                    <p className="text-[11px] text-outline text-center mt-1">
                      Valid until{" "}
                      {formatDate(verificationExpiresAt)}
                    </p>
                  )}

                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={handleCopyVerificationLink}
                      className="h-9 px-3 rounded-lg border border-outline-variant bg-white text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/5"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        link
                      </span>
                      Copy Link
                    </button>

                    <button
                      type="button"
                      onClick={handleRegenerateQr}
                      className="h-9 px-3 rounded-lg border border-outline-variant bg-white text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/5"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        refresh
                      </span>
                      New QR
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRevokeQr}
                    className="mt-3 text-[11px] text-error font-semibold hover:underline"
                  >
                    Revoke verification
                  </button>
                </>
              )}

              {!verificationLoading &&
                !verificationUrl &&
                verificationError && (
                  <div className="w-full max-w-[280px] rounded-xl border border-error/20 bg-error-container p-4 text-center">
                    <span className="material-symbols-outlined text-error text-[30px]">
                      error
                    </span>

                    <p className="text-xs text-on-error-container mt-2">
                      {verificationError}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        runVerificationAction("check")
                      }
                      className="mt-3 h-9 px-4 rounded-lg bg-error text-white text-xs font-semibold"
                    >
                      Try Again
                    </button>
                  </div>
                )}

              {!verificationLoading &&
                !verificationUrl &&
                !verificationError && (
                  <div className="text-center max-w-[260px]">
                    <div className="w-16 h-16 rounded-2xl bg-surface-container text-outline mx-auto flex items-center justify-center">
                      <span className="material-symbols-outlined text-[34px]">
                        qr_code_2
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-on-surface mt-3">
                      {verificationRevoked
                        ? "Verification Inactive"
                        : "Generate Verification QR"}
                    </h4>

                    <p className="text-xs text-on-surface-variant mt-1">
                      {verificationRevoked
                        ? "The previous QR is expired, revoked, or no longer valid."
                        : "No validated QR is saved in this tab. Generating a new QR replaces any previous active QR."}
                    </p>

                    <button
                      type="button"
                      onClick={createVerification}
                      className="mt-4 h-10 px-4 rounded-lg bg-primary text-white text-xs font-semibold"
                    >
                      Generate New QR
                    </button>
                  </div>
                )}
            </div>
          </div>
        </section>

        {actionMessage && (
          <div className="rounded-xl border border-secondary/20 bg-secondary-container/20 text-on-secondary-container px-4 py-3 flex items-center gap-2 text-sm font-semibold">
            <span className="material-symbols-outlined text-[18px]">
              check_circle
            </span>
            {actionMessage}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.75fr)] gap-4">
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-on-surface-variant mb-4">
              Academic Information
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AcademicCard
                icon="account_balance"
                iconClass="bg-secondary-container text-secondary"
                cardClass="from-emerald-50 to-white"
                label="Department"
                value={department}
              />

              <AcademicCard
                icon="event_note"
                iconClass="bg-tertiary-fixed text-tertiary"
                cardClass="from-violet-50 to-white"
                label="Semester"
                value={
                  semester !== null
                    ? `Semester ${semester}`
                    : "Not available"
                }
              />

              <AcademicCard
                icon="groups"
                iconClass="bg-orange-100 text-orange-700"
                cardClass="from-orange-50 to-white"
                label="Section"
                value={
                  section
                    ? `Section ${section}`
                    : "Not available"
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-on-surface-variant mb-4">
              Quick Actions
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ActionButton
                icon={copied ? "check" : "content_copy"}
                label="Copy ID"
                onClick={handleCopyStudentId}
              />
              <ActionButton
                icon="print"
                label="Print ID"
                onClick={handlePrintId}
              />
              <ActionButton
                icon="share"
                label="Share ID"
                onClick={handleShareId}
              />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.75fr)] gap-4">
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-on-surface-variant mb-3">
              Student Details
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <DetailItem
                icon="person"
                label="Full Name"
                value={studentName}
              />
              <DetailItem
                icon="mail"
                label="Email Address"
                value={email || "Not available"}
              />
              <DetailItem
                icon="badge"
                label="Student ID"
                value={studentRoll}
              />
              <DetailItem
                icon="account_balance"
                label="Department"
                value={department}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant bg-gradient-to-br from-blue-50 to-white p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-[20px]">
                security
              </span>
              <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-on-surface-variant">
                Security
              </div>
            </div>

            <div className="space-y-3 text-xs leading-5 text-on-surface-variant">
              <SecurityNote>
                The QR contains a secure random verification
                token, not your raw student information.
              </SecurityNote>

              <SecurityNote>
                The backend stores only a SHA-256 hash of the
                verification token.
              </SecurityNote>

              <SecurityNote>
                Public verification exposes only limited
                academic identity information.
              </SecurityNote>

              <SecurityNote>
                Generating a new QR automatically invalidates
                the previous active QR.
              </SecurityNote>
            </div>
          </section>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1 text-[11px] text-outline">
          <span>CampusCopilot Digital Student Identity</span>

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[16px]">
              shield
            </span>
            {verificationUrl
              ? "Verification checked"
              : "No validated QR displayed"}
          </div>
        </div>
      </div>
    </StudentPageLayout>
  );
}

function InfoRow({
  icon,
  iconClass,
  label,
  value,
  action = null,
}) {
  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 py-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconClass}`}
      >
        <span className="material-symbols-outlined text-[20px]">
          {icon}
        </span>
      </div>

      <div className="min-w-0">
        <div className="text-xs text-on-surface-variant">
          {label}
        </div>
        <div className="text-sm font-bold text-on-surface mt-0.5 break-words">
          {value}
        </div>
      </div>

      {action}
    </div>
  );
}

function AcademicCard({
  icon,
  iconClass,
  cardClass,
  label,
  value,
}) {
  return (
    <div
      className={`rounded-xl border border-outline-variant bg-gradient-to-br ${cardClass} p-4 flex items-center gap-3`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
      >
        <span className="material-symbols-outlined">
          {icon}
        </span>
      </div>

      <div className="min-w-0">
        <div className="text-xs text-on-surface-variant">
          {label}
        </div>
        <div className="text-sm font-bold text-on-surface mt-1 break-words">
          {value}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[92px] rounded-xl border border-outline-variant bg-surface-container-low hover:bg-primary-fixed/35 hover:border-primary/20 transition-all flex flex-col items-center justify-center gap-2 text-center px-2"
    >
      <span className="material-symbols-outlined text-primary">
        {icon}
      </span>
      <span className="text-xs font-semibold text-on-surface">
        {label}
      </span>
    </button>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-outline-variant">
      <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
        {icon}
      </span>

      <div className="min-w-0">
        <div className="text-xs text-on-surface-variant">
          {label}
        </div>
        <div className="text-sm font-semibold text-on-surface mt-1 break-words">
          {value}
        </div>
      </div>
    </div>
  );
}

function SecurityNote({ children }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-[7px] shrink-0" />
      <span>{children}</span>
    </div>
  );
}