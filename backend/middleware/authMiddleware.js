const jwt =
  require("jsonwebtoken");


// =====================================================
// AUTHENTICATE JWT
// =====================================================

function authenticateToken(
  req,
  res,
  next
) {
  const authHeader =
    req.headers.authorization;


  // ---------------------------------------------------
  // TOKEN NOT PROVIDED
  // ---------------------------------------------------

  if (
    !authHeader ||
    !authHeader.startsWith(
      "Bearer "
    )
  ) {
    return res
      .status(401)
      .json({
        error:
          "Access denied. No authentication token provided.",

        code:
          "AUTH_TOKEN_REQUIRED",
      });
  }


  // ---------------------------------------------------
  // EXTRACT TOKEN
  // ---------------------------------------------------

  const token =
    authHeader
      .slice(7)
      .trim();


  if (!token) {
    return res
      .status(401)
      .json({
        error:
          "Access denied. No authentication token provided.",

        code:
          "AUTH_TOKEN_REQUIRED",
      });
  }


  // ---------------------------------------------------
  // CHECK JWT SECRET
  // ---------------------------------------------------

  const jwtSecret =
    process.env.JWT_SECRET;


  if (!jwtSecret) {
    console.error(
      "JWT_SECRET is not configured."
    );


    return res
      .status(500)
      .json({
        error:
          "Authentication service is not configured correctly.",

        code:
          "AUTH_CONFIGURATION_ERROR",
      });
  }


  // ---------------------------------------------------
  // VERIFY TOKEN
  // ---------------------------------------------------

  try {
    const decoded =
      jwt.verify(
        token,
        jwtSecret
      );


    /*
      Store decoded JWT data so later middleware
      and routes can access:

      req.user.id
      req.user.email
      req.user.role
      req.user.studentRoll

      depending on what your login route puts
      inside the JWT.
    */

    req.user =
      decoded;


    return next();

  } catch (error) {

    // -------------------------------------------------
    // TOKEN EXPIRED
    // -------------------------------------------------

    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({
          error:
            "Your session has expired. Please log in again.",

          code:
            "AUTH_TOKEN_EXPIRED",
        });
    }


    // -------------------------------------------------
    // TOKEN NOT ACTIVE YET
    // -------------------------------------------------

    if (
      error.name ===
      "NotBeforeError"
    ) {
      return res
        .status(401)
        .json({
          error:
            "Your authentication token is not active yet.",

          code:
            "AUTH_TOKEN_NOT_ACTIVE",
        });
    }


    // -------------------------------------------------
    // INVALID TOKEN
    // -------------------------------------------------

    return res
      .status(403)
      .json({
        error:
          "Invalid authentication token.",

        code:
          "AUTH_TOKEN_INVALID",
      });
  }
}


// =====================================================
// REQUIRE ADMIN
// =====================================================

function requireAdmin(
  req,
  res,
  next
) {
  /*
    authenticateToken must run before this middleware.

    Example:

    router.post(
      "/something",
      authenticateToken,
      requireAdmin,
      handler
    );
  */

  if (!req.user) {
    return res
      .status(401)
      .json({
        error:
          "Authentication is required.",

        code:
          "AUTH_REQUIRED",
      });
  }


  const role =
    String(
      req.user?.role ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    role !== "admin"
  ) {
    return res
      .status(403)
      .json({
        error:
          "Access denied. Administrator privileges required.",

        code:
          "ADMIN_ACCESS_REQUIRED",
      });
  }


  return next();
}


// =====================================================
// REQUIRE STUDENT
// =====================================================

function requireStudent(
  req,
  res,
  next
) {
  /*
    authenticateToken must run before this middleware.

    Example:

    router.post(
      "/verification",
      authenticateToken,
      requireStudent,
      handler
    );
  */

  if (!req.user) {
    return res
      .status(401)
      .json({
        error:
          "Authentication is required.",

        code:
          "AUTH_REQUIRED",
      });
  }


  const role =
    String(
      req.user?.role ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    role !== "student"
  ) {
    return res
      .status(403)
      .json({
        error:
          "Access denied. Student account required.",

        code:
          "STUDENT_ACCESS_REQUIRED",
      });
  }


  return next();
}


// =====================================================
// OPTIONAL AUTHENTICATION
// =====================================================

function optionalAuthenticateToken(
  req,
  res,
  next
) {
  const authHeader =
    req.headers.authorization;


  /*
    No token:
    continue normally as a public request.
  */

  if (
    !authHeader ||
    !authHeader.startsWith(
      "Bearer "
    )
  ) {
    req.user =
      null;

    return next();
  }


  const token =
    authHeader
      .slice(7)
      .trim();


  if (!token) {
    req.user =
      null;

    return next();
  }


  const jwtSecret =
    process.env.JWT_SECRET;


  if (!jwtSecret) {
    console.error(
      "JWT_SECRET is not configured."
    );


    req.user =
      null;

    return next();
  }


  try {
    const decoded =
      jwt.verify(
        token,
        jwtSecret
      );


    req.user =
      decoded;

  } catch {
    /*
      This middleware is optional,
      so an invalid token is treated
      as an unauthenticated request.

      Use authenticateToken instead
      for protected routes.
    */

    req.user =
      null;
  }


  return next();
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  requireAdmin,
  requireStudent,
};