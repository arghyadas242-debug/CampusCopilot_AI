import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import { authService } from "../../services/api";


const API_URL = "http://localhost:5000";


// =====================================================
// NOTIFICATION TYPE DESIGN
// =====================================================

const NOTIFICATION_META = {
  ASSIGNMENT: {
    icon: "assignment",
    label: "Assignment",
    iconClass:
      "bg-primary/10 text-primary border-primary/20",
  },

  EXAM: {
    icon: "event_note",
    label: "Exam",
    iconClass:
      "bg-error/10 text-error border-error/20",
  },

  NOTICE: {
    icon: "campaign",
    label: "Notice",
    iconClass:
      "bg-secondary-container text-on-secondary-container border-outline-variant/40",
  },

  RESOURCE: {
    icon: "folder_open",
    label: "Resource",
    iconClass:
      "bg-surface-container-high text-primary border-outline-variant/50",
  },

  TIMETABLE: {
    icon: "calendar_month",
    label: "Timetable",
    iconClass:
      "bg-primary/10 text-primary border-primary/20",
  },

  ATTENDANCE: {
    icon: "fact_check",
    label: "Attendance",
    iconClass:
      "bg-error-container text-on-error-container border-error/20",
  },

  SYSTEM: {
    icon: "info",
    label: "System",
    iconClass:
      "bg-gradient-to-br from-secondary to-tertiary text-white border-transparent",
  },
};


// =====================================================
// NORMALIZE ORACLE RESPONSE
// =====================================================

function normalizeNotification(item) {
  return {
    id:
      item.NOTIFICATION_ID ??
      item.notification_id,

    type:
      item.NOTIFICATION_TYPE ??
      item.notification_type ??
      "SYSTEM",

    title:
      item.TITLE ??
      item.title ??
      "Notification",

    message:
      item.MESSAGE_TEXT ??
      item.message_text ??
      "",

    actionUrl:
      item.ACTION_URL ??
      item.action_url ??
      "/notifications",

    isRead:
      Number(
        item.IS_READ ??
          item.is_read ??
          0
      ) === 1,

    createdAt:
      item.CREATED_AT ??
      item.created_at ??
      null,
  };
}


// =====================================================
// FORMAT RELATIVE TIME
// =====================================================

function formatRelativeTime(value) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const difference =
    Date.now() - date.getTime();

  const minutes =
    Math.floor(
      difference / 60000
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  );
}


// =====================================================
// COMPONENT
// =====================================================

export default function StudentNotificationBell() {
  const navigate =
    useNavigate();

  const containerRef =
    useRef(null);


  const [open, setOpen] =
    useState(false);

  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  // =====================================================
  // LOGGED-IN STUDENT
  // =====================================================

  const currentUser =
    authService.getCurrentUser();


  const studentRoll =
    currentUser?.rollNumber ||
    currentUser?.studentRoll ||
    currentUser?.roll_number ||
    "";


  // =====================================================
  // UNREAD COUNT
  // =====================================================

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.isRead
    ).length;


  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const loadNotifications =
    useCallback(async () => {

      if (!studentRoll) {
        setNotifications([]);
        setError(
          "Student information unavailable"
        );

        return;
      }


      try {
        setLoading(true);
        setError("");


        const response =
          await fetch(
            `${API_URL}/api/notifications/${encodeURIComponent(
              studentRoll
            )}`
          );


        const data =
          await response.json();


        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load notifications"
          );
        }


        const rawNotifications =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data.notifications
              )
            ? data.notifications
            : [];


        const normalized =
          rawNotifications.map(
            normalizeNotification
          );


        setNotifications(
          normalized
        );

      } catch (err) {

        console.error(
          "Notification bell load error:",
          err
        );


        setError(
          err.message ||
            "Unable to load notifications"
        );

      } finally {

        setLoading(false);
      }

    }, [studentRoll]);


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);


  // =====================================================
  // POLLING
  //
  // Refresh every 30 seconds so new academic
  // notifications appear without a page reload.
  // =====================================================

  useEffect(() => {

    if (!studentRoll) {
      return;
    }


    const interval =
      window.setInterval(
        () => {
          loadNotifications();
        },
        30000
      );


    return () => {
      window.clearInterval(
        interval
      );
    };

  }, [
    studentRoll,
    loadNotifications,
  ]);


  // =====================================================
  // REFRESH WHEN DROPDOWN OPENS
  // =====================================================

  useEffect(() => {

    if (open) {
      loadNotifications();
    }

  }, [
    open,
    loadNotifications,
  ]);


  // =====================================================
  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // =====================================================

  useEffect(() => {

    const handleOutsideClick =
      (event) => {

        if (
          containerRef.current &&
          !containerRef.current.contains(
            event.target
          )
        ) {
          setOpen(false);
        }
      };


    const handleEscape =
      (event) => {

        if (
          event.key === "Escape"
        ) {
          setOpen(false);
        }
      };


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    document.addEventListener(
      "keydown",
      handleEscape
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );


      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };

  }, []);


  // =====================================================
  // MARK ONE AS READ
  // =====================================================

  const markAsRead =
    async (notificationId) => {

      try {

        const response =
          await fetch(
            `${API_URL}/api/notifications/${notificationId}/read`,
            {
              method: "PATCH",
            }
          );


        const data =
          await response.json();


        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to mark notification as read"
          );
        }


        setNotifications(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                notificationId
                  ? {
                      ...item,
                      isRead: true,
                    }
                  : item
            )
        );


        return true;

      } catch (err) {

        console.error(
          "Notification read error:",
          err
        );


        return false;
      }
    };


  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const markAllAsRead =
    async () => {

      if (
        !studentRoll ||
        unreadCount === 0
      ) {
        return;
      }


      try {

        const response =
          await fetch(
            `${API_URL}/api/notifications/${encodeURIComponent(
              studentRoll
            )}/read-all`,
            {
              method: "PATCH",
            }
          );


        const data =
          await response.json();


        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to mark notifications as read"
          );
        }


        setNotifications(
          (previous) =>
            previous.map(
              (item) => ({
                ...item,
                isRead: true,
              })
            )
        );

      } catch (err) {

        console.error(
          "Mark all notifications error:",
          err
        );
      }
    };


  // =====================================================
  // OPEN NOTIFICATION
  // =====================================================

  const handleNotificationClick =
    async (notification) => {

      if (!notification.isRead) {
        await markAsRead(
          notification.id
        );
      }


      setOpen(false);


      navigate(
        notification.actionUrl ||
          "/notifications"
      );
    };


  // =====================================================
  // DISPLAY ONLY MOST RECENT 5
  // =====================================================

  const recentNotifications =
    notifications.slice(
      0,
      5
    );


  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      ref={containerRef}
      className="relative"
    >

      {/* =================================================
          NOTIFICATION BELL
      ================================================= */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (previous) =>
              !previous
          )
        }
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"
        }
        className="relative w-10 h-10 rounded-full md:rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high border border-transparent md:border-outline-variant/60 md:bg-surface-container-lowest transition-all active:scale-95 cursor-pointer md:shadow-sm"
      >

        <span
          className="material-symbols-outlined text-[22px]"
          style={{
            fontVariationSettings:
              unreadCount > 0
                ? "'FILL' 1"
                : "'FILL' 0",
          }}
        >
          notifications
        </span>


        {/* Unread badge */}

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-error text-white border-2 border-background flex items-center justify-center text-[9px] font-bold shadow-sm">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}

      </button>


      {/* =================================================
          DROPDOWN
      ================================================= */}

      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,390px)] bg-surface-container-lowest border border-outline-variant/70 rounded-2xl shadow-2xl overflow-hidden z-[100]">

          {/* Header */}

          <div className="px-4 py-4 border-b border-outline-variant/50 flex items-start justify-between gap-3">

            <div>

              <div className="flex items-center gap-2">

                <h3 className="font-title-md text-on-surface font-bold">
                  Notifications
                </h3>


                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-[10px] font-bold">
                    {unreadCount} NEW
                  </span>
                )}

              </div>


              <p className="font-body-sm text-on-surface-variant mt-1">
                Your latest academic updates
              </p>

            </div>


            {unreadCount > 0 && (
              <button
                type="button"
                onClick={
                  markAllAsRead
                }
                className="font-label-caps text-[10px] text-primary font-bold hover:underline cursor-pointer whitespace-nowrap mt-1"
              >
                MARK ALL READ
              </button>
            )}

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading &&
            notifications.length ===
              0 && (
              <div className="py-10 px-5 text-center">

                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">

                  <span className="material-symbols-outlined text-primary text-[26px] animate-pulse">
                    notifications
                  </span>

                </div>


                <p className="font-body-sm text-on-surface-variant mt-3">
                  Loading notifications...
                </p>

              </div>
            )}


          {/* =================================================
              ERROR
          ================================================= */}

          {!loading &&
            error &&
            notifications.length ===
              0 && (
              <div className="py-8 px-5 text-center">

                <div className="w-12 h-12 mx-auto rounded-full bg-error/10 flex items-center justify-center">

                  <span className="material-symbols-outlined text-error">
                    error
                  </span>

                </div>


                <p className="font-body-sm text-on-surface-variant mt-3">
                  {error}
                </p>


                <button
                  type="button"
                  onClick={
                    loadNotifications
                  }
                  className="font-body-sm text-primary font-semibold mt-2 hover:underline cursor-pointer"
                >
                  Try again
                </button>

              </div>
            )}


          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {!loading &&
            !error &&
            notifications.length ===
              0 && (
              <div className="py-10 px-5 text-center">

                <div className="w-12 h-12 mx-auto rounded-full bg-surface-container-high flex items-center justify-center">

                  <span className="material-symbols-outlined text-outline text-[26px]">
                    notifications_none
                  </span>

                </div>


                <h4 className="font-title-md text-on-surface font-semibold mt-3">
                  You're all caught up
                </h4>


                <p className="font-body-sm text-on-surface-variant mt-1">
                  New academic updates will appear here.
                </p>

              </div>
            )}


          {/* =================================================
              NOTIFICATION LIST
          ================================================= */}

          {recentNotifications.length >
            0 && (
            <div className="max-h-[390px] overflow-y-auto">

              {recentNotifications.map(
                (notification) => {

                  const meta =
                    NOTIFICATION_META[
                      notification.type
                    ] ||
                    NOTIFICATION_META.SYSTEM;


                  return (
                    <button
                      type="button"
                      key={
                        notification.id
                      }
                      onClick={() =>
                        handleNotificationClick(
                          notification
                        )
                      }
                      className={`w-full px-4 py-3.5 text-left flex items-start gap-3 border-b border-outline-variant/30 last:border-b-0 transition-colors cursor-pointer ${
                        notification.isRead
                          ? "bg-surface-container-lowest hover:bg-surface-container-low"
                          : "bg-secondary-container/10 hover:bg-secondary-container/20"
                      }`}
                    >

                      {/* Icon */}

                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.iconClass}`}
                      >

                        <span className="material-symbols-outlined text-[20px]">
                          {meta.icon}
                        </span>

                      </div>


                      {/* Content */}

                      <div className="flex-1 min-w-0">

                        <div className="flex items-start justify-between gap-3">

                          <h4
                            className={`font-body-md text-on-surface text-sm ${
                              notification.isRead
                                ? "font-semibold"
                                : "font-bold"
                            }`}
                          >
                            {
                              notification.title
                            }
                          </h4>


                          {!notification.isRead && (
                            <span className="w-2 h-2 rounded-full bg-secondary shrink-0 mt-1.5" />
                          )}

                        </div>


                        <p className="font-body-sm text-on-surface-variant text-xs mt-1 leading-relaxed max-h-[40px] overflow-hidden">
                          {
                            notification.message
                          }
                        </p>


                        <div className="flex items-center gap-2 mt-2">

                          <span className="font-label-caps text-primary text-[9px] font-bold">
                            {meta.label}
                          </span>


                          <span className="w-1 h-1 rounded-full bg-outline-variant" />


                          <span className="font-body-sm text-outline text-[11px]">
                            {formatRelativeTime(
                              notification.createdAt
                            )}
                          </span>

                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}


          {/* =================================================
              FOOTER
          ================================================= */}

          {notifications.length >
            0 && (
            <div className="p-3 border-t border-outline-variant/50 bg-surface-container-low/50">

              <Link
                to="/notifications"
                onClick={() =>
                  setOpen(false)
                }
                className="w-full py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-primary font-body-sm font-semibold hover:bg-primary/5 transition-colors"
              >

                View all notifications

                <span className="material-symbols-outlined text-[17px]">
                  arrow_forward
                </span>

              </Link>

            </div>
          )}

        </div>
      )}

    </div>
  );
}