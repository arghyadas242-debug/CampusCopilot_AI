import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

const API_URL = "http://localhost:5000";

const INITIAL_RESEND_SECONDS = 60;

export default function ForgotPassword() {
  const navigate = useNavigate();

  // =====================================================
  // FLOW STATE
  //
  // 1 = email
  // 2 = OTP
  // 3 = new password
  // 4 = success
  // =====================================================

  const [step, setStep] = useState(1);

  // =====================================================
  // FORM STATE
  // =====================================================

  const [email, setEmail] = useState("");

  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  // =====================================================
  // REQUEST STATE
  // =====================================================

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  // =====================================================
  // RESEND TIMER
  // =====================================================

  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendSeconds(
        (previous) =>
          Math.max(
            0,
            previous - 1
          )
      );
    }, 1000);

    return () =>
      clearInterval(timer);
  }, [resendSeconds]);

  // =====================================================
  // HELPERS
  // =====================================================

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const normalizeEmail = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const validEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    );

  const readResponse = async (
    response
  ) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  // =====================================================
  // STEP 1
  // SEND OTP
  // =====================================================

  const handleSendOtp = async (
    event
  ) => {
    event.preventDefault();

    clearMessages();

    const cleanEmail =
      normalizeEmail(email);

    if (!cleanEmail) {
      setError(
        "Please enter your registered email address."
      );

      return;
    }

    if (
      !validEmail(cleanEmail)
    ) {
      setError(
        "Please enter a valid email address."
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          `${API_URL}/api/auth/forgot-password`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                cleanEmail,
            }),
          }
        );

      const data =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to send the reset code."
        );
      }

      setEmail(cleanEmail);

      setMessage(
        data.message ||
          "If an account exists for this email, a password reset code has been sent."
      );

      setResendSeconds(
        INITIAL_RESEND_SECONDS
      );

      setStep(2);
    } catch (err) {
      console.error(
        "Forgot password request error:",
        err
      );

      setError(
        err.message ||
          "Unable to send the reset code."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESEND OTP
  // =====================================================

  const handleResendOtp =
    async () => {
      if (
        loading ||
        resendSeconds > 0
      ) {
        return;
      }

      clearMessages();

      try {
        setLoading(true);

        const response =
          await fetch(
            `${API_URL}/api/auth/forgot-password`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    email,
                  }
                ),
            }
          );

        const data =
          await readResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to resend the code."
          );
        }

        /*
          A newly generated OTP invalidates
          the previous one.
        */
        setOtp("");

        setMessage(
          "A new verification code has been sent."
        );

        setResendSeconds(
          INITIAL_RESEND_SECONDS
        );
      } catch (err) {
        console.error(
          "OTP resend error:",
          err
        );

        setError(
          err.message ||
            "Unable to resend the code."
        );
      } finally {
        setLoading(false);
      }
    };

  // =====================================================
  // OTP INPUT
  // =====================================================

  const handleOtpChange = (
    event
  ) => {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 6);

    setOtp(value);

    setError("");
  };

  // =====================================================
  // STEP 2
  // VERIFY OTP
  // =====================================================

  const handleVerifyOtp =
    async (event) => {
      event.preventDefault();

      clearMessages();

      if (
        !/^\d{6}$/.test(
          otp
        )
      ) {
        setError(
          "Please enter the 6-digit verification code."
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            `${API_URL}/api/auth/verify-reset-otp`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    email,
                    otp,
                  }
                ),
            }
          );

        const data =
          await readResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to verify the code."
          );
        }

        setMessage(
          "Email verified successfully. Create your new password."
        );

        setStep(3);
      } catch (err) {
        console.error(
          "OTP verification error:",
          err
        );

        setError(
          err.message ||
            "Unable to verify the code."
        );
      } finally {
        setLoading(false);
      }
    };

  // =====================================================
  // STEP 3
  // RESET PASSWORD
  // =====================================================

  const handleResetPassword =
    async (event) => {
      event.preventDefault();

      clearMessages();

      if (!newPassword) {
        setError(
          "Please enter a new password."
        );

        return;
      }

      if (
        newPassword.length < 6
      ) {
        setError(
          "Password must contain at least 6 characters."
        );

        return;
      }

      if (
        newPassword.length >
        128
      ) {
        setError(
          "Password must not exceed 128 characters."
        );

        return;
      }

      if (!confirmPassword) {
        setError(
          "Please confirm your new password."
        );

        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setError(
          "New password and confirmation do not match."
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            `${API_URL}/api/auth/reset-password`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    email,
                    otp,

                    newPassword,
                  }
                ),
            }
          );

        const data =
          await readResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to reset your password."
          );
        }

        setNewPassword("");
        setConfirmPassword("");

        setMessage(
          data.message ||
            "Password reset successfully."
        );

        setStep(4);
      } catch (err) {
        console.error(
          "Password reset error:",
          err
        );

        setError(
          err.message ||
            "Unable to reset your password."
        );
      } finally {
        setLoading(false);
      }
    };

  // =====================================================
  // CHANGE EMAIL
  // =====================================================

  const handleChangeEmail = () => {
    setStep(1);

    setOtp("");

    setNewPassword("");

    setConfirmPassword("");

    setResendSeconds(0);

    clearMessages();
  };

  // =====================================================
  // STEP INDICATOR
  // =====================================================

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map(
        (item, index) => {
          const completed =
            step > item;

          const active =
            step === item;

          return (
            <div
              key={item}
              className="flex items-center"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  completed
                    ? "bg-secondary text-on-secondary"
                    : active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-outline"
                }`}
              >
                {completed ? (
                  <span className="material-symbols-outlined text-[18px]">
                    check
                  </span>
                ) : (
                  item
                )}
              </div>

              {index < 2 && (
                <div
                  className={`w-12 sm:w-16 h-[2px] ${
                    step >
                    item
                      ? "bg-secondary"
                      : "bg-outline-variant"
                  }`}
                />
              )}
            </div>
          );
        }
      )}
    </div>
  );

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-background flex">
      {/* =================================================
          LEFT BRAND PANEL
      ================================================= */}

      <aside className="hidden lg:flex lg:w-[46%] bg-primary text-on-primary p-12 xl:p-16 flex-col justify-between">
        <div>
          <Link
            to="/login"
            className="inline-flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-on-primary text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">
                school
              </span>
            </div>

            <div>
              <h1 className="text-xl font-bold">
                CampusCopilot
              </h1>

              <p className="text-xs text-on-primary/70">
                AI-powered student
                companion
              </p>
            </div>
          </Link>
        </div>

        <div className="max-w-lg">
          <div className="w-14 h-14 rounded-2xl bg-on-primary/10 border border-on-primary/20 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[30px]">
              lock_reset
            </span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold leading-tight">
            Recover your account
            securely.
          </h2>

          <p className="mt-4 text-on-primary/75 text-base leading-7">
            Verify your registered
            email with a one-time code,
            then securely create a new
            CampusCopilot password.
          </p>
        </div>

        <p className="text-xs text-on-primary/60">
          CampusCopilot • Secure
          Academic Access
        </p>
      </aside>

      {/* =================================================
          FORM AREA
      ================================================= */}

      <main className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[460px]">
          {/* MOBILE BRAND */}

          <div className="lg:hidden mb-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined">
                  school
                </span>
              </div>

              <div>
                <div className="font-bold text-primary text-lg">
                  CampusCopilot
                </div>

                <div className="text-xs text-outline">
                  Student Intelligence
                  Platform
                </div>
              </div>
            </Link>
          </div>

          {/* STEP INDICATOR */}

          {step !== 4 && (
            <StepIndicator />
          )}

          {/* =============================================
              STEP 1 — EMAIL
          ============================================= */}

          {step === 1 && (
            <>
              <div className="mb-7">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">
                    mail
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-on-surface">
                  Forgot your
                  password?
                </h2>

                <p className="mt-2 text-sm text-on-surface-variant leading-6">
                  Enter the email
                  associated with your
                  CampusCopilot account.
                  We will send you a
                  6-digit verification
                  code.
                </p>
              </div>

              <MessageBox
                error={error}
                message={message}
              />

              <form
                onSubmit={
                  handleSendOtp
                }
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-semibold text-on-surface mb-2"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      alternate_email
                    </span>

                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(
                        event
                      ) => {
                        setEmail(
                          event.target
                            .value
                        );

                        setError("");
                      }}
                      autoComplete="email"
                      placeholder="Enter your registered email"
                      disabled={loading}
                      className="w-full h-12 rounded-xl border border-outline-variant bg-surface pl-11 pr-4 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-primary text-on-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[19px]">
                        progress_activity
                      </span>

                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Code

                      <span className="material-symbols-outlined text-[19px]">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* =============================================
              STEP 2 — VERIFY OTP
          ============================================= */}

          {step === 2 && (
            <>
              <div className="mb-7">
                <div className="w-12 h-12 rounded-xl bg-secondary-container text-secondary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">
                    verified_user
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-on-surface">
                  Verify your email
                </h2>

                <p className="mt-2 text-sm text-on-surface-variant leading-6">
                  Enter the 6-digit
                  verification code sent
                  to{" "}
                  <span className="font-semibold text-on-surface">
                    {email}
                  </span>
                  .
                </p>
              </div>

              <MessageBox
                error={error}
                message={message}
              />

              <form
                onSubmit={
                  handleVerifyOtp
                }
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="reset-otp"
                    className="block text-sm font-semibold text-on-surface mb-2"
                  >
                    Verification code
                  </label>

                  <input
                    id="reset-otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={
                      handleOtpChange
                    }
                    autoComplete="one-time-code"
                    placeholder="000000"
                    disabled={loading}
                    className="w-full h-14 rounded-xl border border-outline-variant bg-surface px-4 text-center text-2xl font-bold tracking-[0.45em] text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
                  />

                  <p className="text-xs text-outline mt-2">
                    The code expires
                    after 10 minutes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    otp.length !== 6
                  }
                  className="w-full h-12 rounded-xl bg-primary text-on-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Verifying..."
                    : "Verify Code"}
                </button>
              </form>

              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={
                    handleChangeEmail
                  }
                  disabled={loading}
                  className="text-on-surface-variant hover:text-primary font-medium"
                >
                  Change email
                </button>

                <button
                  type="button"
                  onClick={
                    handleResendOtp
                  }
                  disabled={
                    loading ||
                    resendSeconds > 0
                  }
                  className="font-semibold text-primary disabled:text-outline disabled:cursor-not-allowed"
                >
                  {resendSeconds > 0
                    ? `Resend code in ${resendSeconds}s`
                    : "Resend code"}
                </button>
              </div>
            </>
          )}

          {/* =============================================
              STEP 3 — PASSWORD
          ============================================= */}

          {step === 3 && (
            <>
              <div className="mb-7">
                <div className="w-12 h-12 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">
                    password
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-on-surface">
                  Create new password
                </h2>

                <p className="mt-2 text-sm text-on-surface-variant leading-6">
                  Your email has been
                  verified. Choose a new
                  password for your
                  CampusCopilot account.
                </p>
              </div>

              <MessageBox
                error={error}
                message={message}
              />

              <form
                onSubmit={
                  handleResetPassword
                }
                className="space-y-5"
              >
                {/* NEW PASSWORD */}

                <PasswordInput
                  id="new-password"
                  label="New password"
                  value={
                    newPassword
                  }
                  onChange={(
                    event
                  ) => {
                    setNewPassword(
                      event.target
                        .value
                    );

                    setError("");
                  }}
                  visible={
                    showPassword
                  }
                  onToggle={() =>
                    setShowPassword(
                      (
                        previous
                      ) =>
                        !previous
                    )
                  }
                  disabled={
                    loading
                  }
                />

                {/* CONFIRM */}

                <PasswordInput
                  id="confirm-password"
                  label="Confirm new password"
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event
                  ) => {
                    setConfirmPassword(
                      event.target
                        .value
                    );

                    setError("");
                  }}
                  visible={
                    showConfirmPassword
                  }
                  onToggle={() =>
                    setShowConfirmPassword(
                      (
                        previous
                      ) =>
                        !previous
                    )
                  }
                  disabled={
                    loading
                  }
                />

                <div className="rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant flex items-start gap-2">
                  <span className="material-symbols-outlined text-[17px] text-primary shrink-0">
                    info
                  </span>

                  Your new password
                  must contain at least
                  6 characters and
                  cannot be the same as
                  your current
                  password.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-primary text-on-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[19px]">
                        progress_activity
                      </span>

                      Resetting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[19px]">
                        lock_reset
                      </span>

                      Reset Password
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* =============================================
              STEP 4 — SUCCESS
          ============================================= */}

          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-secondary-container text-secondary mx-auto flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[42px]">
                  check_circle
                </span>
              </div>

              <h2 className="text-2xl font-bold text-on-surface">
                Password reset
                successful
              </h2>

              <p className="mt-3 text-sm text-on-surface-variant leading-6 max-w-sm mx-auto">
                Your CampusCopilot
                password has been
                updated. You can now
                sign in using your new
                password.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/login",
                    {
                      replace:
                        true,
                    }
                  )
                }
                className="mt-7 w-full h-12 rounded-xl bg-primary text-on-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors"
              >
                Back to Login

                <span className="material-symbols-outlined text-[19px]">
                  login
                </span>
              </button>
            </div>
          )}

          {/* LOGIN LINK */}

          {step !== 4 && (
            <div className="mt-8 pt-6 border-t border-outline-variant text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-[18px]">
                  arrow_back
                </span>

                Back to Login
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// =====================================================
// PASSWORD INPUT
// =====================================================

function PasswordInput({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  disabled,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-on-surface mb-2"
      >
        {label}
      </label>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
          lock
        </span>

        <input
          id={id}
          type={
            visible
              ? "text"
              : "password"
          }
          value={value}
          onChange={onChange}
          autoComplete="new-password"
          disabled={disabled}
          className="w-full h-12 rounded-xl border border-outline-variant bg-surface pl-11 pr-12 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary flex"
          aria-label={
            visible
              ? "Hide password"
              : "Show password"
          }
        >
          <span className="material-symbols-outlined text-[20px]">
            {visible
              ? "visibility_off"
              : "visibility"}
          </span>
        </button>
      </div>
    </div>
  );
}

// =====================================================
// MESSAGE BOX
// =====================================================

function MessageBox({
  error,
  message,
}) {
  if (!error && !message) {
    return null;
  }

  if (error) {
    return (
      <div className="mb-5 rounded-xl border border-error/30 bg-error-container/30 px-4 py-3 text-sm text-error flex items-start gap-2">
        <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">
          error
        </span>

        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-secondary/20 bg-secondary-container/30 px-4 py-3 text-sm text-secondary flex items-start gap-2">
      <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">
        check_circle
      </span>

      <span>{message}</span>
    </div>
  );
}