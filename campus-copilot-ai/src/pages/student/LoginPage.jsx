import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { authService } from "../../services/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await authService.login(email, password);
      if (data.user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Failed to log in. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setError("");

    try {
      const data = await authService.login(demoEmail, demoPass);
      if (data.user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-tertiary" />

        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-2xl mb-3 shadow-md">
            <span className="material-symbols-outlined text-[32px]">school</span>
          </div>
          <h1 className="font-headline-lg font-bold text-primary text-center">Welcome Back</h1>
          <p className="font-body-sm text-on-surface-variant text-center mt-1">
            Sign in to access your student copilot or admin portal
          </p>
        </div>

        {/* Quick Demo Login Credentials Bar */}
        <div className="mb-5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
          <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">bolt</span> Quick Demo Logins
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin("arghyadas245@gmail.com", "712409")}
              className="py-1.5 px-2.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">shield_person</span> Admin Portal
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("ratul@campus.edu", "student123")}
              className="py-1.5 px-2.5 rounded-lg border border-secondary/30 bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">school</span> Student Portal
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider">
              University Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@campus.edu or student@campus.edu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                lock
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs mt-1">
            <label className="flex items-center gap-1.5 text-on-surface-variant cursor-pointer">
              <input type="checkbox" className="rounded border-outline-variant text-primary" defaultChecked />
              Remember me
            </label>
            <a href="#" className="text-primary font-semibold hover:underline">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary-container transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In to CampusCopilot"}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-surface-variant text-center">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Create Student Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
