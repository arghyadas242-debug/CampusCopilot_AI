import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { authService } from "../../services/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    rollNumber: "",
    department: "Computer Science & Engineering",
    semester: "5",
    section: "A",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authService.register(formData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-secondary via-primary to-tertiary" />

        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xl mb-2 shadow-sm">
            <span className="material-symbols-outlined text-[28px]">person_add</span>
          </div>
          <h1 className="font-headline-lg font-bold text-primary text-center">Student Registration</h1>
          <p className="font-body-sm text-on-surface-variant text-center mt-0.5">
            Create your account to unlock AI tutoring and track your semester progress
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider">
              Full Name
            </label>
            <input
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Ratul Das"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider">
                University Email
              </label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="student@campus.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider">
                Roll / ID Number
              </label>
              <input
                name="rollNumber"
                required
                value={formData.rollNumber}
                onChange={handleChange}
                placeholder="e.g. 2026-CS-0042"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm font-mono-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider">
              Department
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:border-primary font-semibold"
            >
              <option>Computer Science & Engineering</option>
              <option>Information Technology</option>
              <option>Electrical & Electronics Eng.</option>
              <option>Mechanical Engineering</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider">
                Semester
              </label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:border-primary font-semibold"
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </div>

            <div>
              <label className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider">
                Section
              </label>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:border-primary font-semibold"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-label-caps text-on-surface text-xs block mb-1 uppercase tracking-wider">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary-container transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account & Go to Dashboard"}
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-surface-variant text-center">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
