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


  try {
    const decoded =
      jwt.verify(
        token,
        jwtSecret
      );


    req.user =
      decoded;


    return next();

  } catch (error) {
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
// EXPORTS
// =====================================================

module.exports = {
  authenticateToken,
  requireAdmin,
  requireStudent,
};