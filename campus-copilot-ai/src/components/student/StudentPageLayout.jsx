import { Link } from "react-router";

import StudentNotificationBell from "../../pages/student/StudentNotificationBell";
import StudentPageHero from "./StudentPageHero";
import StudentSidebar, { StudentMobileNavigation } from "./StudentSidebar";
import { authService } from "../../services/api";

function getStudentInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "--";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function StudentPageLayout({
  activePath,
  eyebrow,
  title,
  subtitle,
  children,
  contentClassName = "",
}) {
  const currentUser = authService.getCurrentUser();

  return (
    <div className="flex min-h-screen bg-background font-body-md text-on-background">
      <StudentSidebar activePath={activePath} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-50 flex h-[64px] items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile lg:hidden">
          <div className="flex items-center gap-sm">
            <Link
              to="/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container font-bold text-on-primary-container"
            >
              {getStudentInitials(currentUser?.name)}
            </Link>
            <span className="font-headline-lg-mobile font-bold text-primary">
              CampusCopilot
            </span>
          </div>

          <StudentNotificationBell />
        </header>

        <main className={`w-full px-margin-mobile py-md pb-[96px] md:px-lg lg:pb-lg ${contentClassName}`}>
          <StudentPageHero eyebrow={eyebrow} title={title} subtitle={subtitle} />
          {children}
        </main>

        <StudentMobileNavigation activePath={activePath} />
      </div>
    </div>
  );
}
