import { Link } from "react-router";

export default function AttendancePage() {
  const subjects = [
    {
      name: "Database Management Systems",
      code: "CS-301",
      faculty: "Prof. Alan Turing",
      percentage: 83.3,
      attended: 35,
      total: 42,
      isSafe: true,
      insight: "You can miss 4 classes while staying above 75%.",
    },
    {
      name: "Computer Networks",
      code: "CS-302",
      faculty: "Prof. Grace Hopper",
      percentage: 70.7,
      attended: 29,
      total: 41,
      isSafe: false,
      insight: "Below required attendance. Attend next 7 classes to reach 75%.",
    },
    {
      name: "Operating Systems",
      code: "CS-303",
      faculty: "Prof. Linus Torvalds",
      percentage: 88.5,
      attended: 46,
      total: 52,
      isSafe: true,
      insight: "You can miss 7 classes safely.",
    },
    {
      name: "Theory of Computation",
      code: "CS-304",
      faculty: "Prof. John von Neumann",
      percentage: 82.0,
      attended: 41,
      total: 50,
      isSafe: true,
      insight: "You can miss 3 classes while staying above 75%.",
    },
  ];

  const weeklyTrend = [
    { week: "W1", value: 85 },
    { week: "W2", value: 90 },
    { week: "W3", value: 82 },
    { week: "W4", value: 70 },
    { week: "W5", value: 88 },
    { week: "W6", value: 81, current: true },
  ];

  return (
    <div className="bg-background text-on-background font-body-sm antialiased min-h-screen flex flex-col">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-background border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md">
        <div className="flex items-center gap-sm">
          <Link to="/profile" className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            RD
          </Link>
          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">CampusCopilot</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-md">
          <Link to="/dashboard" className="font-body-md text-on-surface-variant hover:text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">dashboard</span> Home
          </Link>
          <Link to="/attendance" className="font-body-md text-primary font-bold flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span> Attendance
          </Link>
          <Link to="/ai-chat" className="font-body-md text-on-surface-variant hover:text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">smart_toy</span> Copilot
          </Link>
          <Link to="/assignments" className="font-body-md text-on-surface-variant hover:text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">assignment</span> Tasks
          </Link>
          <Link to="/timetable" className="font-body-md text-on-surface-variant hover:text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span> Timetable
          </Link>
        </nav>

        <Link to="/campus" className="text-on-surface-variant hover:opacity-80 p-2 rounded-full hover:bg-surface-container">
          <span className="material-symbols-outlined">notifications</span>
        </Link>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop pt-md pb-[96px] md:pb-xl flex flex-col gap-md md:gap-lg">
        {/* Header Section */}
        <div>
          <h1 className="font-headline-lg md:font-display-lg text-primary tracking-tight font-bold">Attendance Overview</h1>
          <p className="font-body-md text-on-surface-variant mt-1">Track your academic presence and stay well above institutional requirements.</p>
        </div>

        {/* Bento Grid: Overall & Chart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {/* Overall Attendance Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
            <h2 className="font-title-md text-on-surface w-full text-left mb-6 font-bold">Overall Attendance</h2>
            <div className="relative w-40 h-40 flex items-center justify-center mb-4">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle className="text-surface-container" cx="50" cy="50" fill="none" r="42" stroke="currentColor" strokeWidth="8" />
                <circle
                  className="text-secondary transition-all duration-1000 ease-out"
                  cx="50"
                  cy="50"
                  fill="none"
                  r="42"
                  stroke="currentColor"
                  strokeDasharray="263.89"
                  strokeDashoffset={263.89 * (1 - 0.81)}
                  strokeLinecap="round"
                  strokeWidth="8"
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className="font-display-lg text-primary tracking-tighter font-bold">
                  81<span className="text-xl text-primary-container">%</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              <span className="font-label-caps tracking-wider uppercase font-semibold text-xs">Safe Zone (Threshold: 75%)</span>
            </div>
          </div>

          {/* Attendance Trend Chart */}
          <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col relative shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-title-md text-on-surface font-bold">Weekly Trend</h2>
              <span className="font-label-caps text-outline uppercase tracking-wider text-xs">Last 6 Weeks</span>
            </div>

            <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 mt-auto pt-6 relative min-h-[140px]">
              {weeklyTrend.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1 z-10">
                  <span className="text-xs font-semibold text-on-surface">{item.value}%</span>
                  <div className="w-full max-w-[44px] bg-surface-container-high rounded-t-lg relative flex items-end justify-center h-[120px] overflow-hidden">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${item.value >= 75 ? "bg-secondary" : "bg-error"}`}
                      style={{ height: `${item.value}%` }}
                    />
                  </div>
                  <span className={`font-mono-sm text-xs ${item.current ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                    {item.week}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject Breakdown List */}
        <div className="flex flex-col gap-md">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-background font-bold">Subject Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {subjects.map((sub, idx) => (
              <div
                key={idx}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-all shadow-sm"
              >
                <div className={`h-1.5 w-full ${sub.isSafe ? "bg-secondary" : "bg-error"}`} />
                <div className="p-md flex flex-col gap-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-title-md text-on-surface font-semibold leading-tight">{sub.name}</h3>
                      <p className="font-body-sm text-on-surface-variant mt-0.5">
                        {sub.code} • {sub.faculty}
                      </p>
                    </div>
                    <span className={`font-title-md font-bold text-lg ${sub.isSafe ? "text-secondary" : "text-error"}`}>
                      {sub.percentage}%
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex justify-between font-mono-sm text-outline text-xs">
                      <span>Classes Attended</span>
                      <span>
                        {sub.attended} / {sub.total}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${sub.isSafe ? "bg-secondary" : "bg-error"}`}
                        style={{ width: `${sub.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* AI Insight Footer */}
                <div
                  className={`px-md py-2.5 border-t flex items-center gap-2 text-xs ${
                    sub.isSafe
                      ? "bg-surface-bright border-outline-variant/60 text-on-surface-variant"
                      : "bg-error-container/30 border-error/20 text-on-error-container font-medium"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${sub.isSafe ? "text-secondary" : "text-error"}`}>
                    {sub.isSafe ? "psychology" : "warning"}
                  </span>
                  <p>{sub.insight}</p>
                </div>
              </div>
            ))}
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
          <Link to="/attendance" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              analytics
            </span>
            <span className="text-[10px] mt-1">Attendance</span>
          </Link>
          <Link to="/ai-chat" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-[10px] mt-1">Copilot</span>
          </Link>
          <Link to="/assignments" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">assignment</span>
            <span className="text-[10px] mt-1">Tasks</span>
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
