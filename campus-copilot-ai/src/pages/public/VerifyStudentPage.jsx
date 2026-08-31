import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router";


const API_URL =
  "http://localhost:5000";


// =====================================================
// HELPERS
// =====================================================

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


function getInitials(name) {
  const parts =
    String(name || "")
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


// =====================================================
// PAGE
// =====================================================

export default function VerifyStudentPage() {
  const {
    token,
  } = useParams();


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    verification,
    setVerification,
  ] = useState(null);


  const [
    status,
    setStatus,
  ] = useState(
    "loading"
  );


  const [
    error,
    setError,
  ] = useState("");


  // ===================================================
  // VERIFY TOKEN
  // ===================================================

  useEffect(() => {
    async function verifyStudent() {
      if (!token) {
        setStatus(
          "invalid"
        );

        setLoading(
          false
        );

        return;
      }


      try {
        setLoading(true);

        setStatus(
          "loading"
        );

        setError("");


        const response =
          await fetch(
            `${API_URL}/api/student-id/verify/${encodeURIComponent(
              token
            )}`
          );


        let data;


        try {
          data =
            await response.json();

        } catch {
          throw new Error(
            "The verification server returned an invalid response."
          );
        }


        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Student verification could not be completed."
          );
        }


        if (
          data?.valid !==
          true
        ) {
          setVerification(
            null
          );

          setStatus(
            "invalid"
          );

          return;
        }


        if (
          !data?.student ||
          !data.student
            .studentRoll ||
          !data.student.name
        ) {
          throw new Error(
            "The verification response is incomplete."
          );
        }


        setVerification(
          data
        );


        setStatus(
          "valid"
        );

      } catch (err) {
        console.error(
          "Student verification error:",
          err
        );


        setVerification(
          null
        );


        setStatus(
          "error"
        );


        setError(
          err.message ||
            "Unable to verify this Student ID."
        );

      } finally {
        setLoading(
          false
        );
      }
    }


    verifyStudent();

  }, [token]);


  // ===================================================
  // LOADING
  // ===================================================

  if (
    loading ||
    status ===
      "loading"
  ) {
    return (
      <div
        className="
          min-h-screen
          bg-[#f7f9fb]
          flex
          items-center
          justify-center
          px-4
          py-10
        "
      >

        <div
          className="
            w-full
            max-w-[520px]
            rounded-[28px]
            border
            border-[#c5c5d3]
            bg-white
            px-6
            py-14
            text-center
          "
        >

          <div
            className="
              w-16
              h-16
              rounded-2xl
              bg-[#e7ecff]
              text-[#00236f]
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
                animate-spin
              "
            >
              progress_activity
            </span>

          </div>


          <h1
            className="
              text-xl
              font-bold
              text-[#191c1e]
              mt-5
            "
          >
            Verifying Student Identity
          </h1>


          <p
            className="
              text-sm
              leading-6
              text-[#444651]
              mt-2
            "
          >
            CampusCopilot is securely checking this verification code.
          </p>

        </div>

      </div>
    );
  }


  // ===================================================
  // INVALID / EXPIRED / REVOKED
  // ===================================================

  if (
    status ===
    "invalid"
  ) {
    return (
      <VerificationFailure
        type="invalid"
      />
    );
  }


  // ===================================================
  // SYSTEM ERROR
  // ===================================================

  if (
    status ===
    "error"
  ) {
    return (
      <VerificationFailure
        type="error"
        message={error}
      />
    );
  }


  // ===================================================
  // VERIFIED
  // ===================================================

  const student =
    verification.student;


  const verificationInfo =
    verification.verification ||
    {};


  const initials =
    getInitials(
      student.name
    );


  const expiresAt =
    formatDate(
      verificationInfo.expiresAt
    );


  const verifiedAt =
    formatDate(
      verificationInfo.verifiedAt
    );


  return (
    <div
      className="
        min-h-screen
        bg-[#f7f9fb]
        px-4
        py-8
        sm:py-12
      "
    >

      <div
        className="
          w-full
          max-w-[620px]
          mx-auto
        "
      >

        {/* =================================================
            BRAND
        ================================================== */}

        <div
          className="
            flex
            items-center
            justify-center
            gap-3
            mb-6
          "
        >

          <div
            className="
              w-10
              h-10
              rounded-xl
              bg-[#00236f]
              text-white
              flex
              items-center
              justify-center
            "
          >
            <span
              className="
                material-symbols-outlined
                text-[23px]
              "
            >
              school
            </span>
          </div>


          <div>

            <div
              className="
                text-[10px]
                tracking-[0.14em]
                font-bold
                uppercase
                text-[#757682]
              "
            >
              CampusCopilot
            </div>


            <div
              className="
                text-sm
                font-bold
                text-[#00236f]
              "
            >
              Student Identity Verification
            </div>

          </div>

        </div>


        {/* =================================================
            VERIFIED CARD
        ================================================== */}

        <section
          className="
            rounded-[28px]
            border
            border-[#c5c5d3]
            bg-white
            overflow-hidden
            shadow-[0_18px_50px_rgba(0,35,111,0.08)]
          "
        >

          {/* STATUS HEADER */}

          <div
            className="
              bg-gradient-to-br
              from-[#004e48]
              via-[#006a61]
              to-[#008577]
              px-6
              py-8
              text-white
              text-center
            "
          >

            <div
              className="
                w-16
                h-16
                rounded-full
                border
                border-white/30
                bg-white/15
                mx-auto
                flex
                items-center
                justify-center
              "
            >

              <span
                className="
                  material-symbols-outlined
                  text-[36px]
                "
                style={{
                  fontVariationSettings:
                    "'FILL' 1",
                }}
              >
                verified
              </span>

            </div>


            <h1
              className="
                text-2xl
                font-bold
                mt-4
              "
            >
              Student Identity Verified
            </h1>


            <p
              className="
                text-sm
                text-white/80
                mt-2
              "
            >
              This QR code matches an active CampusCopilot student verification record.
            </p>

          </div>


          {/* STUDENT IDENTITY */}

          <div
            className="
              px-5
              sm:px-8
              py-7
            "
          >

            <div
              className="
                flex
                flex-col
                sm:flex-row
                sm:items-center
                gap-4
                pb-6
                border-b
                border-[#e1e2ea]
              "
            >

              <div
                className="
                  w-20
                  h-20
                  rounded-2xl
                  bg-[#e7ecff]
                  text-[#00236f]
                  flex
                  items-center
                  justify-center
                  text-2xl
                  font-bold
                  shrink-0
                "
              >
                {initials}
              </div>


              <div className="min-w-0">

                <div
                  className="
                    text-[10px]
                    tracking-[0.12em]
                    font-bold
                    text-[#006a61]
                    uppercase
                  "
                >
                  Verified Student
                </div>


                <h2
                  className="
                    text-[22px]
                    font-bold
                    text-[#191c1e]
                    mt-1
                  "
                >
                  {student.name}
                </h2>


                <p
                  className="
                    text-sm
                    text-[#444651]
                    mt-1
                  "
                >
                  {student.department}
                </p>

              </div>

            </div>


            {/* DETAILS */}

            <div
              className="
                divide-y
                divide-[#e1e2ea]
              "
            >

              <VerifiedRow
                icon="badge"
                label="Student ID"
                value={
                  student.studentRoll
                }
              />


              <VerifiedRow
                icon="account_balance"
                label="Department"
                value={
                  student.department ||
                  "Not available"
                }
              />


              <VerifiedRow
                icon="event_note"
                label="Semester"
                value={
                  student.semester !==
                    null &&
                  student.semester !==
                    undefined
                    ? `Semester ${student.semester}`
                    : "Not available"
                }
              />


              <VerifiedRow
                icon="groups"
                label="Section"
                value={
                  student.section
                    ? `Section ${student.section}`
                    : "Not available"
                }
              />

            </div>


            {/* VERIFICATION INFO */}

            <div
              className="
                rounded-2xl
                bg-[#eef8f6]
                border
                border-[#b7ddd7]
                p-4
                mt-6
              "
            >

              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >

                <div
                  className="
                    w-10
                    h-10
                    rounded-xl
                    bg-[#d1f4ec]
                    text-[#006a61]
                    flex
                    items-center
                    justify-center
                    shrink-0
                  "
                >
                  <span
                    className="
                      material-symbols-outlined
                      text-[21px]
                    "
                  >
                    shield
                  </span>
                </div>


                <div>

                  <div
                    className="
                      text-sm
                      font-bold
                      text-[#004e48]
                    "
                  >
                    Secure verification
                  </div>


                  <p
                    className="
                      text-xs
                      leading-5
                      text-[#3e625e]
                      mt-1
                    "
                  >
                    This identity was validated through an active secure verification token.
                  </p>

                </div>

              </div>


              {(verifiedAt ||
                expiresAt) && (

                <div
                  className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    gap-3
                    mt-4
                  "
                >

                  {verifiedAt && (

                    <div
                      className="
                        rounded-xl
                        bg-white/80
                        px-3
                        py-2.5
                      "
                    >

                      <div
                        className="
                          text-[10px]
                          uppercase
                          font-bold
                          tracking-wide
                          text-[#757682]
                        "
                      >
                        Checked At
                      </div>

                      <div
                        className="
                          text-xs
                          font-semibold
                          text-[#191c1e]
                          mt-1
                        "
                      >
                        {verifiedAt}
                      </div>

                    </div>

                  )}


                  {expiresAt && (

                    <div
                      className="
                        rounded-xl
                        bg-white/80
                        px-3
                        py-2.5
                      "
                    >

                      <div
                        className="
                          text-[10px]
                          uppercase
                          font-bold
                          tracking-wide
                          text-[#757682]
                        "
                      >
                        Valid Until
                      </div>

                      <div
                        className="
                          text-xs
                          font-semibold
                          text-[#191c1e]
                          mt-1
                        "
                      >
                        {expiresAt}
                      </div>

                    </div>

                  )}

                </div>

              )}

            </div>


            {/* PRIVACY NOTE */}

            <div
              className="
                flex
                items-start
                gap-2
                mt-5
                px-1
                text-[11px]
                leading-5
                text-[#757682]
              "
            >

              <span
                className="
                  material-symbols-outlined
                  text-[17px]
                  text-[#00236f]
                  shrink-0
                "
              >
                lock
              </span>


              <span>
                Only limited academic identity information is displayed. Private information such as email, attendance, assignments and examination results is not exposed.
              </span>

            </div>

          </div>


          {/* FOOTER */}

          <div
            className="
              border-t
              border-[#e1e2ea]
              bg-[#f2f4f6]
              px-5
              py-4
              flex
              items-center
              justify-center
              gap-2
              text-xs
              font-semibold
              text-[#444651]
            "
          >

            <span
              className="
                material-symbols-outlined
                text-[17px]
                text-[#006a61]
              "
            >
              verified_user
            </span>

            Verified by CampusCopilot

          </div>

        </section>


        {/* =================================================
            BOTTOM LABEL
        ================================================== */}

        <p
          className="
            text-center
            text-[11px]
            text-[#757682]
            mt-5
          "
        >
          CampusCopilot Digital Student Identity
        </p>

      </div>

    </div>
  );
}


// =====================================================
// VERIFIED ROW
// =====================================================

function VerifiedRow({
  icon,
  label,
  value,
}) {
  return (
    <div
      className="
        grid
        grid-cols-[42px_minmax(0,1fr)]
        gap-3
        items-center
        py-4
      "
    >

      <div
        className="
          w-10
          h-10
          rounded-xl
          bg-[#f2f4f6]
          text-[#00236f]
          flex
          items-center
          justify-center
        "
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
            text-[#757682]
          "
        >
          {label}
        </div>


        <div
          className="
            text-sm
            font-bold
            text-[#191c1e]
            mt-0.5
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
// FAILURE PAGE
// =====================================================

function VerificationFailure({
  type,
  message = "",
}) {
  const isSystemError =
    type ===
    "error";


  return (
    <div
      className="
        min-h-screen
        bg-[#f7f9fb]
        flex
        items-center
        justify-center
        px-4
        py-10
      "
    >

      <div
        className="
          w-full
          max-w-[520px]
          rounded-[28px]
          border
          border-[#c5c5d3]
          bg-white
          overflow-hidden
          shadow-[0_18px_50px_rgba(0,35,111,0.07)]
        "
      >

        <div
          className={`
            px-6
            py-9
            text-center
            text-white

            ${
              isSystemError
                ? "bg-gradient-to-br from-[#8a4b00] to-[#b96800]"
                : "bg-gradient-to-br from-[#8c1d18] to-[#ba1a1a]"
            }
          `}
        >

          <div
            className="
              w-16
              h-16
              rounded-full
              bg-white/15
              border
              border-white/25
              mx-auto
              flex
              items-center
              justify-center
            "
          >
            <span
              className="
                material-symbols-outlined
                text-[35px]
              "
            >
              {isSystemError
                ? "warning"
                : "gpp_bad"}
            </span>
          </div>


          <h1
            className="
              text-2xl
              font-bold
              mt-4
            "
          >
            {isSystemError
              ? "Verification Unavailable"
              : "Student ID Not Verified"}
          </h1>

        </div>


        <div
          className="
            px-6
            sm:px-8
            py-8
            text-center
          "
        >

          <h2
            className="
              text-lg
              font-bold
              text-[#191c1e]
            "
          >
            {isSystemError
              ? "We could not complete this verification."
              : "This verification code is not currently valid."}
          </h2>


          <p
            className="
              text-sm
              leading-6
              text-[#444651]
              mt-3
            "
          >
            {isSystemError
              ? (
                  message ||
                  "The CampusCopilot verification service could not be reached."
                )
              : "The QR code may have expired, been revoked, been replaced with a newer QR, or may not be a valid CampusCopilot verification code."}
          </p>


          <div
            className="
              rounded-2xl
              bg-[#f2f4f6]
              p-4
              text-left
              mt-6
            "
          >

            <div
              className="
                flex
                items-start
                gap-3
              "
            >

              <span
                className="
                  material-symbols-outlined
                  text-[#00236f]
                  text-[21px]
                  shrink-0
                "
              >
                info
              </span>


              <div>

                <div
                  className="
                    text-sm
                    font-bold
                    text-[#191c1e]
                  "
                >
                  What should I do?
                </div>


                <p
                  className="
                    text-xs
                    leading-5
                    text-[#444651]
                    mt-1
                  "
                >
                  Ask the student to open their current CampusCopilot Digital Student ID and scan the active QR displayed there.
                </p>

              </div>

            </div>

          </div>


          {isSystemError && (

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="
                mt-6
                h-11
                px-5
                rounded-xl
                bg-[#00236f]
                text-white
                text-sm
                font-semibold
                inline-flex
                items-center
                gap-2
                hover:opacity-90
              "
            >

              <span
                className="
                  material-symbols-outlined
                  text-[18px]
                "
              >
                refresh
              </span>

              Try Again

            </button>

          )}

        </div>


        <div
          className="
            border-t
            border-[#e1e2ea]
            bg-[#f2f4f6]
            px-5
            py-4
            text-center
            text-xs
            font-semibold
            text-[#444651]
          "
        >
          CampusCopilot Student Identity Verification
        </div>

      </div>

    </div>
  );
}