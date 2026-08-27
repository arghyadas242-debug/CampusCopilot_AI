import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { aiService, authService } from "../../services/api";
import StudentNotificationBell from "./StudentNotificationBell";

export default function AIChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Hello Ratul! I'm your **CampusCopilot**. I can help you review algorithms, clarify textbook doubts, explain class notes, or prepare study strategies for your upcoming exams. What are we studying today?",
      time: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef(null);

  const currentUser = authService.getCurrentUser() || {
    name: "Ratul Das",
    rollNumber: "2026-CS-0042",
    department: "Computer Science",
    semester: "5",
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: input,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const response = await aiService.sendChatMessage(
        currentInput,
        messages,
        {
          studentName: currentUser.name,
          department: currentUser.department,
          semester: currentUser.semester,
        }
      );

      const aiMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: response.reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: `⚠️ **Error connecting to AI:** ${err.message}. Please check that the backend server is running on port 5000.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const samplePrompts = [
    "Explain B+ Trees vs B Trees in DBMS with examples",
    "How does Dijkstra's shortest path algorithm work?",
    "Generate a 3-day revision plan for Computer Networks",
    "What is the difference between Process and Thread in OS?",
  ];

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased font-body-md">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-surface border-b border-surface-container-high shadow-xs">
        <div className="flex justify-between items-center px-4 md:px-8 py-3 w-full max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-secondary to-tertiary flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[22px]">smart_toy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary text-lg md:text-xl">
                  CampusCopilot AI
                </h1>
                <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-xs text-outline hidden md:block">Academic Personal Tutor & Study Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StudentNotificationBell />
            <Link
              to="/dashboard"
              className="hidden sm:block text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col justify-between pb-28 md:pb-8">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "ai" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-secondary to-tertiary text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                </div>
              )}

              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-xs ${
                  msg.sender === "user"
                    ? "bg-primary text-on-primary rounded-br-none"
                    : "bg-surface-container-lowest border border-outline-variant/60 text-on-surface rounded-tl-none"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                <div
                  className={`text-[10px] mt-1.5 text-right ${
                    msg.sender === "user" ? "text-primary-fixed-dim" : "text-outline"
                  }`}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-secondary to-tertiary text-white flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl px-4 py-3 text-xs text-outline flex items-center gap-1.5 shadow-xs">
                <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-bounce" />
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                <span className="inline-block w-2 h-2 rounded-full bg-tertiary animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2 font-medium">Copilot is synthesizing answer...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Prompts */}
        {messages.length === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setInput(p)}
                className="text-left text-xs p-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-between group cursor-pointer"
              >
                <span>{p}</span>
                <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary">
                  arrow_forward
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Copilot any academic concept, formula, or code question..."
            className="flex-1 py-3.5 pl-4 pr-12 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container disabled:opacity-40 transition-all cursor-pointer shadow-sm flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </main>

      {/* Bottom Nav Bar (Mobile) */}
      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">
        <div className="flex justify-around items-center px-4 w-full h-full">
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
        </div>
      </nav>
    </div>
  );
}
