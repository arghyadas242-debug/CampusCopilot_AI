import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  QRCodeSVG,
} from "qrcode.react";

import StudentPageLayout from "../../components/student/StudentPageLayout";
import { authService } from "../../services/api";


const API_URL =
  "http://localhost:5000";

const VERIFICATION_STORAGE_KEY =
  "campus_student_id_verification";


// =====================================================
// HELPERS
// =====================================================

function getInitials(name) {
  const parts =
    String(name || "Student")
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
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}


function getStoredVerification() {
  try {
    const value =
      localStorage.getItem(
        VERIFICATION_STORAGE_KEY
      );

    if (!value) {
      return null;
    }

    const parsed =
      JSON.parse(value);

    if (
      !parsed?.verificationUrl ||
      !parsed?.expiresAt
    ) {
      return null;
    }

    return parsed;

  } catch {
    return null;
  }
}


function saveStoredVerification(
  verification
) {
  localStorage.setItem(
    VERIFICATION_STORAGE_KEY,
    JSON.stringify({
      verificationUrl:
        verification.verificationUrl,

      expiresAt:
        verification.expiresAt,
    })
  );
}


function clearStoredVerification() {
  localStorage.removeItem(
    VERIFICATION_STORAGE_KEY
  );
}


function extractVerificationToken(
  verificationUrl
) {
  try {
    const url =
      new URL(
        verificationUrl
      );

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    const index =
      parts.indexOf(
        "verify-student"
      );

    if (
      index === -1 ||
      !parts[index + 1]
    ) {
      return "";
    }

    return decodeURIComponent(
      parts[index + 1]
    );

  } catch {
    return "";
  }
}


// =====================================================
// COMPONENT
// =====================================================

export default function StudentIDPage() {
  const [
    studentProfile,
    setStudentProfile,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const [
    copied,
    setCopied,
  ] = useState(false);


  const [
    actionMessage,
    setActionMessage,
  ] = useState("");


  // ===================================================
  // QR VERIFICATION STATE
  // ===================================================

  const [
    verificationUrl,
    setVerificationUrl,
  ] = useState("");


  const [
    verificationExpiresAt,
    setVerificationExpiresAt,
  ] = useState("");


  const [
    verificationLoading,
    setVerificationLoading,
  ] = useState(false);


  const [
    verificationError,
    setVerificationError,
  ] = useState("");


  const [
    verificationRevoked,
    setVerificationRevoked,
  ] = useState(false);


  const verificationBootRef =
    useRef(false);


  // ===================================================
  // CURRENT USER
  // ===================================================

  const currentUser =
    authService.getCurrentUser();


  // ===================================================
  // REAL STUDENT DATA
  // ===================================================

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


  const email =
    studentProfile?.EMAIL ||
    currentUser?.email ||
    "";


  const initials =
    useMemo(
      () =>
        getInitials(
          studentName
        ),
      [studentName]
    );


  // ===================================================
  // SMALL MESSAGE
  // ===================================================

  function showActionMessage(
    message
  ) {
    setActionMessage(
      message
    );

    window.setTimeout(
      () => {
        setActionMessage("");
      },
      2500
    );
  }


  // ===================================================
  // LOAD REAL STUDENT
  // ===================================================

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


        const token =
          localStorage.getItem(
            "campus_token"
          );


        const response =
          await fetch(
            `${API_URL}/api/students/${encodeURIComponent(
              roll
            )}`,
            {
              headers: token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
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
            // Keep generic message.
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


  // ===================================================
  // CREATE VERIFICATION
  // ===================================================

  async function createVerification(
    showMessage = false
  ) {
    const token =
      localStorage.getItem(
        "campus_token"
      );


    if (!token) {
      setVerificationError(
        "Authentication token not found. Please log in again."
      );

      return;
    }


    try {
      setVerificationLoading(
        true
      );

      setVerificationError("");

      setVerificationRevoked(
        false
      );


      const response =
        await fetch(
          `${API_URL}/api/student-id/verification`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to create Student ID verification."
        );
      }


      const verification =
        data?.verification;


      if (
        !verification
          ?.verificationUrl
      ) {
        throw new Error(
          "Verification URL was not returned by the server."
        );
      }


      setVerificationUrl(
        verification.verificationUrl
      );


      setVerificationExpiresAt(
        verification.expiresAt ||
          ""
      );


      saveStoredVerification(
        verification
      );


      if (showMessage) {
        showActionMessage(
          "A new secure verification QR was generated."
        );
      }

    } catch (err) {
      console.error(
        "Create verification error:",
        err
      );


      setVerificationError(
        err.message ||
          "Unable to generate verification QR."
      );

    } finally {
      setVerificationLoading(
        false
      );
    }
  }


  // ===================================================
  // CHECK EXISTING SAVED QR
  // ===================================================

  async function ensureVerification() {
    const stored =
      getStoredVerification();


    // -------------------------------------------------
    // NO SAVED QR
    // -------------------------------------------------

    if (!stored) {
      await createVerification(
        false
      );

      return;
    }


    // -------------------------------------------------
    // CHECK LOCAL EXPIRY
    // -------------------------------------------------

    const expiry =
      new Date(
        stored.expiresAt
      );


    if (
      Number.isNaN(
        expiry.getTime()
      ) ||
      expiry.getTime() <=
        Date.now()
    ) {
      clearStoredVerification();

      await createVerification(
        false
      );

      return;
    }


    const token =
      extractVerificationToken(
        stored.verificationUrl
      );


    if (!token) {
      clearStoredVerification();

      await createVerification(
        false
      );

      return;
    }


    // -------------------------------------------------
    // VERIFY SAVED TOKEN AGAINST BACKEND
    // -------------------------------------------------

    try {
      setVerificationLoading(
        true
      );

      setVerificationError("");


      const response =
        await fetch(
          `${API_URL}/api/student-id/verify/${encodeURIComponent(
            token
          )}`
        );


      const data =
        await response.json();


      if (
        response.ok &&
        data?.valid === true
      ) {
        setVerificationUrl(
          stored.verificationUrl
        );


        setVerificationExpiresAt(
          stored.expiresAt
        );


        setVerificationRevoked(
          false
        );

        return;
      }


      clearStoredVerification();

      await createVerification(
        false
      );

    } catch (err) {
      console.error(
        "Existing verification check error:",
        err
      );


      /*
        If server cannot validate the old QR,
        don't pretend it is valid.
      */

      setVerificationError(
        "Unable to validate your verification QR."
      );

    } finally {
      setVerificationLoading(
        false
      );
    }
  }


  // ===================================================
  // LOAD QR AFTER STUDENT PROFILE
  // ===================================================

  useEffect(() => {
    if (
      !studentProfile ||
      verificationBootRef.current
    ) {
      return;
    }


    verificationBootRef.current =
      true;


    ensureVerification();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentProfile]);


  // ===================================================
  // REGENERATE QR
  // ===================================================

  async function handleRegenerateQr() {
    clearStoredVerification();

    await createVerification(
      true
    );
  }


  // ===================================================
  // REVOKE QR
  // ===================================================

  async function handleRevokeQr() {
    const token =
      localStorage.getItem(
        "campus_token"
      );


    if (!token) {
      setVerificationError(
        "Authentication token not found. Please log in again."
      );

      return;
    }


    try {
      setVerificationLoading(
        true
      );

      setVerificationError("");


      const response =
        await fetch(
          `${API_URL}/api/student-id/verification`,
          {
            method:
              "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to revoke verification QR."
        );
      }


      clearStoredVerification();


      setVerificationUrl("");

      setVerificationExpiresAt("");

      setVerificationRevoked(
        true
      );


      showActionMessage(
        "Verification QR revoked."
      );

    } catch (err) {
      console.error(
        "Revoke verification error:",
        err
      );


      setVerificationError(
        err.message ||
          "Unable to revoke verification QR."
      );

    } finally {
      setVerificationLoading(
        false
      );
    }
  }


  // ===================================================
  // COPY STUDENT ID
  // ===================================================

  async function handleCopyStudentId() {
    if (
      !studentRoll ||
      studentRoll === "--"
    ) {
      return;
    }


    try {
      await navigator.clipboard.writeText(
        String(
          studentRoll
        )
      );


      setCopied(true);


      showActionMessage(
        "Student ID copied."
      );


      window.setTimeout(
        () => {
          setCopied(false);
        },
        2200
      );

    } catch (err) {
      console.error(
        "Copy student ID error:",
        err
      );


      showActionMessage(
        "Unable to copy Student ID."
      );
    }
  }


  // ===================================================
  // COPY VERIFICATION LINK
  // ===================================================

  async function handleCopyVerificationLink() {
    if (!verificationUrl) {
      return;
    }


    try {
      await navigator.clipboard.writeText(
        verificationUrl
      );


      showActionMessage(
        "Verification link copied."
      );

    } catch (err) {
      console.error(
        "Copy verification URL error:",
        err
      );


      showActionMessage(
        "Unable to copy verification link."
      );
    }
  }


  // ===================================================
  // SHARE ID
  // ===================================================

  async function handleShareId() {
    const shareText = [
      "CampusCopilot Student Identity",

      `Name: ${studentName}`,

      `Student ID: ${studentRoll}`,

      `Department: ${department}`,

      semester !== null
        ? `Semester: ${semester}`
        : null,

      section
        ? `Section: ${section}`
        : null,

      verificationUrl
        ? `Verification: ${verificationUrl}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");


    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            "CampusCopilot Student ID",

          text:
            shareText,

          ...(verificationUrl
            ? {
                url:
                  verificationUrl,
              }
            : {}),
        });


        showActionMessage(
          "Student identity shared."
        );

      } else {
        await navigator.clipboard.writeText(
          shareText
        );


        showActionMessage(
          "Student identity copied for sharing."
        );
      }

    } catch (err) {
      if (
        err?.name !==
        "AbortError"
      ) {
        console.error(
          "Share student ID error:",
          err
        );


        showActionMessage(
          "Unable to share Student ID."
        );
      }
    }
  }


  // ===================================================
  // PRINT DIGITAL ID
  // ===================================================

  function handlePrintId() {
    const printWindow =
      window.open(
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


    const qrElement =
      document.getElementById(
        "student-verification-qr"
      );


    const qrSvg =
      qrElement?.outerHTML ||
      "";


    const safeName =
      escapeHtml(
        studentName
      );


    const safeRoll =
      escapeHtml(
        studentRoll
      );


    const safeDepartment =
      escapeHtml(
        department
      );


    const safeSemester =
      semester !== null
        ? escapeHtml(
            semester
          )
        : "—";


    const safeSection =
      section
        ? escapeHtml(
            section
          )
        : "—";


    const safeEmail =
      email
        ? escapeHtml(
            email
          )
        : "Not available";


    const safeInitials =
      escapeHtml(
        initials
      );


    const safeExpiry =
      verificationExpiresAt
        ? escapeHtml(
            formatDate(
              verificationExpiresAt
            )
          )
        : "";


    printWindow.document.write(`
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8" />

  <title>
    CampusCopilot Student ID - ${safeRoll}
  </title>

  <style>

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 36px;
      background: #f7f9fb;
      color: #191c1e;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
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
      border:
        1px solid #c5c5d3;
      border-radius: 24px;
      overflow: hidden;
      background: white;
    }

    .identity {
      padding: 32px;
      background:
        linear-gradient(
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
      margin:
        0 auto 16px;
      border:
        4px solid rgba(
          255,
          255,
          255,
          .8
        );
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
      grid-template-columns:
        minmax(0, 1fr)
        230px;
      gap: 24px;
      padding: 26px;
    }

    .row {
      padding:
        11px 0;
      border-bottom:
        1px solid #e1e2ea;
    }

    .row:last-child {
      border-bottom: 0;
    }

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
      border-left:
        1px solid #e1e2ea;
      padding-left: 24px;
      text-align: center;
    }

    .qr-box {
      width: 190px;
      height: 190px;
      margin: 0 auto;
      padding: 8px;
      border:
        1px solid #c5c5d3;
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

        <div class="avatar">
          ${safeInitials}
        </div>

        <div class="student-name">
          ${safeName}
        </div>

        <div class="department">
          ${safeDepartment}
        </div>

      </div>


      <div class="content">

        <div>

          <div class="row">
            <div class="label">
              Student ID
            </div>

            <div class="value">
              ${safeRoll}
            </div>
          </div>


          <div class="row">
            <div class="label">
              Department
            </div>

            <div class="value">
              ${safeDepartment}
            </div>
          </div>


          <div class="row">
            <div class="label">
              Semester
            </div>

            <div class="value">
              ${safeSemester}
            </div>
          </div>


          <div class="row">
            <div class="label">
              Section
            </div>

            <div class="value">
              ${safeSection}
            </div>
          </div>


          <div class="row">
            <div class="label">
              Email
            </div>

            <div class="value">
              ${safeEmail}
            </div>
          </div>

        </div>


        <div class="qr-section">

          ${
            qrSvg
              ? `
                <div class="qr-box">
                  ${qrSvg}
                </div>

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
              : `
                <div class="qr-box">
                  QR unavailable
                </div>
              `
          }

        </div>

      </div>


      <div class="footer">
        Student profile loaded from CampusCopilot academic records.
      </div>

    </div>

  </div>


  <script>

    window.onload =
      function () {
        window.print();
      };

  </script>

</body>

</html>
    `);


    printWindow.document.close();
  }


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <StudentPageLayout
        activePath="/student-id"
        eyebrow="STUDENT IDENTITY"
        title="Digital Student ID"
        subtitle="Your secure campus identity and academic profile in one place."
      >

        <div
          className="
            min-h-[420px]
            rounded-2xl
            border
            border-outline-variant
            bg-surface-container-lowest
            flex
            flex-col
            items-center
            justify-center
            text-center
          "
        >

          <div
            className="
              w-16
              h-16
              rounded-2xl
              bg-primary-fixed
              text-primary
              flex
              items-center
              justify-center
            "
          >
            <span
              className="
                material-symbols-outlined
                text-[34px]
                animate-pulse
              "
            >
              badge
            </span>
          </div>


          <h2
            className="
              text-lg
              font-bold
              text-on-surface
              mt-4
            "
          >
            Loading Digital Student ID
          </h2>


          <p
            className="
              text-sm
              text-on-surface-variant
              mt-1
            "
          >
            Loading your CampusCopilot academic profile...
          </p>

        </div>

      </StudentPageLayout>
    );
  }


  // ===================================================
  // ERROR
  // ===================================================

  if (error) {
    return (
      <StudentPageLayout
        activePath="/student-id"
        eyebrow="STUDENT IDENTITY"
        title="Digital Student ID"
        subtitle="Your secure campus identity and academic profile in one place."
      >

        <div
          className="
            mx-auto
            max-w-lg
            rounded-2xl
            border
            border-error/30
            bg-surface-container-lowest
            px-6
            py-12
            text-center
          "
        >

          <span
            className="
              material-symbols-outlined
              text-error
              text-5xl
            "
          >
            error
          </span>


          <h2
            className="
              text-xl
              font-bold
              text-error
              mt-3
            "
          >
            Unable to Load Student ID
          </h2>


          <p
            className="
              text-on-surface-variant
              mt-2
            "
          >
            {error}
          </p>

        </div>

      </StudentPageLayout>
    );
  }


  // ===================================================
  // MAIN PAGE
  // ===================================================

  return (
    <StudentPageLayout
      activePath="/student-id"
      eyebrow="STUDENT IDENTITY"
      title="Digital Student ID"
      subtitle="Your secure campus identity and academic profile in one place."
    >

      <div
        className="
          w-full
          pb-8
          space-y-4
        "
      >

        {/* =================================================
            MAIN ID CARD
        ================================================== */}

        <section
          className="
            grid
            grid-cols-1
            xl:grid-cols-[minmax(300px,0.85fr)_minmax(360px,1.15fr)_minmax(300px,0.85fr)]
            rounded-2xl
            border
            border-outline-variant
            bg-surface-container-lowest
            overflow-hidden
          "
        >

          {/* ===============================================
              IDENTITY
          ================================================ */}

          <div
            className="
              relative
              min-h-[440px]
              overflow-hidden
              bg-gradient-to-br
              from-primary
              via-primary-container
              to-secondary
              p-6
              md:p-8
              text-white
              flex
              flex-col
              items-center
              justify-center
            "
          >

            <div
              className="
                absolute
                -top-24
                -right-24
                w-64
                h-64
                rounded-full
                border
                border-white/10
              "
            />

            <div
              className="
                absolute
                -bottom-28
                -left-20
                w-72
                h-72
                rounded-full
                border
                border-white/10
              "
            />


            <div
              className="
                absolute
                top-8
                left-8
                text-[10px]
                tracking-[0.16em]
                font-bold
                text-white/70
                uppercase
              "
            >
              CampusCopilot
            </div>


            <div
              className="
                w-[118px]
                h-[118px]
                rounded-full
                border-[4px]
                border-white/80
                p-1
                shadow-[0_8px_30px_rgba(0,0,0,0.15)]
              "
            >
              <div
                className="
                  w-full
                  h-full
                  rounded-full
                  bg-white/10
                  backdrop-blur
                  flex
                  items-center
                  justify-center
                  text-[36px]
                  font-bold
                "
              >
                {initials}
              </div>
            </div>


            <h2
              className="
                text-2xl
                md:text-[28px]
                font-bold
                mt-5
                text-center
              "
            >
              {studentName}
            </h2>


            <p
              className="
                text-sm
                md:text-[15px]
                text-white/85
                mt-2
                text-center
              "
            >
              {department}
            </p>


            <div
              className="
                flex
                flex-wrap
                justify-center
                gap-2
                mt-4
              "
            >

              {semester !== null && (
                <span
                  className="
                    rounded-full
                    bg-white/12
                    border
                    border-white/15
                    px-3
                    py-1
                    text-xs
                    font-semibold
                  "
                >
                  Semester {semester}
                </span>
              )}


              {section && (
                <span
                  className="
                    rounded-full
                    bg-white/12
                    border
                    border-white/15
                    px-3
                    py-1
                    text-xs
                    font-semibold
                  "
                >
                  Section {section}
                </span>
              )}

            </div>


            <div
              className="
                mt-8
                flex
                items-center
                gap-2
                rounded-full
                bg-black/10
                border
                border-white/15
                px-4
                py-2
                text-xs
                font-semibold
              "
            >
              <span
                className="
                  material-symbols-outlined
                  text-[17px]
                "
              >
                verified_user
              </span>

              CampusCopilot Record
            </div>

          </div>


          {/* ===============================================
              STUDENT INFORMATION
          ================================================ */}

          <div
            className="
              p-5
              md:p-7
              xl:border-l
              xl:border-outline-variant
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                mb-4
              "
            >

              <div>

                <p
                  className="
                    text-[11px]
                    font-bold
                    tracking-[0.12em]
                    uppercase
                    text-outline
                  "
                >
                  Student Information
                </p>

                <h3
                  className="
                    text-lg
                    font-bold
                    text-on-surface
                    mt-1
                  "
                >
                  Academic Identity
                </h3>

              </div>


              <div
                className="
                  w-10
                  h-10
                  rounded-xl
                  bg-primary-fixed
                  text-primary
                  flex
                  items-center
                  justify-center
                "
              >
                <span className="material-symbols-outlined">
                  badge
                </span>
              </div>

            </div>


            <div
              className="
                divide-y
                divide-outline-variant
              "
            >

              {/* STUDENT ID */}

              <InfoRow
                icon="id_card"
                iconClass="bg-primary-fixed text-primary"
                label="Student ID"
                value={studentRoll}
                action={
                  <button
                    type="button"
                    onClick={
                      handleCopyStudentId
                    }
                    className="
                      w-9
                      h-9
                      rounded-lg
                      border
                      border-outline-variant
                      text-primary
                      flex
                      items-center
                      justify-center
                      hover:bg-primary/5
                    "
                  >
                    <span
                      className="
                        material-symbols-outlined
                        text-[18px]
                      "
                    >
                      {copied
                        ? "check"
                        : "content_copy"}
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
                value={
                  email ||
                  "Not available"
                }
              />

            </div>

          </div>


          {/* ===============================================
              REAL QR VERIFICATION
          ================================================ */}

          <div
            className="
              p-5
              md:p-7
              bg-surface-container-low/35
              xl:border-l
              xl:border-outline-variant
              flex
              flex-col
            "
          >

            <div
              className="
                flex
                items-center
                justify-center
                gap-2
              "
            >

              <span
                className="
                  material-symbols-outlined
                  text-secondary
                  text-[20px]
                "
              >
                verified_user
              </span>


              <span
                className="
                  text-[11px]
                  font-bold
                  tracking-[0.12em]
                  uppercase
                  text-on-surface-variant
                "
              >
                Campus Verification
              </span>

            </div>


            <div
              className="
                flex-1
                flex
                flex-col
                items-center
                justify-center
                py-6
              "
            >

              {/* LOADING QR */}

              {verificationLoading && (
                <div
                  className="
                    w-[210px]
                    h-[210px]
                    rounded-2xl
                    border
                    border-outline-variant
                    bg-white
                    flex
                    flex-col
                    items-center
                    justify-center
                  "
                >

                  <span
                    className="
                      material-symbols-outlined
                      text-primary
                      text-[38px]
                      animate-spin
                    "
                  >
                    progress_activity
                  </span>


                  <p
                    className="
                      text-xs
                      font-semibold
                      text-on-surface-variant
                      mt-3
                    "
                  >
                    Generating secure QR...
                  </p>

                </div>
              )}


              {/* REAL QR */}

              {!verificationLoading &&
                verificationUrl && (

                <>

                  <div
                    className="
                      rounded-2xl
                      border
                      border-secondary/25
                      bg-white
                      p-4
                      shadow-[0_8px_24px_rgba(0,35,111,0.06)]
                    "
                  >

                    <QRCodeSVG
                      id="student-verification-qr"
                      value={
                        verificationUrl
                      }
                      size={180}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#00236f"
                    />

                  </div>


                  <div
                    className="
                      mt-4
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      bg-secondary-container
                      text-secondary
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                    "
                  >

                    <span
                      className="
                        material-symbols-outlined
                        text-[16px]
                      "
                    >
                      check_circle
                    </span>

                    Active Verification

                  </div>


                  <p
                    className="
                      text-xs
                      text-on-surface-variant
                      text-center
                      mt-3
                    "
                  >
                    Scan to verify this student identity.
                  </p>


                  {verificationExpiresAt && (
                    <p
                      className="
                        text-[11px]
                        text-outline
                        text-center
                        mt-1
                      "
                    >
                      Valid until{" "}
                      {formatDate(
                        verificationExpiresAt
                      )}
                    </p>
                  )}


                  <div
                    className="
                      flex
                      flex-wrap
                      justify-center
                      gap-2
                      mt-4
                    "
                  >

                    <button
                      type="button"
                      onClick={
                        handleCopyVerificationLink
                      }
                      className="
                        h-9
                        px-3
                        rounded-lg
                        border
                        border-outline-variant
                        bg-white
                        text-primary
                        text-xs
                        font-semibold
                        flex
                        items-center
                        gap-1.5
                        hover:bg-primary/5
                      "
                    >
                      <span
                        className="
                          material-symbols-outlined
                          text-[16px]
                        "
                      >
                        link
                      </span>

                      Copy Link
                    </button>


                    <button
                      type="button"
                      onClick={
                        handleRegenerateQr
                      }
                      className="
                        h-9
                        px-3
                        rounded-lg
                        border
                        border-outline-variant
                        bg-white
                        text-primary
                        text-xs
                        font-semibold
                        flex
                        items-center
                        gap-1.5
                        hover:bg-primary/5
                      "
                    >
                      <span
                        className="
                          material-symbols-outlined
                          text-[16px]
                        "
                      >
                        refresh
                      </span>

                      New QR
                    </button>

                  </div>


                  <button
                    type="button"
                    onClick={
                      handleRevokeQr
                    }
                    className="
                      mt-3
                      text-[11px]
                      text-error
                      font-semibold
                      hover:underline
                    "
                  >
                    Revoke verification
                  </button>

                </>
              )}


              {/* ERROR */}

              {!verificationLoading &&
                !verificationUrl &&
                verificationError && (

                <div
                  className="
                    w-full
                    max-w-[280px]
                    rounded-xl
                    border
                    border-error/20
                    bg-error-container
                    p-4
                    text-center
                  "
                >

                  <span
                    className="
                      material-symbols-outlined
                      text-error
                      text-[30px]
                    "
                  >
                    error
                  </span>


                  <p
                    className="
                      text-xs
                      text-on-error-container
                      mt-2
                    "
                  >
                    {verificationError}
                  </p>


                  <button
                    type="button"
                    onClick={() =>
                      createVerification(
                        true
                      )
                    }
                    className="
                      mt-3
                      h-9
                      px-4
                      rounded-lg
                      bg-error
                      text-white
                      text-xs
                      font-semibold
                    "
                  >
                    Try Again
                  </button>

                </div>
              )}


              {/* REVOKED */}

              {!verificationLoading &&
                !verificationUrl &&
                !verificationError &&
                verificationRevoked && (

                <div
                  className="
                    text-center
                    max-w-[260px]
                  "
                >

                  <div
                    className="
                      w-16
                      h-16
                      rounded-2xl
                      bg-surface-container
                      text-outline
                      mx-auto
                      flex
                      items-center
                      justify-center
                    "
                  >
                    <span
                      className="
                        material-symbols-outlined
                        text-[34px]
                      "
                    >
                      qr_code_2
                    </span>
                  </div>


                  <h4
                    className="
                      text-sm
                      font-bold
                      text-on-surface
                      mt-3
                    "
                  >
                    Verification Revoked
                  </h4>


                  <p
                    className="
                      text-xs
                      text-on-surface-variant
                      mt-1
                    "
                  >
                    The previous QR can no longer verify this Student ID.
                  </p>


                  <button
                    type="button"
                    onClick={() =>
                      createVerification(
                        true
                      )
                    }
                    className="
                      mt-4
                      h-10
                      px-4
                      rounded-lg
                      bg-primary
                      text-white
                      text-xs
                      font-semibold
                    "
                  >
                    Generate New QR
                  </button>

                </div>
              )}

            </div>

          </div>

        </section>


        {/* =================================================
            MESSAGE
        ================================================== */}

        {actionMessage && (
          <div
            className="
              rounded-xl
              border
              border-secondary/20
              bg-secondary-container/20
              text-on-secondary-container
              px-4
              py-3
              flex
              items-center
              gap-2
              text-sm
              font-semibold
            "
          >

            <span
              className="
                material-symbols-outlined
                text-[18px]
              "
            >
              check_circle
            </span>

            {actionMessage}

          </div>
        )}


        {/* =================================================
            ACADEMIC INFORMATION + ACTIONS
        ================================================== */}

        <div
          className="
            grid
            grid-cols-1
            xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.75fr)]
            gap-4
          "
        >

          <section
            className="
              rounded-2xl
              border
              border-outline-variant
              bg-surface-container-lowest
              p-4
              md:p-5
            "
          >

            <div
              className="
                text-[11px]
                font-bold
                tracking-[0.12em]
                uppercase
                text-on-surface-variant
                mb-4
              "
            >
              Academic Information
            </div>


            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-3
                gap-3
              "
            >

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


          {/* QUICK ACTIONS */}

          <section
            className="
              rounded-2xl
              border
              border-outline-variant
              bg-surface-container-lowest
              p-4
              md:p-5
            "
          >

            <div
              className="
                text-[11px]
                font-bold
                tracking-[0.12em]
                uppercase
                text-on-surface-variant
                mb-4
              "
            >
              Quick Actions
            </div>


            <div
              className="
                grid
                grid-cols-3
                gap-2
              "
            >

              <ActionButton
                icon={
                  copied
                    ? "check"
                    : "content_copy"
                }
                label="Copy ID"
                onClick={
                  handleCopyStudentId
                }
              />


              <ActionButton
                icon="print"
                label="Print ID"
                onClick={
                  handlePrintId
                }
              />


              <ActionButton
                icon="share"
                label="Share ID"
                onClick={
                  handleShareId
                }
              />

            </div>

          </section>

        </div>


        {/* =================================================
            STUDENT DETAILS + SECURITY
        ================================================== */}

        <div
          className="
            grid
            grid-cols-1
            xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.75fr)]
            gap-4
          "
        >

          <section
            className="
              rounded-2xl
              border
              border-outline-variant
              bg-surface-container-lowest
              p-4
              md:p-5
            "
          >

            <div
              className="
                text-[11px]
                font-bold
                tracking-[0.12em]
                uppercase
                text-on-surface-variant
                mb-3
              "
            >
              Student Details
            </div>


            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                gap-x-8
              "
            >

              <DetailItem
                icon="person"
                label="Full Name"
                value={studentName}
              />


              <DetailItem
                icon="mail"
                label="Email Address"
                value={
                  email ||
                  "Not available"
                }
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


          <section
            className="
              rounded-2xl
              border
              border-outline-variant
              bg-gradient-to-br
              from-blue-50
              to-white
              p-4
              md:p-5
            "
          >

            <div
              className="
                flex
                items-center
                gap-2
                mb-4
              "
            >

              <span
                className="
                  material-symbols-outlined
                  text-primary
                  text-[20px]
                "
              >
                security
              </span>


              <div
                className="
                  text-[11px]
                  font-bold
                  tracking-[0.12em]
                  uppercase
                  text-on-surface-variant
                "
              >
                Security
              </div>

            </div>


            <div
              className="
                space-y-3
                text-xs
                leading-5
                text-on-surface-variant
              "
            >

              <SecurityNote>
                The QR contains a secure random verification token, not your raw student information.
              </SecurityNote>


              <SecurityNote>
                The backend stores only a SHA-256 hash of the verification token.
              </SecurityNote>


              <SecurityNote>
                Public verification exposes only limited academic identity information.
              </SecurityNote>


              <SecurityNote>
                Generating a new QR automatically invalidates the previous active QR.
              </SecurityNote>

            </div>

          </section>

        </div>


        {/* =================================================
            FOOTER
        ================================================== */}

        <div
          className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-2
            px-1
            text-[11px]
            text-outline
          "
        >

          <span>
            CampusCopilot Digital Student Identity
          </span>


          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <span
              className="
                material-symbols-outlined
                text-secondary
                text-[16px]
              "
            >
              shield
            </span>

            Secure verification enabled
          </div>

        </div>

      </div>

    </StudentPageLayout>
  );
}


// =====================================================
// INFO ROW
// =====================================================

function InfoRow({
  icon,
  iconClass,
  label,
  value,
  action = null,
}) {
  return (
    <div
      className="
        grid
        grid-cols-[42px_minmax(0,1fr)_auto]
        items-center
        gap-3
        py-4
      "
    >

      <div
        className={`
          w-10
          h-10
          rounded-xl
          flex
          items-center
          justify-center
          ${iconClass}
        `}
      >
        <span
          className="
            material-symbols-outlined
            text-[20px]
          "
        >
          {icon}
        </span>
      </div>


      <div className="min-w-0">

        <div
          className="
            text-xs
            text-on-surface-variant
          "
        >
          {label}
        </div>


        <div
          className="
            text-sm
            font-bold
            text-on-surface
            mt-0.5
            break-words
          "
        >
          {value}
        </div>

      </div>


      {action}

    </div>
  );
}


// =====================================================
// ACADEMIC CARD
// =====================================================

function AcademicCard({
  icon,
  iconClass,
  cardClass,
  label,
  value,
}) {
  return (
    <div
      className={`
        rounded-xl
        border
        border-outline-variant
        bg-gradient-to-br
        ${cardClass}
        p-4
        flex
        items-center
        gap-3
      `}
    >

      <div
        className={`
          w-11
          h-11
          rounded-xl
          flex
          items-center
          justify-center
          shrink-0
          ${iconClass}
        `}
      >
        <span className="material-symbols-outlined">
          {icon}
        </span>
      </div>


      <div className="min-w-0">

        <div
          className="
            text-xs
            text-on-surface-variant
          "
        >
          {label}
        </div>


        <div
          className="
            text-sm
            font-bold
            text-on-surface
            mt-1
            break-words
          "
        >
          {value}
        </div>

      </div>

    </div>
  );
}


// =====================================================
// ACTION BUTTON
// =====================================================

function ActionButton({
  icon,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="
        min-h-[92px]
        rounded-xl
        border
        border-outline-variant
        bg-surface-container-low
        hover:bg-primary-fixed/35
        hover:border-primary/20
        transition-all
        flex
        flex-col
        items-center
        justify-center
        gap-2
        text-center
        px-2
      "
    >

      <span
        className="
          material-symbols-outlined
          text-primary
        "
      >
        {icon}
      </span>


      <span
        className="
          text-xs
          font-semibold
          text-on-surface
        "
      >
        {label}
      </span>

    </button>
  );
}


// =====================================================
// DETAIL ITEM
// =====================================================

function DetailItem({
  icon,
  label,
  value,
}) {
  return (
    <div
      className="
        flex
        items-start
        gap-3
        py-3
        border-b
        border-outline-variant
      "
    >

      <span
        className="
          material-symbols-outlined
          text-primary
          text-[20px]
          mt-0.5
        "
      >
        {icon}
      </span>


      <div className="min-w-0">

        <div
          className="
            text-xs
            text-on-surface-variant
          "
        >
          {label}
        </div>


        <div
          className="
            text-sm
            font-semibold
            text-on-surface
            mt-1
            break-words
          "
        >
          {value}
        </div>

      </div>

    </div>
  );
}


// =====================================================
// SECURITY NOTE
// =====================================================

function SecurityNote({
  children,
}) {
  return (
    <div
      className="
        flex
        items-start
        gap-2
      "
    >

      <span
        className="
          w-1.5
          h-1.5
          rounded-full
          bg-primary
          mt-[7px]
          shrink-0
        "
      />


      <span>
        {children}
      </span>

    </div>
  );
}