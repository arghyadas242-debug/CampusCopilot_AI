import { NavLink } from "react-router";
import { Home, Calendar, Bot, BookOpen, User } from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/timetable", icon: Calendar, label: "Schedule" },
  { to: "/ai-chat", icon: Bot, label: "AI" },
  { to: "/resources", icon: BookOpen, label: "Resources" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-200 z-50">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive
                  ? "text-teal-600 bg-teal-50"
                  : "text-slate-400 hover:text-slate-600"
              }`
            }
          >
            <Icon size={20} strokeWidth={isActive => isActive ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
