import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";

const API_URL = "http://localhost:5000";

const DEFAULT_NOTIFICATIONS = [
  {
    NOTIFICATION_ID: 1,
    NOTIFICATION_TYPE: "SYSTEM",
    TITLE: "AI Study Plan Adjusted",
    MESSAGE_TEXT:
      "Your Copilot detected a pattern in your recent quiz scores and suggested shifting focus to Advanced Calculus.",
    RELATED_TYPE: "AI_PLAN",
    ACTION_URL: "/ai-chat",
    IS_READ: 0,
    CREATED_AT: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    isToday: true,
  },
  {
    NOTIFICATION_ID: 2,
    NOTIFICATION_TYPE: "ASSIGNMENT",
    TITLE: "Physics Lab Report Due",
    MESSAGE_TEXT:
      "Don't forget to submit your report for Lab 4: Kinematics by 11:59 PM tonight.",
    RELATED_TYPE: "ASSIGNMENT",
    ACTION_URL: "/assignments",
    IS_READ: 0,
    CREATED_AT: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    isToday: true,
  },
  {
    NOTIFICATION_ID: 3,
    NOTIFICATION_TYPE: "EXAM",
    TITLE: "Midterm Location Changed",
    MESSAGE_TEXT:
      "The location for CS201 Midterm has been moved from Hall A to Science Center Auditorium.",
    RELATED_TYPE: "EXAM",
    ACTION_URL: "/exams",
    IS_READ: 1,
    CREATED_AT: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isToday: false,
  },
  {
    NOTIFICATION_ID: 4,
    NOTIFICATION_TYPE: "NOTICE",
    TITLE: "Library Extended Hours",
    MESSAGE_TEXT:
      "The Main Library will remain open 24/7 starting next Monday for finals week preparation.",
    RELATED_TYPE: "NOTICE",
    ACTION_URL: "/notices",
    IS_READ: 1,
    CREATED_AT: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    isToday: false,
  },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [loading, setLoading] = useState(true);
  const [studentRoll, setStudentRoll] = useState("12024002037008");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.rollNumber) {
          setStudentRoll(parsed.rollNumber);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    async function loadNotifications() {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/notifications/${encodeURIComponent(studentRoll)}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setNotifications(data);
          }
        }
      } catch (err) {
        console.warn("Notifications using fallback data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, [studentRoll]);

  const handleMarkAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.NOTIFICATION_ID === id ? { ...item, IS_READ: 1 } : item))
    );

    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
      });
    } catch (err) {
      console.warn("Could not sync read status with backend:", err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, IS_READ: 1 })));

    try {
      await fetch(`${API_URL}/api/notifications/${encodeURIComponent(studentRoll)}/read-all`, {
        method: "PATCH",
      });
    } catch (err) {
      console.warn("Could not sync mark-all-read status with backend:", err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((item) => item.NOTIFICATION_ID !== id));

    try {
      await fetch(`${API_URL}/api/notifications/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Could not sync delete with backend:", err);
    }
  };

  // Group notifications into Today and Yesterday / Earlier
  const isNotificationToday = (item) => {
    if (item.isToday !== undefined) return item.isToday;
    if (!item.CREATED_AT) return true;
    const itemDate = new Date(item.CREATED_AT);
    const today = new Date();
    return (
      itemDate.getDate() === today.getDate() &&
      itemDate.getMonth() === today.getMonth() &&
      itemDate.getFullYear() === today.getFullYear()
    );
  };

  const todayList = notifications.filter((n) => isNotificationToday(n));
  const olderList = notifications.filter((n) => !isNotificationToday(n));

  const formatRelativeTime = (isoString, fallback) => {
    if (!isoString) return fallback || "Recently";
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffHours < 48) return "Yesterday";
      return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) {
      return fallback || "Recently";
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "SYSTEM":
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-tertiary flex items-center justify-center shrink-0 text-white shadow-sm">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </div>
        );
      case "ASSIGNMENT":
        return (
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-primary border border-outline-variant/50">
            <span className="material-symbols-outlined text-[20px]">schedule</span>
          </div>
        );
      case "EXAM":
        return (
          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0 text-error border border-error/20">
            <span className="material-symbols-outlined text-[20px]">warning</span>
          </div>
        );
      case "NOTICE":
        return (
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-secondary border border-outline-variant/50">
            <span className="material-symbols-outlined text-[20px]">campaign</span>
          </div>
        );
      case "ATTENDANCE":
        return (
          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0 text-on-secondary-container border border-outline-variant/50">
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary border border-primary/20">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </div>
        );
    }
  };

  const renderNotificationCard = (item) => {
    const isUnread = item.IS_READ === 0;

    return (
      <article
        key={item.NOTIFICATION_ID}
        onClick={() => handleMarkAsRead(item.NOTIFICATION_ID)}
        className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex gap-md relative overflow-hidden group hover:shadow-sm transition-all cursor-pointer ${
          !isUnread ? "opacity-80 hover:opacity-100" : ""
        }`}
      >
        {/* Unread Indicator */}
        {isUnread && (
          <div className="absolute top-md left-3 w-2 h-2 rounded-full bg-primary-container" />
        )}

        {getNotificationIcon(item.NOTIFICATION_TYPE)}

        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between items-start w-full">
            <h4 className="font-title-md text-title-md text-on-surface font-semibold">
              {item.TITLE}
            </h4>
            <div className="flex items-center gap-2">
              <span className="font-body-sm text-body-sm text-outline whitespace-nowrap text-xs">
                {formatRelativeTime(item.CREATED_AT)}
              </span>
              <button
                type="button"
                onClick={(e) => handleDelete(e, item.NOTIFICATION_ID)}
                title="Dismiss"
                className="opacity-0 group-hover:opacity-100 text-outline hover:text-error transition-all p-1 rounded-lg hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          <p className="font-body-sm text-body-sm text-on-surface-variant text-sm">
            {item.MESSAGE_TEXT}
          </p>

          {item.ACTION_URL && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead(item.NOTIFICATION_ID);
                  navigate(item.ACTION_URL);
                }}
                className="bg-primary text-on-primary font-body-sm text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-primary-container transition-colors shadow-xs"
              >
                {item.NOTIFICATION_TYPE === "SYSTEM"
                  ? "Review Plan"
                  : item.NOTIFICATION_TYPE === "ASSIGNMENT"
                  ? "View Assignment"
                  : item.NOTIFICATION_TYPE === "EXAM"
                  ? "Exam Details"
                  : "View Details"}
              </button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col pt-16 pb-20 md:pb-12">
      {/* TopAppBar */}
      <header className="flex items-center px-margin-mobile h-16 w-full fixed top-0 z-50 bg-surface border-b border-outline-variant">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 hover:bg-surface-container-high transition-colors active:scale-95 p-2 rounded-full flex items-center justify-center text-primary cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold tracking-tight">
          Notifications
        </h1>
      </header>

      {/* Main Canvas */}
      <main className="grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-md flex flex-col gap-lg">
        {/* Header Actions */}
        <div className="flex justify-between items-center w-full">
          <h2 className="font-title-md text-title-md text-on-surface font-bold">
            Your Updates
          </h2>
          <button
            onClick={handleMarkAllRead}
            className="font-label-caps text-label-caps text-primary hover:text-primary-container transition-colors py-2 px-4 rounded-full border border-primary/20 hover:bg-primary/5 active:scale-95 cursor-pointer font-semibold"
          >
            Mark all as read
          </button>
        </div>

        {/* Notification List */}
        <div className="flex flex-col gap-md">
          {notifications.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-10 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-2">
                notifications_off
              </span>
              <h3 className="font-title-md font-bold text-on-surface">No notifications</h3>
              <p className="font-body-sm text-outline text-xs mt-1">
                You're all caught up with your classes, assignments, and announcements.
              </p>
            </div>
          ) : (
            <>
              {/* Group: Today */}
              {todayList.length > 0 && (
                <section className="flex flex-col gap-xs">
                  <h3 className="font-label-caps text-label-caps text-outline ml-2 text-xs font-bold uppercase tracking-wider">
                    Today
                  </h3>
                  <div className="flex flex-col gap-3">
                    {todayList.map((item) => renderNotificationCard(item))}
                  </div>
                </section>
              )}

              {/* Group: Yesterday / Earlier */}
              {olderList.length > 0 && (
                <section className="flex flex-col gap-xs mt-4">
                  <h3 className="font-label-caps text-label-caps text-outline ml-2 text-xs font-bold uppercase tracking-wider">
                    Yesterday & Earlier
                  </h3>
                  <div className="flex flex-col gap-3">
                    {olderList.map((item) => renderNotificationCard(item))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* BottomNavBar for Mobile */}
      <nav className="fixed bottom-0 w-full h-16 z-50 flex justify-around items-center px-4 bg-surface border-t border-outline-variant md:hidden">
        <Link
          to="/dashboard"
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-90 p-2 rounded-lg w-16 h-14"
        >
          <span className="material-symbols-outlined">home</span>
          <span className="font-label-caps text-[10px] mt-0.5">Home</span>
        </Link>
        <Link
          to="/timetable"
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-90 p-2 rounded-lg w-16 h-14"
        >
          <span className="material-symbols-outlined">calendar_month</span>
          <span className="font-label-caps text-[10px] mt-0.5">Schedule</span>
        </Link>
        <Link
          to="/notifications"
          className="flex flex-col items-center justify-center text-primary font-bold hover:bg-surface-container-low transition-colors active:scale-90 p-2 rounded-lg w-16 h-14 relative"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="font-label-caps text-[10px] mt-0.5">Alerts</span>
          {/* Active Indicator Dot */}
          <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
        </Link>
        <Link
          to="/profile"
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-90 p-2 rounded-lg w-16 h-14"
        >
          <span className="material-symbols-outlined">person</span>
          <span className="font-label-caps text-[10px] mt-0.5">Profile</span>
        </Link>
      </nav>
    </div>
  );
}

