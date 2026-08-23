import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";

export default function AIChatPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [messages, setMessages] = useState([
    {
      role: "user",
      text: "What classes do I have today?",
    },
    {
      role: "assistant",
      text: "You have 3 classes scheduled for today:",
      schedule: [
        { time: "10:00 AM - 11:30 AM", title: "Data Structures (CS201)", room: "Room 402" },
        { time: "12:30 PM - 02:00 PM", title: "Database Mgmt (CS205)", room: "Room 310" },
        { time: "03:00 PM - 04:00 PM", title: "Ethics in Tech (HU101)", room: "Room 105" },
      ],
    },
    {
      role: "user",
      text: "Can I miss tomorrow's DBMS class?",
    },
    {
      role: "assistant",
      text: "Your current attendance in Database Management Systems (CS205) is 78%. If you miss tomorrow's class, it will drop to 73%, which is below the required 75% threshold. I recommend attending if possible.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  const handleSend = (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      let replyText = `I have processed your inquiry about "${text}". According to your semester roadmap, you are on track. Let me know if you want detailed notes or schedule adjustments!`;
      if (text.toLowerCase().includes("attendance")) {
        replyText = "Your overall attendance is currently 81%. All subjects except DBMS (78%) are above 80%. You have safe buffer in Computer Networks.";
      } else if (text.toLowerCase().includes("notice")) {
        replyText = "Latest notice: 'Semester Examination Schedule Released' by Exam Cell. Practical exams commence from next Monday.";
      }

      setMessages((prev) => [...prev, { role: "assistant", text: replyText }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="bg-background text-on-background h-screen flex flex-col font-body-sm relative overflow-hidden">
      {/* Top App Bar */}
      <header className="sticky top-0 w-full z-40 bg-background border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md">
        <div className="flex items-center gap-sm">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            RD
          </Link>
          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">CampusCopilot AI</span>
        </div>
        <Link to="/dashboard" className="text-sm font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">
          Back to Dashboard
        </Link>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Nav */}
        <nav className="hidden md:flex flex-col py-md w-[260px] bg-surface border-r border-outline-variant shrink-0 justify-between">
          <div className="px-md flex flex-col gap-xs">
            <Link to="/dashboard" className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high px-4 py-2.5 rounded-xl transition-colors">
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-body-md">Home</span>
            </Link>
            <Link to="/attendance" className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high px-4 py-2.5 rounded-xl transition-colors">
              <span className="material-symbols-outlined">analytics</span>
              <span className="font-body-md">Attendance</span>
            </Link>
            <Link to="/ai-chat" className="flex items-center gap-3 bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-bold transition-colors">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              <span className="font-body-md">AI Copilot</span>
            </Link>
            <Link to="/timetable" className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high px-4 py-2.5 rounded-xl transition-colors">
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="font-body-md">Timetable</span>
            </Link>
            <Link to="/assignments" className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high px-4 py-2.5 rounded-xl transition-colors">
              <span className="material-symbols-outlined">assignment</span>
              <span className="font-body-md">Assignments</span>
            </Link>
            <Link to="/campus" className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high px-4 py-2.5 rounded-xl transition-colors">
              <span className="material-symbols-outlined">campaign</span>
              <span className="font-body-md">Notices</span>
            </Link>
          </div>

          <div className="px-md">
            <div className="bg-surface-container-high p-3 rounded-xl">
              <div className="flex items-center gap-2 text-tertiary font-semibold text-xs mb-1">
                <span className="material-symbols-outlined text-sm">bolt</span> Copilot Pro
              </div>
              <p className="text-[11px] text-on-surface-variant">Connected to University Portal & Syllabus</p>
            </div>
          </div>
        </nav>

        {/* Chat Interface */}
        <main className="flex-1 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-background via-surface to-background relative">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col gap-4 max-w-4xl w-full mx-auto pb-44 md:pb-36">
            {/* Welcome Header */}
            <div className="text-center my-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-tertiary-container text-on-tertiary mb-2 shadow-lg">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  smart_toy
                </span>
              </div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">How can I assist you today?</h2>
              <p className="text-on-surface-variant mt-1 font-body-sm">Your AI assistant for schedule, notices, assignments, and exam strategies.</p>
            </div>

            {/* Render Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div className="bg-primary text-on-primary px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                    <p className="font-body-md">{msg.text}</p>
                  </div>
                ) : (
                  <div className="bg-surface border border-outline-variant/60 text-on-surface px-4 py-3.5 rounded-2xl rounded-tl-sm max-w-[90%] shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-tertiary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                        smart_toy
                      </span>
                      <span className="font-label-caps text-tertiary tracking-wider uppercase font-bold text-[11px]">Copilot</span>
                    </div>
                    <p className="font-body-md mb-2">{msg.text}</p>

                    {msg.schedule && (
                      <div className="flex flex-col gap-2 font-mono-sm text-on-surface-variant bg-surface-container-low p-3 rounded-lg border border-outline-variant mt-2">
                        {msg.schedule.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center pb-2 border-b border-surface-variant last:border-b-0 last:pb-0">
                            <span className="font-bold text-primary">{item.time}</span>
                            <span>{item.title}</span>
                            <span className="text-xs text-outline">{item.room}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-surface border border-outline-variant/60 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-tertiary animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-tertiary animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-tertiary animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Fixed Input Area */}
          <div className="absolute bottom-[64px] md:bottom-0 left-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent pt-4 pb-4 px-4 md:px-8 z-20">
            <div className="max-w-3xl mx-auto w-full">
              {/* Quick Suggestions */}
              <div className="flex overflow-x-auto gap-2 mb-2 pb-1 no-scrollbar">
                {[
                  "What classes do I have today?",
                  "Can I miss tomorrow's DBMS class?",
                  "Summarize latest notice",
                  "When is my next exam?",
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(sug)}
                    className="whitespace-nowrap px-3.5 py-1.5 rounded-full border border-secondary text-secondary font-body-sm hover:bg-secondary hover:text-on-secondary transition-colors bg-surface-container-lowest text-xs cursor-pointer shadow-xs"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative flex items-center bg-surface rounded-xl border border-outline-variant shadow-md focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all"
              >
                <input
                  className="w-full bg-transparent border-none px-4 py-3.5 font-body-md text-on-surface focus:outline-none placeholder:text-outline-variant"
                  placeholder="Ask CampusCopilot about classes, attendance, assignments..."
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-2 bg-gradient-to-r from-secondary to-tertiary text-white w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>
                    send
                  </span>
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Nav Bar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 h-[64px] bg-surface shadow-lg border-t border-surface-container-high flex justify-around items-center px-margin-mobile">
        <Link to="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] mt-1">Home</span>
        </Link>
        <Link to="/attendance" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined">analytics</span>
          <span className="text-[10px] mt-1">Attendance</span>
        </Link>
        <Link to="/ai-chat" className="flex flex-col items-center justify-center text-primary font-bold">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            smart_toy
          </span>
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
      </nav>
    </div>
  );
}
