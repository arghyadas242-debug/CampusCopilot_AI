import { useState } from "react";
import { Link, useNavigate } from "react-router";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Navigate to student dashboard
    navigate("/dashboard");
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop">
      {/* Login Container */}
      <main className="w-full max-w-md bg-surface-container-lowest border border-surface-container-high rounded-xl p-md md:p-lg flex flex-col gap-lg shadow-sm relative overflow-hidden">
        {/* Header */}
        <header className="flex flex-col items-center text-center gap-sm z-10">
          <div className="h-12 w-12 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container mb-2">
            <span className="material-symbols-outlined" style={{ fontSize: "28px", fontVariationSettings: "'FILL' 1" }}>
              school
            </span>
          </div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-primary tracking-tight font-bold">
            CampusCopilot
          </h1>
          <p className="font-body-sm text-on-surface-variant">Sign in to access your academic dashboard.</p>
        </header>

        {/* Form Section */}
        <section className="flex flex-col gap-md z-10 w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-md">
            <div className="flex flex-col gap-xs">
              <label className="font-label-caps text-on-surface uppercase tracking-wider" htmlFor="email">
                Email Address
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline" style={{ fontSize: "20px" }}>
                  mail
                </span>
                <input
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-lg pl-10 pr-sm py-3 font-body-sm text-on-surface placeholder-outline focus:border-primary focus:ring-2 focus:ring-primary-container transition-all outline-none"
                  id="email"
                  name="email"
                  placeholder="student@campus.edu"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <div className="flex justify-between items-center">
                <label className="font-label-caps text-on-surface uppercase tracking-wider" htmlFor="password">
                  Password
                </label>
                <a className="font-body-sm text-primary hover:text-primary-container transition-colors" href="#">
                  Forgot password?
                </a>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline" style={{ fontSize: "20px" }}>
                  lock
                </span>
                <input
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-lg pl-10 pr-sm py-3 font-body-sm text-on-surface placeholder-outline focus:border-primary focus:ring-2 focus:ring-primary-container transition-all outline-none"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              className="w-full bg-primary text-on-primary font-title-md py-3 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors mt-2 flex justify-center items-center gap-sm cursor-pointer shadow-md"
              type="submit"
            >
              Login
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                arrow_forward
              </span>
            </button>
          </form>

          {/* Secondary Actions */}
          <div className="text-center mt-sm">
            <p className="font-body-sm text-on-surface-variant">
              Don't have an account?{" "}
              <Link className="text-primary hover:underline font-title-md font-semibold" to="/register">
                Create account
              </Link>
            </p>
          </div>
        </section>

        {/* Footer / Trust Badges */}
        <footer className="mt-4 pt-md border-t border-surface-container-high flex flex-col items-center justify-center gap-xs z-10 w-full text-center">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              shield
            </span>
            <span className="font-mono-sm text-outline">Secured by Firebase Authentication</span>
          </div>
        </footer>

        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container rounded-full opacity-5 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-tertiary-container rounded-full opacity-5 blur-3xl pointer-events-none"></div>
      </main>
    </div>
  );
}
