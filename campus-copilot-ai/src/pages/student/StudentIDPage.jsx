import { Link } from "react-router";

export default function StudentIDPage() {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 bg-background border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md">
        <div className="flex items-center gap-sm">
          <Link to="/dashboard" className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
            RD
          </Link>
          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">CampusCopilot</span>
        </div>
        <Link to="/dashboard" className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">
          Dashboard
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-6 pb-[90px] md:pb-12 px-margin-mobile md:px-margin-desktop flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto relative group">
          {/* ID Card Container */}
          <div className="relative bg-surface rounded-2xl border border-outline-variant overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl">
            {/* Card Header Accent */}
            <div className="h-4 w-full bg-gradient-to-r from-primary to-secondary relative" />

            {/* Card Body */}
            <div className="p-6 flex flex-col items-center">
              {/* Branding */}
              <div className="w-full flex justify-between items-start mb-6">
                <div className="flex flex-col">
                  <span className="font-label-caps text-on-surface-variant uppercase tracking-wider text-xs">Student ID Pass</span>
                  <span className="font-title-md text-primary font-bold mt-0.5">National Tech University</span>
                </div>
                <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  school
                </span>
              </div>

              {/* Photo & Details */}
              <div className="flex flex-col items-center text-center w-full relative">
                <div className="w-[110px] h-[110px] rounded-full border-4 border-secondary/30 flex items-center justify-center p-1 mb-3 relative bg-primary/5">
                  <div className="w-full h-full rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-3xl shadow-inner">
                    RD
                  </div>
                </div>

                <h2 className="font-headline-lg-mobile font-bold text-on-surface text-xl">Ratul Das</h2>
                <p className="font-body-md text-on-surface-variant text-sm mb-3">Computer Science & Engineering</p>
                <div className="bg-surface-container-low rounded-lg px-4 py-1.5 mb-4 border border-outline-variant/60 w-full text-center">
                  <span className="font-mono-sm text-primary font-bold tracking-wide">ID: 2026-CS-0042</span>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="w-full flex flex-col items-center pt-4 border-t border-outline-variant/60">
                <p className="font-label-caps text-on-surface-variant mb-2 uppercase tracking-wider text-xs">
                  Scan for Campus Gate & Library Access
                </p>
                <div className="w-44 h-44 bg-white p-3 rounded-xl border border-outline-variant shadow-inner relative flex items-center justify-center">
                  {/* Visual QR Pattern representation */}
                  <div className="w-full h-full border-4 border-dashed border-primary/40 rounded-lg flex flex-col items-center justify-center text-center p-2">
                    <span className="material-symbols-outlined text-primary text-5xl mb-1">qr_code_2</span>
                    <span className="font-mono-sm text-[11px] text-outline">SECURE TOKEN: 9942-8821</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="bg-surface-container-low p-2.5 text-center border-t border-outline-variant/60">
              <span className="font-mono-sm text-outline text-xs flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-secondary">verified_user</span>
                Valid Academic Year: 2025–2026
              </span>
            </div>
          </div>

          {/* Background Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-20 -z-10 group-hover:opacity-35 transition-opacity" />
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
          <Link to="/ai-chat" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-[10px] mt-1">Copilot</span>
          </Link>
          <Link to="/student-id" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              badge
            </span>
            <span className="text-[10px] mt-1">ID Card</span>
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
