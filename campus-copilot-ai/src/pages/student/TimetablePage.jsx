import { useState } from "react";
import { Link } from "react-router";

export default function TimetablePage() {
  const [selectedDay, setSelectedDay] = useState("Monday");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const scheduleData = {
    Monday: [
      {
        time: "10:00 AM - 11:30 AM",
        subject: "Database Management Systems (CS-301)",
        room: "Room 302",
        faculty: "Prof. Alan Turing",
        type: "Lecture",
        color: "bg-secondary",
        badgeColor: "bg-secondary-container text-on-secondary-container",
      },
      {
        time: "11:45 AM - 01:15 PM",
        subject: "Computer Networks (CS-302)",
        room: "Room 405",
        faculty: "Prof. Grace Hopper",
        type: "Lecture",
        color: "bg-primary",
        badgeColor: "bg-primary-container text-on-primary-container",
      },
      {
        time: "02:00 PM - 04:00 PM",
        subject: "DBMS Laboratory (CS-301P)",
        room: "Software Lab 2",
        faculty: "Prof. Alan Turing",
        type: "Practical",
        color: "bg-tertiary",
        badgeColor: "bg-tertiary-container text-on-tertiary",
      },
    ],
    Tuesday: [
      {
        time: "09:30 AM - 11:00 AM",
        subject: "Operating Systems (CS-303)",
        room: "Room 201",
        faculty: "Prof. Linus Torvalds",
        type: "Lecture",
        color: "bg-primary",
        badgeColor: "bg-primary-container text-on-primary-container",
      },
      {
        time: "11:30 AM - 01:00 PM",
        subject: "Theory of Computation (CS-304)",
        room: "Room 305",
        faculty: "Prof. John von Neumann",
        type: "Lecture",
        color: "bg-secondary",
        badgeColor: "bg-secondary-container text-on-secondary-container",
      },
    ],
    Wednesday: [
      {
        time: "10:00 AM - 11:30 AM",
        subject: "Database Management Systems (CS-301)",
        room: "Room 302",
        faculty: "Prof. Alan Turing",
        type: "Lecture",
        color: "bg-secondary",
        badgeColor: "bg-secondary-container text-on-secondary-container",
      },
      {
        time: "01:30 PM - 03:30 PM",
        subject: "Networks Lab (CS-302P)",
        room: "Hardware Lab 1",
        faculty: "Prof. Grace Hopper",
        type: "Practical",
        color: "bg-tertiary",
        badgeColor: "bg-tertiary-container text-on-tertiary",
      },
    ],
    Thursday: [
      {
        time: "10:00 AM - 11:30 AM",
        subject: "Operating Systems (CS-303)",
        room: "Room 201",
        faculty: "Prof. Linus Torvalds",
        type: "Lecture",
        color: "bg-primary",
        badgeColor: "bg-primary-container text-on-primary-container",
      },
      {
        time: "12:00 PM - 01:30 PM",
        subject: "Ethics in Tech (HU-101)",
        room: "Seminar Hall",
        faculty: "Dr. Ada Lovelace",
        type: "Seminar",
        color: "bg-secondary",
        badgeColor: "bg-secondary-container text-on-secondary-container",
      },
    ],
    Friday: [
      {
        time: "09:30 AM - 11:00 AM",
        subject: "Theory of Computation (CS-304)",
        room: "Room 305",
        faculty: "Prof. John von Neumann",
        type: "Lecture",
        color: "bg-secondary",
        badgeColor: "bg-secondary-container text-on-secondary-container",
      },
      {
        time: "11:30 AM - 01:00 PM",
        subject: "Computer Networks (CS-302)",
        room: "Room 405",
        faculty: "Prof. Grace Hopper",
        type: "Lecture",
        color: "bg-primary",
        badgeColor: "bg-primary-container text-on-primary-container",
      },
      {
        time: "02:00 PM - 03:30 PM",
        subject: "Project Mentorship & Review",
        room: "Incubation Center",
        faculty: "Dean Academic",
        type: "Review",
        color: "bg-tertiary",
        badgeColor: "bg-tertiary-container text-on-tertiary",
      },
    ],
  };

  const currentSchedule = scheduleData[selectedDay] || [];

  return (
    <div className="bg-background text-on-background font-body-sm min-h-screen flex flex-col">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-background border-b border-surface-container-high flex justify-between items-center px-margin-mobile py-sm md:px-margin-desktop md:py-md">
        <div className="flex items-center gap-sm">
          <Link to="/profile" className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            RD
          </Link>
          <span className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">CampusCopilot</span>
        </div>

        <nav className="hidden md:flex items-center gap-md">
          <Link to="/dashboard" className="font-body-md text-on-surface-variant hover:text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">dashboard</span> Home
          </Link>
          <Link to="/timetable" className="font-body-md text-primary font-bold flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span> Timetable
          </Link>
          <Link to="/attendance" className="font-body-md text-on-surface-variant hover:text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">analytics</span> Attendance
          </Link>
          <Link to="/ai-chat" className="font-body-md text-on-surface-variant hover:text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">smart_toy</span> Copilot
          </Link>
          <Link to="/assignments" className="font-body-md text-on-surface-variant hover:text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">assignment</span> Tasks
          </Link>
        </nav>

        <Link to="/campus" className="text-on-surface-variant hover:opacity-80 p-2 rounded-full hover:bg-surface-container">
          <span className="material-symbols-outlined">notifications</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop pt-md pb-[96px] md:pb-xl flex flex-col gap-md">
        <div>
          <h1 className="font-headline-lg md:font-display-lg text-primary tracking-tight font-bold">Class Timetable</h1>
          <p className="font-body-md text-on-surface-variant mt-1">Weekly schedule, venue navigation, and faculty assignments.</p>
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-5 py-2 rounded-full font-title-md text-sm transition-all cursor-pointer ${
                selectedDay === day
                  ? "bg-primary text-on-primary shadow-md"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Schedule Timeline */}
        <div className="flex flex-col gap-4 mt-2">
          {currentSchedule.map((slot, index) => (
            <div
              key={index}
              className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-md shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all"
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${slot.color}`} />
              <div className="flex-1 pl-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${slot.badgeColor}`}>
                    {slot.type}
                  </span>
                  <span className="font-mono-sm text-xs text-outline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {slot.time}
                  </span>
                </div>
                <h3 className="font-title-md font-bold text-on-surface text-lg">{slot.subject}</h3>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-on-surface-variant">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                    <span>{slot.room}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                    <span>{slot.faculty}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <Link
                  to="/ai-chat"
                  className="px-3.5 py-1.5 rounded-lg border border-secondary text-secondary hover:bg-secondary-container font-semibold text-xs transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">smart_toy</span> Ask Copilot
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Nav Bar (Mobile) */}
      <nav className="fixed bottom-0 w-full z-50 h-[64px] bg-surface border-t border-surface-container-high shadow-lg md:hidden">
        <div className="flex justify-around items-center px-margin-mobile w-full h-full">
          <Link to="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] mt-1">Home</span>
          </Link>
          <Link to="/timetable" className="flex flex-col items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              calendar_month
            </span>
            <span className="text-[10px] mt-1">Timetable</span>
          </Link>
          <Link to="/attendance" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-[10px] mt-1">Attendance</span>
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
