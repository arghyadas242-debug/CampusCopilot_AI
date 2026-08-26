import { Link, useLocation } from "react-router";

const adminNavigation = [
  { label: "Dashboard", path: "/admin", icon: "dashboard" },
  { label: "Students", path: "/admin/students", icon: "group" },
  { label: "Attendance", path: "/admin/attendance", icon: "fact_check" },
  { label: "Subjects", path: "/admin/subjects", icon: "menu_book" },
  { label: "Assignments", path: "/admin/assignments", icon: "assignment" },
  { label: "Exams", path: "/admin/exams", icon: "event_note" },
  { label: "Timetable", path: "/admin/timetable", icon: "calendar_view_week" },
  { label: "Notices", path: "/admin/notices", icon: "campaign" },
  { label: "Resources", path: "/admin/resources", icon: "folder_open" },
];

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/$/, "") || "/";

  const isActive = (path) =>
    path === "/admin"
      ? normalizedPath === path
      : normalizedPath === path || normalizedPath.startsWith(`${path}/`);

  return (
    <aside className="hidden md:flex flex-col h-screen w-[280px] fixed left-0 top-0 py-md bg-surface-container-low border-r border-outline-variant/30 z-40">
      <div className="px-md mb-lg flex items-center gap-sm">
        <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-lg">
          CC
        </div>

        <div>
          <h1 className="font-headline-lg-mobile text-primary font-bold">
            Admin Portal
          </h1>
          <p className="font-body-sm text-outline text-xs">
            Academic Office
          </p>
        </div>
      </div>

      <nav className="flex-1 px-sm space-y-1">
        {adminNavigation.map((item) => {
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 mx-2 px-4 py-2.5 rounded-xl transition-all ${
                active
                  ? "bg-secondary-container text-on-secondary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={
                  active
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span className="font-title-md text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
