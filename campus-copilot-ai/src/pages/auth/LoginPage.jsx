import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router";

import {
  authService,
} from "../../services/api";

export default function LoginPage() {
  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // =====================================================
  // LOGIN
  // =====================================================

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      setLoading(true);
      setError("");

      try {
        const data =
          await authService.login(
            email,
            password
          );

        const role =
          String(
            data.user?.role ||
              ""
          )
            .trim()
            .toLowerCase();

        if (!role) {
          throw new Error(
            "Login succeeded, but no user role was returned."
          );
        }

        // -----------------------------------------------
        // ROLE BASED REDIRECT
        // -----------------------------------------------

        navigate(
          role === "admin"
            ? "/admin"
            : "/dashboard",
          {
            replace: true,
          }
        );
      } catch (err) {
        setError(
          err.message ||
            "Failed to log in. Check credentials."
        );
      } finally {
        setLoading(false);
      }
    };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        {/* TOP ACCENT */}

        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-tertiary" />

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-2xl mb-3 shadow-md">
            <span className="material-symbols-outlined text-[32px]">
              school
            </span>
          </div>

          <h1 className="font-headline-lg font-bold text-primary text-center">
            Welcome Back
          </h1>

          <p className="font-body-sm text-on-surface-variant text-center mt-1">
            Sign in to access your
            student copilot & academic
            hub
          </p>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container text-xs rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-base shrink-0">
              error
            </span>

            <span>
              {error}
            </span>
          </div>
        )}

        {/* =================================================
            LOGIN FORM
        ================================================= */}

        <form
          onSubmit={
            handleSubmit
          }
          className="flex flex-col gap-4"
        >
          {/* EMAIL */}

          <div>
            <label
              htmlFor="login-email"
              className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider"
            >
              University Email
            </label>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                mail
              </span>

              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(
                  e
                ) => {
                  setEmail(
                    e.target.value
                  );

                  setError("");
                }}
                placeholder="student@campus.edu or admin@campus.edu"
                disabled={
                  loading
                }
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* PASSWORD */}

          <div>
            <label
              htmlFor="login-password"
              className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider"
            >
              Password
            </label>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                lock
              </span>

              <input
                id="login-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                required
                autoComplete="current-password"
                value={
                  password
                }
                onChange={(
                  e
                ) => {
                  setPassword(
                    e.target.value
                  );

                  setError("");
                }}
                placeholder="••••••••"
                disabled={
                  loading
                }
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60"
              />

              {/* SHOW / HIDE PASSWORD */}

              <button
                type="button"
                onClick={() =>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors flex items-center disabled:opacity-50"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                <span className="material-symbols-outlined text-[19px]">
                  {showPassword
                    ? "visibility_off"
                    : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* =================================================
              REMEMBER + FORGOT PASSWORD
          ================================================= */}

          <div className="flex items-center justify-between gap-3 text-xs mt-1">
            <label className="flex items-center gap-1.5 text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-outline-variant text-primary"
                defaultChecked
              />

              Remember me
            </label>

            <Link
              to="/forgot-password"
              className="text-primary font-semibold hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* =================================================
              LOGIN BUTTON
          ================================================= */}

          <button
            type="submit"
            disabled={
              loading
            }
            className="w-full py-3 mt-2 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary-container transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>

                Signing in...
              </>
            ) : (
              <>
                Sign In to
                CampusCopilot

                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </form>

        {/* =================================================
            REGISTER
        ================================================= */}

        <div className="mt-6 pt-6 border-t border-surface-variant text-center">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Don't have an
            account?{" "}

            <Link
              to="/register"
              className="text-primary font-bold hover:underline"
            >
              Create Student
              Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}