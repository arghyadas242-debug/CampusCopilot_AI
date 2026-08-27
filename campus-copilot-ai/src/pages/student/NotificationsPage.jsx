import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { authService } from "../../services/api";

const API_URL = "http://localhost:5000";


export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


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
  // CHECK WHETHER ANY UNREAD NOTIFICATION EXISTS
  // =====================================================

  const hasUnreadNotifications =
    notifications.some(
      (item) =>
        Number(item.IS_READ) === 0
    );


  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");


      if (!studentRoll) {
        throw new Error(
          "Student roll number was not found. Please log in again."
        );
      }


      const response = await fetch(
        `${API_URL}/api/notifications/${encodeURIComponent(
          studentRoll
        )}`
      );


      const data = await response.json();


      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load notifications"
        );
      }


      setNotifications(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {

      console.error(
        "Notification loading error:",
        err
      );


      setError(
        err.message ||
          "Unable to load notifications."
      );


      setNotifications([]);

    } finally {

      setLoading(false);
    }
  };


  useEffect(() => {
    loadNotifications();
  }, [studentRoll]);


  // =====================================================
  // MARK ONE AS READ
  // =====================================================

  const handleMarkAsRead = async (id) => {
    const notification =
      notifications.find(
        (item) =>
          Number(
            item.NOTIFICATION_ID
          ) === Number(id)
      );


    if (!notification) {
      return false;
    }


    if (
      Number(
        notification.IS_READ
      ) === 1
    ) {
      return true;
    }


    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${id}/read`,
        {
          method: "PATCH",
        }
      );


      const data = await response.json();


      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to mark notification as read"
        );
      }


      setNotifications((prev) =>
        prev.map((item) =>
          Number(
            item.NOTIFICATION_ID
          ) === Number(id)
            ? {
                ...item,
                IS_READ: 1,
              }
            : item
        )
      );


      return true;

    } catch (err) {

      console.error(
        "Mark notification read error:",
        err
      );


      return false;
    }
  };


  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const handleMarkAllRead = async () => {
    if (
      !studentRoll ||
      !hasUnreadNotifications
    ) {
      return;
    }


    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${encodeURIComponent(
          studentRoll
        )}/read-all`,
        {
          method: "PATCH",
        }
      );


      const data = await response.json();


      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to mark all notifications as read"
        );
      }


      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          IS_READ: 1,
        }))
      );

    } catch (err) {

      console.error(
        "Mark all read error:",
        err
      );
    }
  };


  // =====================================================
  // DELETE NOTIFICATION
  // =====================================================

  const handleDelete = async (
    event,
    id
  ) => {
    event.stopPropagation();


    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${id}`,
        {
          method: "DELETE",
        }
      );


      const data = await response.json();


      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to delete notification"
        );
      }


      setNotifications((prev) =>
        prev.filter(
          (item) =>
            Number(
              item.NOTIFICATION_ID
            ) !== Number(id)
        )
      );

    } catch (err) {

      console.error(
        "Delete notification error:",
        err
      );
    }
  };


  // =====================================================
  // OPEN NOTIFICATION
  // =====================================================

  const handleOpenNotification =
    async (item) => {

      if (
        Number(item.IS_READ) === 0
      ) {
        await handleMarkAsRead(
          item.NOTIFICATION_ID
        );
      }


      if (item.ACTION_URL) {
        navigate(
          item.ACTION_URL
        );
      }
    };


  // =====================================================
  // CHECK TODAY
  // =====================================================

  const isNotificationToday = (
    item
  ) => {
    if (!item.CREATED_AT) {
      return true;
    }


    const itemDate =
      new Date(
        item.CREATED_AT
      );


    const today =
      new Date();


    return (
      itemDate.getDate() ===
        today.getDate() &&
      itemDate.getMonth() ===
        today.getMonth() &&
      itemDate.getFullYear() ===
        today.getFullYear()
    );
  };


  const todayList =
    notifications.filter(
      (item) =>
        isNotificationToday(
          item
        )
    );


  const olderList =
    notifications.filter(
      (item) =>
        !isNotificationToday(
          item
        )
    );


  // =====================================================
  // FORMAT RELATIVE TIME
  // =====================================================

  const formatRelativeTime = (
    isoString
  ) => {
    if (!isoString) {
      return "Recently";
    }


    try {
      const date =
        new Date(isoString);


      const diffMs =
        Date.now() -
        date.getTime();


      const diffMins =
        Math.floor(
          diffMs / 60000
        );


      if (diffMins < 1) {
        return "Just now";
      }


      if (diffMins < 60) {
        return `${diffMins}m ago`;
      }


      const diffHours =
        Math.floor(
          diffMins / 60
        );


      if (diffHours < 24) {
        return `${diffHours}h ago`;
      }


      if (diffHours < 48) {
        return "Yesterday";
      }


      return date.toLocaleDateString(
        "en-IN",
        {
          month: "short",
          day: "numeric",
        }
      );

    } catch {
      return "Recently";
    }
  };


  // =====================================================
  // NOTIFICATION ICON
  // =====================================================

  const getNotificationIcon = (
    type
  ) => {
    switch (type) {

      case "ASSIGNMENT":
        return (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary border border-primary/20">
            <span className="material-symbols-outlined text-[20px]">
              assignment
            </span>
          </div>
        );


      case "EXAM":
        return (
          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0 text-error border border-error/20">
            <span className="material-symbols-outlined text-[20px]">
              event_note
            </span>
          </div>
        );


      case "NOTICE":
        return (
          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0 text-on-secondary-container border border-outline-variant/50">
            <span className="material-symbols-outlined text-[20px]">
              campaign
            </span>
          </div>
        );


      case "RESOURCE":
        return (
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-primary border border-outline-variant/50">
            <span className="material-symbols-outlined text-[20px]">
              folder_open
            </span>
          </div>
        );


      case "TIMETABLE":
        return (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary border border-primary/20">
            <span className="material-symbols-outlined text-[20px]">
              calendar_month
            </span>
          </div>
        );


      case "ATTENDANCE":
        return (
          <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0 text-on-error-container border border-error/20">
            <span className="material-symbols-outlined text-[20px]">
              fact_check
            </span>
          </div>
        );


      case "SYSTEM":
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-tertiary flex items-center justify-center shrink-0 text-white shadow-sm">
            <span className="material-symbols-outlined text-[20px]">
              info
            </span>
          </div>
        );


      default:
        return (
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-primary border border-outline-variant/50">
            <span className="material-symbols-outlined text-[20px]">
              notifications
            </span>
          </div>
        );
    }
  };


  // =====================================================
  // ACTION BUTTON LABEL
  // =====================================================

  const getActionLabel = (
    type
  ) => {
    switch (type) {

      case "ASSIGNMENT":
        return "View Assignment";


      case "EXAM":
        return "Exam Details";


      case "NOTICE":
        return "View Notice";


      case "RESOURCE":
        return "Open Resource";


      case "TIMETABLE":
        return "View Timetable";


      case "ATTENDANCE":
        return "View Attendance";


      default:
        return "View Details";
    }
  };


  // =====================================================
  // NOTIFICATION CARD
  // =====================================================

  const renderNotificationCard = (
    item
  ) => {
    const isUnread =
      Number(
        item.IS_READ
      ) === 0;


    return (
      <article
        key={
          item.NOTIFICATION_ID
        }
        onClick={() =>
          handleOpenNotification(
            item
          )
        }
        className={`bg-surface-container-lowest border rounded-xl p-md flex gap-md relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
          isUnread
            ? "border-primary/30 shadow-sm"
            : "border-outline-variant opacity-80 hover:opacity-100"
        }`}
      >

        {/* Unread Indicator */}

        {isUnread && (
          <div className="absolute top-md left-3 w-2 h-2 rounded-full bg-secondary" />
        )}


        {getNotificationIcon(
          item.NOTIFICATION_TYPE
        )}


        <div className="flex flex-col gap-1 w-full min-w-0">

          <div className="flex justify-between items-start w-full gap-3">

            <h4
              className={`font-title-md text-on-surface ${
                isUnread
                  ? "font-bold"
                  : "font-semibold"
              }`}
            >
              {item.TITLE}
            </h4>


            <div className="flex items-center gap-2 shrink-0">

              <span className="font-body-sm text-outline whitespace-nowrap text-xs">
                {formatRelativeTime(
                  item.CREATED_AT
                )}
              </span>


              <button
                type="button"
                onClick={(event) =>
                  handleDelete(
                    event,
                    item.NOTIFICATION_ID
                  )
                }
                title="Dismiss"
                className="opacity-0 group-hover:opacity-100 text-outline hover:text-error transition-all p-1 rounded-lg hover:bg-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
              </button>

            </div>

          </div>


          <p className="font-body-sm text-on-surface-variant text-sm">
            {item.MESSAGE_TEXT}
          </p>


          {item.ACTION_URL && (
            <div className="mt-2">

              <button
                type="button"
                onClick={async (
                  event
                ) => {

                  event.stopPropagation();


                  await handleOpenNotification(
                    item
                  );
                }}
                className="bg-primary text-on-primary font-body-sm text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-primary-container transition-colors shadow-xs cursor-pointer"
              >
                {getActionLabel(
                  item.NOTIFICATION_TYPE
                )}
              </button>

            </div>
          )}

        </div>

      </article>
    );
  };


  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col pt-16 pb-20 md:pb-12">

      {/* =================================================
          TOP APP BAR
      ================================================= */}

      <header className="flex items-center px-margin-mobile md:px-margin-desktop h-16 w-full fixed top-0 z-50 bg-surface border-b border-outline-variant">

        <button
          type="button"
          onClick={() =>
            navigate(-1)
          }
          className="mr-4 hover:bg-surface-container-high transition-colors active:scale-95 p-2 rounded-full flex items-center justify-center text-primary cursor-pointer"
        >
          <span className="material-symbols-outlined">
            arrow_back
          </span>
        </button>


        <h1 className="font-headline-lg-mobile text-primary font-bold tracking-tight">
          Notifications
        </h1>

      </header>


      {/* =================================================
          MAIN CANVAS
      ================================================= */}

      <main className="grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-md flex flex-col gap-lg">

        {/* Header Actions */}

        <div className="flex justify-between items-center w-full gap-4">

          <div>

            <h2 className="font-title-md text-on-surface font-bold">
              Your Updates
            </h2>


            <p className="font-body-sm text-on-surface-variant mt-1">
              Assignments, exams, notices, resources and academic alerts.
            </p>

          </div>


          <button
            type="button"
            onClick={
              handleMarkAllRead
            }
            disabled={
              !hasUnreadNotifications
            }
            className="font-label-caps text-primary hover:text-primary-container transition-colors py-2 px-4 rounded-full border border-primary/20 hover:bg-primary/5 active:scale-95 cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Mark all as read
          </button>

        </div>


        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-10 text-center">

            <span className="material-symbols-outlined text-5xl text-primary animate-pulse">
              notifications
            </span>


            <p className="font-body-sm text-on-surface-variant mt-2">
              Loading notifications...
            </p>

          </div>
        )}


        {/* =================================================
            ERROR
        ================================================= */}

        {!loading &&
          error && (
          <div className="bg-error-container rounded-xl border border-error/20 p-md flex items-start gap-3 text-on-error-container">

            <span className="material-symbols-outlined">
              error
            </span>


            <div>

              <h3 className="font-title-md font-bold">
                Unable to load notifications
              </h3>


              <p className="font-body-sm mt-1">
                {error}
              </p>


              <button
                type="button"
                onClick={
                  loadNotifications
                }
                className="font-body-sm font-semibold underline mt-2 cursor-pointer"
              >
                Try again
              </button>

            </div>

          </div>
        )}


        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        {!loading &&
          !error && (
          <div className="flex flex-col gap-md">

            {notifications.length ===
            0 ? (

              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-10 text-center flex flex-col items-center">

                <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-3">

                  <span className="material-symbols-outlined text-3xl text-outline">
                    notifications_none
                  </span>

                </div>


                <h3 className="font-title-md font-bold text-on-surface">
                  No notifications
                </h3>


                <p className="font-body-sm text-outline text-xs mt-1">
                  You're all caught up with your classes, assignments and announcements.
                </p>

              </div>

            ) : (

              <>

                {/* TODAY */}

                {todayList.length >
                  0 && (
                  <section className="flex flex-col gap-xs">

                    <h3 className="font-label-caps text-outline ml-2 text-xs font-bold uppercase tracking-wider">
                      Today
                    </h3>


                    <div className="flex flex-col gap-3">

                      {todayList.map(
                        (item) =>
                          renderNotificationCard(
                            item
                          )
                      )}

                    </div>

                  </section>
                )}


                {/* YESTERDAY & EARLIER */}

                {olderList.length >
                  0 && (
                  <section className="flex flex-col gap-xs mt-4">

                    <h3 className="font-label-caps text-outline ml-2 text-xs font-bold uppercase tracking-wider">
                      Yesterday & Earlier
                    </h3>


                    <div className="flex flex-col gap-3">

                      {olderList.map(
                        (item) =>
                          renderNotificationCard(
                            item
                          )
                      )}

                    </div>

                  </section>
                )}

              </>
            )}

          </div>
        )}

      </main>


      {/* =================================================
          MOBILE BOTTOM NAVIGATION
      ================================================= */}

      <nav className="fixed bottom-0 w-full h-16 z-50 flex justify-around items-center px-4 bg-surface border-t border-outline-variant md:hidden">

        <Link
          to="/dashboard"
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-90 p-2 rounded-lg w-16 h-14"
        >
          <span className="material-symbols-outlined">
            home
          </span>

          <span className="font-label-caps text-[10px] mt-0.5">
            Home
          </span>
        </Link>


        <Link
          to="/timetable"
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-90 p-2 rounded-lg w-16 h-14"
        >
          <span className="material-symbols-outlined">
            calendar_month
          </span>

          <span className="font-label-caps text-[10px] mt-0.5">
            Schedule
          </span>
        </Link>


        <Link
          to="/notifications"
          className="flex flex-col items-center justify-center text-primary font-bold hover:bg-surface-container-low transition-colors active:scale-90 p-2 rounded-lg w-16 h-14 relative"
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings:
                "'FILL' 1",
            }}
          >
            notifications
          </span>

          <span className="font-label-caps text-[10px] mt-0.5">
            Alerts
          </span>

          <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
        </Link>


        <Link
          to="/profile"
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-90 p-2 rounded-lg w-16 h-14"
        >
          <span className="material-symbols-outlined">
            person
          </span>

          <span className="font-label-caps text-[10px] mt-0.5">
            Profile
          </span>
        </Link>

      </nav>

    </div>
  );
}