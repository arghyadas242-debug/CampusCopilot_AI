import { useState } from "react";
import { Link, useNavigate } from "react-router";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    department: "",
    semester: "",
    section: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-margin-mobile antialiased">
      {/* Main Container: Focused Registration Form */}
      <main className="w-full max-w-[420px] bg-surface rounded-xl border border-surface-container-high shadow-lg p-md overflow-hidden relative">
        {/* Subtle AI Glassmorphic Glow Element in Background */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <header className="text-center mb-lg relative z-10">
          <h1 className="font-headline-lg-mobile font-bold text-primary tracking-tight">CampusCopilot</h1>
          <h2 className="font-title-md text-on-surface mt-sm">Create an Account</h2>
          <p className="font-body-sm text-on-surface-variant mt-xs">Provide your details to get started.</p>
        </header>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-sm relative z-10">
          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="fullName">
              Full Name
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" style={{ fontSize: "20px" }}>
                person
              </span>
              <input
                className="w-full pl-10 pr-sm py-2 border border-outline-variant rounded-lg bg-surface-container-lowest font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                id="fullName"
                name="fullName"
                placeholder="Jane Doe"
                required
                type="text"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" style={{ fontSize: "20px" }}>
                mail
              </span>
              <input
                className="w-full pl-10 pr-sm py-2 border border-outline-variant rounded-lg bg-surface-container-lowest font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                id="email"
                name="email"
                placeholder="student@university.edu"
                required
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" style={{ fontSize: "20px" }}>
                lock
              </span>
              <input
                className="w-full pl-10 pr-sm py-2 border border-outline-variant rounded-lg bg-surface-container-lowest font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Department Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="department">
              Department
            </label>
            <select
              className="w-full px-sm py-2 border border-outline-variant rounded-lg bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              id="department"
              name="department"
              required
              value={formData.department}
              onChange={handleChange}
            >
              <option disabled value="">
                Select Department
              </option>
              <option value="cs">Computer Science</option>
              <option value="ee">Electrical Engineering</option>
              <option value="me">Mechanical Engineering</option>
              <option value="ba">Business Administration</option>
            </select>
          </div>

          {/* Semester & Section Row */}
          <div className="flex gap-sm w-full">
            <div className="flex flex-col gap-1 flex-1">
              <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="semester">
                Semester
              </label>
              <select
                className="w-full px-sm py-2 border border-outline-variant rounded-lg bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                id="semester"
                name="semester"
                required
                value={formData.semester}
                onChange={handleChange}
              >
                <option disabled value="">
                  Select
                </option>
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
                <option value="3">3rd Semester</option>
                <option value="4">4th Semester</option>
                <option value="5">5th Semester</option>
                <option value="6">6th Semester</option>
                <option value="7">7th Semester</option>
                <option value="8">8th Semester</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="section">
                Section
              </label>
              <select
                className="w-full px-sm py-2 border border-outline-variant rounded-lg bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                id="section"
                name="section"
                required
                value={formData.section}
                onChange={handleChange}
              >
                <option disabled value="">
                  Select
                </option>
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            className="w-full mt-sm py-sm bg-primary text-on-primary rounded-lg font-title-md hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/30 active:scale-[0.98] transition-all duration-200 flex justify-center items-center gap-xs cursor-pointer shadow-md"
            type="submit"
          >
            Create Account
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              arrow_forward
            </span>
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-md text-center border-t border-surface-container-high pt-sm">
          <p className="font-body-sm text-on-surface-variant">
            Already have an account?{" "}
            <Link className="text-primary font-semibold hover:underline" to="/login">
              Log in here
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
