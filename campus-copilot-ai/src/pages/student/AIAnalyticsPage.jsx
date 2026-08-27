import { Link } from "react-router";
import StudentNotificationBell from "./StudentNotificationBell";

export default function AIAnalyticsPage() {
  const subjectScores = [
    { code: "CS-301", title: "Database Systems", score: 92, status: "Mastered", color: "bg-secondary" },
    { code: "CS-302", title: "Computer Networks", score: 74, status: "Needs Review", color: "bg-error" },
    { code: "CS-303", title: "Operating Systems", score: 88, status: "Strong", color: "bg-primary" },
    { code: "CS-304", title: "Theory of Computation", score: 81, status: "Good", color: "bg-tertiary" },
  ];

  const recommendations = [
    {
      type: "High Impact",
      title: "Focus on Computer Networks Subnetting",
      desc: "Based on your recent quiz errors, reviewing IP CIDR masking will boost your expected exam score by ~8%.",
      badgeColor: "bg-error-container text-on-error-container",
    },
    {
      type: "Consistency",
      title: "Maintain DBMS Practical Pace",
      desc: "You scored top 5% in SQL query optimization. Continue standard BCNF normalization practice.",
      badgeColor: "bg-secondary-container text-on-secondary-container",
    },
    {
      type: "Study Habit",
      title: "Best Focus Window: 08:00 PM - 11:00 PM",
      desc: "Your quiz completion accuracy is 22% higher when solving assignments during evening sessions.",
      badgeColor: "bg-tertiary-container text-on-tertiary",
    },
  ];

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-12 font-body-md">
      {/* Top App Bar */}
      <header className="bg-surface sticky top-0 w-full z-50 flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md border-b border-surface-container-high">
        <div className="flex items-center gap-sm">
          <Link to="/profile" className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            RD
          </Link>
          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">CampusCopilot</span>
        </div>
        <div className="flex items-center gap-2">
          <StudentNotificationBell />
          <Link to="/dashboard" className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="pt-6 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto md:grid md:grid-cols-12 md:gap-lg">
        {/* Header */}
        <div className="col-span-12 mb-md">
          <h1 className="font-headline-lg md:font-display-lg text-primary font-bold">AI Performance Analytics</h1>
          <p className="font-body-md text-on-surface-variant mt-1 max-w-2xl">
            Personalized academic intelligence, predictive GPA trajectory, and Copilot study recommendations.
          </p>
        </div>

        {/* Left Column: Primary Metrics */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-md">
          {/* Study Readiness Score */}
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-md flex flex-col items-center text-center shadow-sm">
            <h3 className="font-title-md text-on-surface font-bold mb-sm w-full text-left">Study Readiness Score</h3>
            <div className="relative w-40 h-40 flex items-center justify-center my-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle className="text-surface-container-high" cx="50" cy="50" fill="none" r="42" stroke="currentColor" strokeWidth="8" />
                <circle
                  className="text-secondary"
                  cx="50"
                  cy="50"
                  fill="none"
                  r="42"
                  stroke="currentColor"
                  strokeDasharray="263.89"
                  strokeDashoffset={263.89 * (1 - 0.85)}
                  strokeLinecap="round"
                  strokeWidth="8"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display-lg text-primary font-bold text-3xl">85</span>
                <span className="font-label-caps text-on-surface-variant text-xs font-semibold">/ 100</span>
              </div>
            </div>
            <p className="font-body-sm text-on-surface-variant mt-1">
              You are in a prime state to tackle challenging concepts. Focus on deep work sessions tonight.
            </p>
          </div>

          {/* Subject Performance Mini-cards */}
          <div className="grid grid-cols-2 gap-sm">
            {subjectScores.map((sub, idx) => (
              <div key={idx} className={`bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-3 shadow-sm border-t-4 ${sub.color}`}>
                <span className="font-mono-sm text-on-surface-variant text-xs block mb-0.5">{sub.code}</span>
                <span className="font-title-md text-on-surface font-bold block text-lg">{sub.score}%</span>
                <span className="text-[11px] font-semibold text-outline">{sub.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: AI Recommendations & Strengths */}
        <div className="col-span-12 md:col-span-8 flex flex-col gap-md mt-md md:mt-0">
          {/* GPA Forecast Card */}
          <div className="bg-gradient-to-r from-primary-container to-tertiary-container text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-teal-300">Predictive Milestone</span>
              <h3 className="text-2xl font-bold mt-1 text-white">Projected Semester SGPA: 8.94</h3>
              <p className="text-sm text-white/80 mt-0.5">Scoring ≥ 80% in Computer Networks will push your SGPA into the 9.1+ honors band.</p>
            </div>
            <Link to="/ai-chat" className="px-4 py-2 bg-white text-primary rounded-lg font-semibold text-xs whitespace-nowrap hover:bg-slate-100 transition-colors shadow-sm self-start md:self-center">
              Optimize Study Schedule
            </Link>
          </div>

          {/* Recommendations List */}
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-md shadow-sm">
            <h3 className="font-title-md text-on-surface font-bold mb-4">Copilot Study Insights</h3>
            <div className="flex flex-col gap-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full font-label-caps text-xs font-semibold ${rec.badgeColor}`}>
                      {rec.type}
                    </span>
                  </div>
                  <h4 className="font-title-md text-on-surface font-semibold text-base mt-1">{rec.title}</h4>
                  <p className="font-body-sm text-on-surface-variant text-sm">{rec.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav Bar (Mobile) */}
      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">
        <div className="flex justify-around items-center px-margin-mobile w-full h-full">
          <Link to="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] mt-1">Home</span>
          </Link>
          <Link to="/attendance" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-[10px] mt-1">Attendance</span>
          </Link>
          <Link to="/ai-analytics" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              insights
            </span>
            <span className="text-[10px] mt-1">Analytics</span>
          </Link>
          <Link to="/ai-chat" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-[10px] mt-1">Copilot</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">account_circle</span>
            <span className="text-[10px] mt-1">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
