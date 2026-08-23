import { Link, useNavigate } from "react-router";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-on-background font-body-md antialiased overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      {/* Top Navigation */}
      <nav className="sticky top-0 w-full z-40 bg-background/80 backdrop-blur-md border-b border-surface-container-high transition-all duration-300" id="main-nav">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm w-full">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">CampusCopilot AI</span>
          </Link>
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-lg">
            <a className="font-body-md text-on-surface-variant hover:text-primary transition-colors" href="#features">Features</a>
            <a className="font-body-md text-on-surface-variant hover:text-primary transition-colors" href="#how-it-works">How it works</a>
            <div className="flex items-center gap-sm ml-sm">
              <button onClick={() => navigate("/login")} className="px-md py-xs rounded-full font-title-md text-secondary border border-secondary hover:bg-secondary-container hover:text-on-secondary-container transition-all cursor-pointer">
                Login
              </button>
              <button onClick={() => navigate("/register")} className="px-md py-xs rounded-full font-title-md bg-gradient-to-r from-secondary to-tertiary text-on-primary hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                Get Started
              </button>
            </div>
          </div>
          {/* Mobile Menu Toggle */}
          <button onClick={() => navigate("/login")} className="md:hidden p-xs text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-[120px] pb-[160px] px-margin-mobile md:px-margin-desktop overflow-hidden flex flex-col items-center text-center">
          {/* Background Decorative Elements */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-tertiary-fixed-dim rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary-container rounded-full mix-blend-multiply filter blur-[80px] opacity-30"></div>
          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center gap-md">
            <div className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-surface-container-high border border-outline-variant font-label-caps text-on-surface-variant mb-sm">
              <span className="material-symbols-outlined text-[16px] text-tertiary">auto_awesome</span>
              <span>MEET YOUR ACADEMIC PARTNER</span>
            </div>
            <h1 className="font-display-lg text-on-background tracking-tight max-w-3xl">
              Your intelligent <br className="hidden md:block" />
              <span className="ai-gradient-text">campus companion</span>
            </h1>
            <p className="font-body-md text-on-surface-variant max-w-2xl mt-sm">
              CampusCopilot AI organizes your schedule, tracks assignments, summarizes long notices, and keeps you on top of attendance—all while learning your habits to proactively assist you.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-sm mt-lg w-full justify-center">
              <button onClick={() => navigate("/register")} className="w-full sm:w-auto px-xl py-sm rounded-full font-title-md bg-primary text-on-primary hover:bg-primary-container hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-xs cursor-pointer">
                Get Started Free
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              <button onClick={() => navigate("/login")} className="w-full sm:w-auto px-xl py-sm rounded-full font-title-md bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-high transition-all cursor-pointer">
                Login to Campus
              </button>
            </div>
          </div>
          {/* Bento Preview */}
          <div className="relative w-full max-w-6xl mx-auto mt-[80px] z-20">
            <div className="glass-panel rounded-2xl p-sm md:p-md ai-glow">
              <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container-high grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="bg-surface p-5 rounded-xl border border-surface-container-highest flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[28px]">schedule</span>
                  </div>
                  <div>
                    <h4 className="font-title-md text-on-surface">Live Timetable</h4>
                    <p className="font-body-sm text-on-surface-variant">Next: Data Structures @ Lab 3</p>
                  </div>
                </div>
                <div className="bg-surface p-5 rounded-xl border border-surface-container-highest flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[28px]">analytics</span>
                  </div>
                  <div>
                    <h4 className="font-title-md text-on-surface">Attendance: 85%</h4>
                    <p className="font-body-sm text-on-surface-variant">Safe zone (Threshold 75%)</p>
                  </div>
                </div>
                <div className="bg-surface p-5 rounded-xl border border-surface-container-highest flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-tertiary-container flex items-center justify-center text-on-tertiary">
                    <span className="material-symbols-outlined text-[28px]">smart_toy</span>
                  </div>
                  <div>
                    <h4 className="font-title-md text-on-surface">AI Study Copilot</h4>
                    <p className="font-body-sm text-on-surface-variant">Ready to summarize notes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-[120px] px-margin-mobile md:px-margin-desktop bg-surface-container-lowest" id="features">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-[80px]">
              <h2 className="font-headline-lg text-on-background font-bold mb-sm">Everything you need to excel</h2>
              <p className="font-body-md text-on-surface-variant max-w-2xl mx-auto">Designed for clarity and focus. Let AI handle the administrative overhead while you concentrate on learning.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md md:gap-lg auto-rows-[minmax(250px,auto)]">
              {/* Feature 1: Attendance */}
              <div className="col-span-1 md:col-span-2 bg-surface rounded-2xl p-lg border border-surface-container-high hover:border-primary-fixed-dim transition-colors flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-secondary-container/50 flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-secondary text-[28px]">analytics</span>
                  </div>
                  <h3 className="font-title-md text-on-surface mb-xs">Attendance Intelligence</h3>
                  <p className="font-body-sm text-on-surface-variant max-w-md">Real-time tracking with predictive insights. Know exactly how many classes you can miss before dropping below the required 75% threshold, visualized in clear, color-coded rings.</p>
                </div>
                <div className="mt-lg h-32 rounded-lg bg-surface-container-lowest border border-surface-container-highest flex items-center justify-center overflow-hidden relative">
                  <div className="w-24 h-24 rounded-full border-[4px] border-surface-container-highest border-t-secondary border-r-secondary border-b-secondary animate-[spin_6s_linear_infinite]"></div>
                  <span className="font-title-md text-secondary absolute">85%</span>
                </div>
              </div>

              {/* Feature 2: Smart Timetable */}
              <div className="col-span-1 bg-surface rounded-2xl p-lg border border-surface-container-high hover:border-primary-fixed-dim transition-colors flex flex-col group">
                <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-[28px]">calendar_month</span>
                </div>
                <h3 className="font-title-md text-on-surface mb-xs">Smart Timetable</h3>
                <p className="font-body-sm text-on-surface-variant flex-grow">Dynamic scheduling that adapts to room changes, cancellations, and highlights upcoming exams. High-density information styled with precision.</p>
              </div>

              {/* Feature 3: AI Assistant */}
              <div className="col-span-1 md:col-span-1 bg-surface-container-low rounded-2xl p-lg border border-outline-variant relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-tertiary-container flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-on-tertiary text-[28px]">smart_toy</span>
                  </div>
                  <h3 className="font-title-md text-on-surface mb-xs">AI Campus Assistant</h3>
                  <p className="font-body-sm text-on-surface-variant">Ask natural language questions about your schedule, deadlines, or faculty office hours. Powered by context-aware AI.</p>
                </div>
              </div>

              {/* Feature 4: Notice Summaries */}
              <div className="col-span-1 md:col-span-1 bg-surface rounded-2xl p-lg border border-surface-container-high hover:border-primary-fixed-dim transition-colors flex flex-col group">
                <div className="w-12 h-12 rounded-xl bg-surface-variant flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-on-surface-variant text-[28px]">campaign</span>
                </div>
                <h3 className="font-title-md text-on-surface mb-xs">College Notice Summaries</h3>
                <p className="font-body-sm text-on-surface-variant">AI-generated bullet points from long, verbose official PDFs and emails. Get the 'TL;DR' instantly.</p>
              </div>

              {/* Feature 5: Assignments */}
              <div className="col-span-1 md:col-span-1 bg-surface rounded-2xl p-lg border border-surface-container-high hover:border-primary-fixed-dim transition-colors flex flex-col group">
                <div className="w-12 h-12 rounded-xl bg-error-container/50 flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-error text-[28px]">assignment</span>
                </div>
                <h3 className="font-title-md text-on-surface mb-xs">Assignment Tracking</h3>
                <p className="font-body-sm text-on-surface-variant">Never miss a deadline. Unified view of all tasks across subjects with priority flagging.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-[120px] px-margin-mobile md:px-margin-desktop" id="how-it-works">
          <div className="max-w-[1024px] mx-auto">
            <div className="text-center mb-[80px]">
              <h2 className="font-headline-lg text-on-background font-bold mb-sm">How it works</h2>
              <p className="font-body-md text-on-surface-variant">A seamless integration into your academic life.</p>
            </div>
            <div className="flex flex-col gap-xl relative">
              <div className="flex flex-col md:flex-row items-center gap-lg">
                <div className="w-full md:w-1/2 flex justify-start md:justify-end">
                  <div className="glass-panel p-md rounded-2xl max-w-sm shadow-sm border border-outline-variant">
                    <span className="font-label-caps text-primary tracking-widest block mb-xs">STEP 01</span>
                    <h4 className="font-title-md text-on-surface mb-xs">Connect your ID</h4>
                    <p className="font-body-sm text-on-surface-variant">Log in with your existing university credentials. CampusCopilot securely syncs your official data.</p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary flex shrink-0 items-center justify-center border-4 border-background shadow-md">
                  <span className="material-symbols-outlined text-on-primary">login</span>
                </div>
                <div className="w-full md:w-1/2"></div>
              </div>

              <div className="flex flex-col md:flex-row-reverse items-center gap-lg">
                <div className="w-full md:w-1/2 flex justify-start">
                  <div className="glass-panel p-md rounded-2xl max-w-sm shadow-sm border border-outline-variant">
                    <span className="font-label-caps text-tertiary tracking-widest block mb-xs">STEP 02</span>
                    <h4 className="font-title-md text-on-surface mb-xs">AI Contextualizes Data</h4>
                    <p className="font-body-sm text-on-surface-variant">The Copilot engine analyzes your timetable, parses notice PDFs, and calculates attendance buffers in the background.</p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-tertiary flex shrink-0 items-center justify-center border-4 border-background shadow-md">
                  <span className="material-symbols-outlined text-on-tertiary">memory</span>
                </div>
                <div className="w-full md:w-1/2"></div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-lg">
                <div className="w-full md:w-1/2 flex justify-start md:justify-end">
                  <div className="glass-panel p-md rounded-2xl max-w-sm shadow-sm border border-outline-variant">
                    <span className="font-label-caps text-secondary tracking-widest block mb-xs">STEP 03</span>
                    <h4 className="font-title-md text-on-surface mb-xs">Engage &amp; Excel</h4>
                    <p className="font-body-sm text-on-surface-variant">Open the app to see a clear daily briefing, or chat with Copilot for specific answers. Everything is organized and accessible.</p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-secondary flex shrink-0 items-center justify-center border-4 border-background shadow-md">
                  <span className="material-symbols-outlined text-on-secondary">rocket_launch</span>
                </div>
                <div className="w-full md:w-1/2"></div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-[120px] px-margin-mobile md:px-margin-desktop bg-surface-container-highest border-t border-outline-variant text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            <span className="material-symbols-outlined text-primary text-[48px] mb-md" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            <h2 className="font-headline-lg text-on-background font-bold mb-sm">Ready to elevate your campus experience?</h2>
            <p className="font-body-md text-on-surface-variant mb-lg">Join thousands of students using CampusCopilot AI to stay organized and informed.</p>
            <button onClick={() => navigate("/register")} className="px-xl py-md rounded-full font-title-md bg-gradient-to-r from-primary to-tertiary text-on-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              Get Started Free
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-inverse-surface text-inverse-on-surface py-lg px-margin-mobile md:px-margin-desktop">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-lg mb-xl">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-xs mb-sm">
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              <span className="font-headline-lg-mobile font-bold text-primary-fixed-dim">CampusCopilot AI</span>
            </div>
            <p className="font-body-sm text-outline-variant max-w-sm">
              Your intelligent campus companion. Built to organize, summarize, and assist modern academic life.
            </p>
          </div>
          <div>
            <h4 className="font-title-md mb-sm text-surface">Product</h4>
            <ul className="space-y-xs font-body-sm text-outline-variant">
              <li><Link className="hover:text-primary-fixed-dim transition-colors" to="/dashboard">Dashboard</Link></li>
              <li><Link className="hover:text-primary-fixed-dim transition-colors" to="/ai-chat">AI Copilot</Link></li>
              <li><Link className="hover:text-primary-fixed-dim transition-colors" to="/attendance">Attendance</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-title-md mb-sm text-surface">Portals</h4>
            <ul className="space-y-xs font-body-sm text-outline-variant">
              <li><Link className="hover:text-primary-fixed-dim transition-colors" to="/login">Student Login</Link></li>
              <li><Link className="hover:text-primary-fixed-dim transition-colors" to="/admin">Admin Portal</Link></li>
              <li><Link className="hover:text-primary-fixed-dim transition-colors" to="/resources">Resource Hub</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1440px] mx-auto pt-sm border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center font-mono-sm text-outline-variant">
          <p>© 2026 CampusCopilot AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

