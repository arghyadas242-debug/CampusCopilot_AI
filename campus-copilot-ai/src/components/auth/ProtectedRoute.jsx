import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router";

import {
  authService,
} from "../../services/api";


const API_URL =
  "http://localhost:5000";


// =====================================================
// NORMALIZE ROLE
// =====================================================

function normalizeRole(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


// =====================================================
// PROTECTED ROUTE
// =====================================================

export default function ProtectedRoute({
  allowedRoles = [],
  children,
}) {
  const location =
    useLocation();


  const [
    authState,
    setAuthState,
  ] = useState({
    loading: true,
    user: null,
    error: "",
  });


  // =====================================================
  // VERIFY LOGIN WITH BACKEND
  // =====================================================

  useEffect(() => {
    let cancelled =
      false;


    async function verifyUser() {
      // -----------------------------------------------
      // GET JWT FROM LOCAL STORAGE
      // -----------------------------------------------

      const token =
        localStorage.getItem(
          "campus_token"
        );


      // -----------------------------------------------
      // NO TOKEN
      // -----------------------------------------------

      if (!token) {
        if (!cancelled) {
          setAuthState({
            loading: false,
            user: null,
            error: "",
          });
        }

        return;
      }


      try {
        const response =
          await fetch(
            `${API_URL}/api/auth/me`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        // ---------------------------------------------
        // TOKEN EXPIRED / INVALID
        // ---------------------------------------------

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          authService.logout();

          if (!cancelled) {
            setAuthState({
              loading: false,
              user: null,
              error: "",
            });
          }

          return;
        }


        // ---------------------------------------------
        // OTHER BACKEND ERROR
        // ---------------------------------------------

        if (!response.ok) {
          let message =
            "Unable to verify your login session.";

          try {
            const data =
              await response.json();

            if (data?.error) {
              message =
                data.error;
            }
          } catch {
            // Keep default message.
          }

          throw new Error(
            message
          );
        }


        // ---------------------------------------------
        // READ AUTHENTICATED USER
        // ---------------------------------------------

        const data =
          await response.json();


        const user =
          data?.user;


        if (!user) {
          throw new Error(
            "Authenticated user information was not returned."
          );
        }


        const role =
          normalizeRole(
            user.role
          );


        if (
          role !== "student" &&
          role !== "admin"
        ) {
          throw new Error(
            "Invalid account role."
          );
        }


        // ---------------------------------------------
        // VERIFIED
        // ---------------------------------------------

        if (!cancelled) {
          setAuthState({
            loading: false,

            user: {
              ...user,
              role,
            },

            error: "",
          });
        }

      } catch (error) {
        console.error(
          "Protected route verification error:",
          error
        );


        if (!cancelled) {
          setAuthState({
            loading: false,
            user: null,

            error:
              error.message ||
              "Unable to verify your session.",
          });
        }
      }
    }


    verifyUser();


    return () => {
      cancelled = true;
    };

  }, [
    location.pathname,
  ]);


  // =====================================================
  // LOADING
  // =====================================================

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">

        <div className="text-center">

          <span className="material-symbols-outlined text-4xl text-primary animate-spin">
            progress_activity
          </span>

          <p className="mt-3 text-sm text-on-surface-variant">
            Verifying your session...
          </p>

        </div>

      </div>
    );
  }


  // =====================================================
  // BACKEND / NETWORK ERROR
  // =====================================================

  if (authState.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">

        <div className="max-w-md text-center">

          <span className="material-symbols-outlined text-4xl text-error">
            error
          </span>

          <h2 className="mt-3 text-lg font-bold text-on-surface">
            Unable to Verify Session
          </h2>

          <p className="mt-2 text-sm text-on-surface-variant">
            {authState.error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm"
          >
            Try Again
          </button>

        </div>

      </div>
    );
  }


  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!authState.user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }


  // =====================================================
  // ROLE CHECK
  // =====================================================

  const role =
    normalizeRole(
      authState.user.role
    );


  const normalizedAllowedRoles =
    allowedRoles.map(
      (item) =>
        normalizeRole(
          item
        )
    );


  // =====================================================
  // WRONG ROLE
  // =====================================================

  if (
    !normalizedAllowedRoles.includes(
      role
    )
  ) {

    // -----------------------------------------------
    // STUDENT TRYING ADMIN PAGE
    // -----------------------------------------------

    if (
      role === "student"
    ) {
      return (
        <Navigate
          to="/dashboard"
          replace
        />
      );
    }


    // -----------------------------------------------
    // ADMIN TRYING STUDENT PAGE
    // -----------------------------------------------

    if (
      role === "admin"
    ) {
      return (
        <Navigate
          to="/admin"
          replace
        />
      );
    }


    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  // =====================================================
  // ACCESS ALLOWED
  // =====================================================

  return children;
}