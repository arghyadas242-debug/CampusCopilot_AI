import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import {
  aiService,
  authService,
} from "../../services/api";

import StudentNotificationBell from "./StudentNotificationBell";


export default function AIChatPage() {
  const [searchParams] =
    useSearchParams();


  // =====================================================
  // LOGGED-IN STUDENT
  // =====================================================

  const currentUser =
    authService.getCurrentUser();


  const studentName =
    currentUser?.name?.trim() ||
    "Student";


  const firstName =
    studentName
      .split(" ")[0] ||
    "Student";


  const studentRoll =
    currentUser?.rollNumber ||
    currentUser?.studentRoll ||
    currentUser?.roll_number ||
    "";


  // =====================================================
  // STATE
  // =====================================================

  const [messages, setMessages] =
    useState(() => [
      {
        id: 1,

        sender: "ai",

        text:
          `Hello ${firstName}! I'm your CampusCopilot. I can help with your real attendance, timetable, assignments, exams, notices and study resources, or explain academic concepts. What would you like to know?`,

        time:
          "Just now",

        grounded:
          false,
      },
    ]);


  const [input, setInput] =
    useState(
      searchParams.get("q") ||
      ""
    );


  const [isTyping, setIsTyping] =
    useState(false);


  const chatBottomRef =
    useRef(null);


  // =====================================================
  // SCROLL TO LATEST MESSAGE
  // =====================================================

  useEffect(() => {
    chatBottomRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [
    messages,
    isTyping,
  ]);


  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const handleSend =
    async (event) => {

      event?.preventDefault();


      const currentInput =
        input.trim();


      if (
        !currentInput ||
        isTyping
      ) {
        return;
      }


      if (!studentRoll) {
        setMessages(
          (previous) => [
            ...previous,

            {
              id:
                Date.now(),

              sender:
                "ai",

              text:
                "I could not identify your student roll number. Please log out and log in again before using CampusCopilot.",

              time:
                new Date()
                  .toLocaleTimeString(
                    [],
                    {
                      hour:
                        "2-digit",

                      minute:
                        "2-digit",
                    }
                  ),

              grounded:
                false,
            },
          ]
        );

        return;
      }


      const userMessage = {
        id:
          Date.now(),

        sender:
          "user",

        text:
          currentInput,

        time:
          new Date()
            .toLocaleTimeString(
              [],
              {
                hour:
                  "2-digit",

                minute:
                  "2-digit",
              }
            ),
      };


      setMessages(
        (previous) => [
          ...previous,
          userMessage,
        ]
      );


      setInput("");

      setIsTyping(true);


      try {

        const response =
          await aiService.sendChatMessage(
            currentInput,

            messages,

            {
              studentRoll,

              studentName,

              department:
                currentUser
                  ?.department ||
                null,

              semester:
                currentUser
                  ?.semester ||
                null,
            }
          );


        const aiMessage = {
          id:
            Date.now() + 1,

          sender:
            "ai",

          text:
            response.reply,

          time:
            new Date()
              .toLocaleTimeString(
                [],
                {
                  hour:
                    "2-digit",

                  minute:
                    "2-digit",
                }
              ),

          grounded:
            Boolean(
              response.grounded
            ),

          contextTypes:
            response.contextTypes ||
            [],
        };


        setMessages(
          (previous) => [
            ...previous,
            aiMessage,
          ]
        );

      } catch (error) {

        const errorMessage = {
          id:
            Date.now() + 1,

          sender:
            "ai",

          text:
            `CampusCopilot could not complete that request. ${error.message}`,

          time:
            new Date()
              .toLocaleTimeString(
                [],
                {
                  hour:
                    "2-digit",

                  minute:
                    "2-digit",
                }
              ),

          grounded:
            false,
        };


        setMessages(
          (previous) => [
            ...previous,
            errorMessage,
          ]
        );

      } finally {

        setIsTyping(false);
      }
    };


  // =====================================================
  // LIVE DATA PROMPTS
  // =====================================================

  const samplePrompts = [
    "What classes do I have today?",

    "What is my attendance?",

    "What assignments are pending?",

    "When is my next exam?",
  ];


  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased font-body-md">

      {/* =================================================
          TOP APP BAR
      ================================================= */}

      <header className="sticky top-0 w-full z-40 bg-surface border-b border-surface-container-high shadow-xs">

        <div className="flex justify-between items-center px-4 md:px-8 py-3 w-full max-w-[1440px] mx-auto">

          <div className="flex items-center gap-3">

            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-secondary to-tertiary flex items-center justify-center text-white shadow-md">

              <span className="material-symbols-outlined text-[22px]">
                smart_toy
              </span>

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


              <p className="text-xs text-outline hidden md:block">
                Academic Personal Tutor & Campus Assistant
              </p>

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


      {/* =================================================
          MAIN CHAT
      ================================================= */}

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col justify-between pb-28 md:pb-8">

        {/* Messages */}

        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">

          {messages.map(
            (message) => (
              <div
                key={
                  message.id
                }
                className={`flex gap-3 ${
                  message.sender ===
                  "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                {/* AI icon */}

                {message.sender ===
                  "ai" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-secondary to-tertiary text-white flex items-center justify-center shrink-0 shadow-sm mt-1">

                    <span className="material-symbols-outlined text-[18px]">
                      smart_toy
                    </span>

                  </div>
                )}


                {/* Message bubble */}

                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-xs ${
                    message.sender ===
                    "user"
                      ? "bg-primary text-on-primary rounded-br-none"
                      : "bg-surface-container-lowest border border-outline-variant/60 text-on-surface rounded-tl-none"
                  }`}
                >

                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.text}
                  </div>


                  {/* Real-data indicator */}

                  {message.sender ===
                    "ai" &&
                    message.grounded && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-secondary font-semibold">

                      <span className="material-symbols-outlined text-[13px]">
                        database
                      </span>

                      Live campus data

                    </div>
                  )}


                  <div
                    className={`text-[10px] mt-1.5 text-right ${
                      message.sender ===
                      "user"
                        ? "text-primary-fixed-dim"
                        : "text-outline"
                    }`}
                  >
                    {message.time}
                  </div>

                </div>

              </div>
            )
          )}


          {/* Typing */}

          {isTyping && (
            <div className="flex gap-3 items-center">

              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-secondary to-tertiary text-white flex items-center justify-center shrink-0 shadow-sm">

                <span className="material-symbols-outlined text-[18px]">
                  smart_toy
                </span>

              </div>


              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl px-4 py-3 text-xs text-outline flex items-center gap-1.5 shadow-xs">

                <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-bounce" />

                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />

                <span className="inline-block w-2 h-2 rounded-full bg-tertiary animate-bounce [animation-delay:0.4s]" />


                <span className="ml-2 font-medium">
                  Copilot is checking your academic data...
                </span>

              </div>

            </div>
          )}


          <div
            ref={
              chatBottomRef
            }
          />

        </div>


        {/* =================================================
            QUICK PROMPTS
        ================================================= */}

        {messages.length === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">

            {samplePrompts.map(
              (
                prompt,
                index
              ) => (
                <button
                  key={
                    index
                  }
                  type="button"
                  onClick={() =>
                    setInput(
                      prompt
                    )
                  }
                  className="text-left text-xs p-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-between group cursor-pointer"
                >

                  <span>
                    {prompt}
                  </span>


                  <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary">
                    arrow_forward
                  </span>

                </button>
              )
            )}

          </div>
        )}


        {/* =================================================
            INPUT
        ================================================= */}

        <form
          onSubmit={
            handleSend
          }
          className="relative flex items-center gap-2"
        >

          <input
            type="text"
            value={
              input
            }
            onChange={(
              event
            ) =>
              setInput(
                event.target.value
              )
            }
            placeholder="Ask about attendance, classes, assignments, exams, resources, or any academic topic..."
            disabled={
              isTyping
            }
            className="flex-1 py-3.5 pl-4 pr-12 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm disabled:opacity-70"
          />


          <button
            type="submit"
            disabled={
              !input.trim() ||
              isTyping
            }
            className="absolute right-2 p-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm flex items-center justify-center"
          >

            <span className="material-symbols-outlined text-[20px]">
              send
            </span>

          </button>

        </form>

      </main>


      {/* =================================================
          MOBILE NAV
      ================================================= */}

      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">

        <div className="flex justify-around items-center px-4 w-full h-full">

          <Link
            to="/dashboard"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              dashboard
            </span>

            <span className="text-[10px] mt-1">
              Home
            </span>
          </Link>


          <Link
            to="/attendance"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              analytics
            </span>

            <span className="text-[10px] mt-1">
              Attendance
            </span>
          </Link>


          <Link
            to="/ai-chat"
            className="flex flex-col items-center justify-center text-primary font-bold"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              smart_toy
            </span>

            <span className="text-[10px] mt-1">
              Copilot
            </span>
          </Link>


          <Link
            to="/assignments"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              assignment
            </span>

            <span className="text-[10px] mt-1">
              Tasks
            </span>
          </Link>


          <Link
            to="/profile"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">
              account_circle
            </span>

            <span className="text-[10px] mt-1">
              Profile
            </span>
          </Link>

        </div>

      </nav>

    </div>
  );
}