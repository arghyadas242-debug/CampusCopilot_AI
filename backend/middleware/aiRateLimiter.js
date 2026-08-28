const {
  rateLimit,
} = require("express-rate-limit");


// =====================================================
// CONFIGURATION HELPER
// =====================================================

function getPositiveInteger(
  envName,
  fallback
) {
  const value =
    Number(
      process.env[envName]
    );


  if (
    Number.isInteger(value) &&
    value > 0
  ) {
    return value;
  }


  return fallback;
}


// =====================================================
// DEFAULT LIMITS
// =====================================================

/*
  These defaults are intentionally conservative.

  They can later be overridden in .env without
  changing this file.
*/

const PROJECT_DAILY_LIMIT =
  getPositiveInteger(
    "AI_PROJECT_DAILY_LIMIT",
    18
  );


const CHAT_BURST_LIMIT =
  getPositiveInteger(
    "AI_CHAT_15MIN_LIMIT",
    6
  );


const CHAT_DAILY_LIMIT =
  getPositiveInteger(
    "AI_CHAT_DAILY_LIMIT",
    10
  );


const ANALYTICS_BURST_LIMIT =
  getPositiveInteger(
    "AI_ANALYTICS_15MIN_LIMIT",
    3
  );


const ANALYTICS_DAILY_LIMIT =
  getPositiveInteger(
    "AI_ANALYTICS_DAILY_LIMIT",
    4
  );


const NOTICE_HOURLY_LIMIT =
  getPositiveInteger(
    "AI_NOTICE_HOURLY_LIMIT",
    3
  );


const NOTICE_DAILY_LIMIT =
  getPositiveInteger(
    "AI_NOTICE_DAILY_LIMIT",
    4
  );


const STUDY_PLAN_HOURLY_LIMIT =
  getPositiveInteger(
    "AI_STUDY_PLAN_HOURLY_LIMIT",
    3
  );


const STUDY_PLAN_DAILY_LIMIT =
  getPositiveInteger(
    "AI_STUDY_PLAN_DAILY_LIMIT",
    3
  );


// =====================================================
// STANDARD HARD-LIMIT HANDLER
// =====================================================

function hardLimitHandler(
  req,
  res,
  next,
  options
) {
  return res
    .status(429)
    .json(
      options.message
    );
}


// =====================================================
// ANALYTICS SOFT-LIMIT HANDLER
// =====================================================

/*
  Analytics is special.

  The Oracle calculations do not require Gemini.

  Therefore, when the AI enhancement limit is reached,
  we DO NOT block /api/ai/analytics.

  Instead:

  req.skipAiEnhancement = true

  aiRoutes.js will still return:
  - attendance analytics
  - readiness scores
  - assignment analytics
  - exam analytics
  - deterministic recommendations
*/

function analyticsSoftLimitHandler(
  req,
  res,
  next
) {
  req.skipAiEnhancement =
    true;


  return next();
}


// =====================================================
// CHAT BURST LIMIT
// 6 REQUESTS / 15 MINUTES BY DEFAULT
// =====================================================

const chatBurstLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      CHAT_BURST_LIMIT,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      error:
        "You are sending CampusCopilot requests too quickly. Please wait a few minutes and try again.",

      code:
        "AI_CHAT_RATE_LIMIT",
    },

    handler:
      hardLimitHandler,
  });


// =====================================================
// CHAT DAILY LIMIT
// 10 REQUESTS / 24 HOURS BY DEFAULT
// =====================================================

const chatDailyLimiter =
  rateLimit({
    windowMs:
      24 * 60 * 60 * 1000,

    limit:
      CHAT_DAILY_LIMIT,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      error:
        "You have reached the current CampusCopilot chat allowance. Please try again later.",

      code:
        "AI_CHAT_DAILY_LIMIT",
    },

    handler:
      hardLimitHandler,
  });


// =====================================================
// ANALYTICS BURST LIMIT
// SOFT LIMIT
// =====================================================

const analyticsBurstLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      ANALYTICS_BURST_LIMIT,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      code:
        "AI_ANALYTICS_RATE_LIMIT",
    },

    handler:
      analyticsSoftLimitHandler,
  });


// =====================================================
// ANALYTICS DAILY LIMIT
// SOFT LIMIT
// =====================================================

const analyticsDailyLimiter =
  rateLimit({
    windowMs:
      24 * 60 * 60 * 1000,

    limit:
      ANALYTICS_DAILY_LIMIT,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      code:
        "AI_ANALYTICS_DAILY_LIMIT",
    },

    handler:
      analyticsSoftLimitHandler,
  });


// =====================================================
// NOTICE SUMMARY HOURLY LIMIT
// =====================================================

const noticeSummaryBurstLimiter =
  rateLimit({
    windowMs:
      60 * 60 * 1000,

    limit:
      NOTICE_HOURLY_LIMIT,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      error:
        "Too many notice summaries have been generated recently. Please wait before generating another summary. You can still publish the notice without an AI summary.",

      code:
        "AI_NOTICE_RATE_LIMIT",
    },

    handler:
      hardLimitHandler,
  });


// =====================================================
// NOTICE SUMMARY DAILY LIMIT
// =====================================================

const noticeSummaryDailyLimiter =
  rateLimit({
    windowMs:
      24 * 60 * 60 * 1000,

    limit:
      NOTICE_DAILY_LIMIT,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      error:
        "The current CampusCopilot notice-summary allowance has been reached. You can still publish notices normally and generate summaries later.",

      code:
        "AI_NOTICE_DAILY_LIMIT",
    },

    handler:
      hardLimitHandler,
  });


// =====================================================
// STUDY PLAN HOURLY LIMIT
// =====================================================

const studyPlanBurstLimiter =
  rateLimit({
    windowMs:
      60 * 60 * 1000,

    limit:
      STUDY_PLAN_HOURLY_LIMIT,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      error:
        "Too many study plans have been generated recently. Please wait before generating another one.",

      code:
        "AI_STUDY_PLAN_RATE_LIMIT",
    },

    handler:
      hardLimitHandler,
  });


// =====================================================
// STUDY PLAN DAILY LIMIT
// =====================================================

const studyPlanDailyLimiter =
  rateLimit({
    windowMs:
      24 * 60 * 60 * 1000,

    limit:
      STUDY_PLAN_DAILY_LIMIT,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      error:
        "You have reached the current CampusCopilot study-plan allowance. Please try again later.",

      code:
        "AI_STUDY_PLAN_DAILY_LIMIT",
    },

    handler:
      hardLimitHandler,
  });


// =====================================================
// PROJECT-WIDE AI DAILY SAFETY LIMIT
// =====================================================

/*
  This protects the entire Gemini project.

  All routes using this limiter share ONE key:

      campuscopilot-ai-project

  Default:
      18 requests / 24 hours

  Your provider quota is currently very small,
  so this prevents the application from using
  every available request accidentally.

  IMPORTANT:

  Analytics behaves differently.

  If the project budget is exhausted and the
  request is for /analytics, we do not block
  the analytics API.

  We simply disable the optional AI insight
  enhancement and continue with Oracle data.
*/

const projectAiDailyLimiter =
  rateLimit({
    windowMs:
      24 * 60 * 60 * 1000,

    limit:
      PROJECT_DAILY_LIMIT,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    keyGenerator:
      () =>
        "campuscopilot-ai-project",

    /*
      If an earlier analytics limiter has already
      decided to skip AI enhancement, there is no
      reason to consume the global provider budget.
    */

    skip:
      (req) =>
        req.skipAiEnhancement ===
        true,

    message: {
      error:
        "CampusCopilot Intelligence has reached its current application AI allowance. Please try again later.",

      code:
        "AI_PROJECT_DAILY_LIMIT",
    },

    handler: (
      req,
      res,
      next,
      options
    ) => {
      /*
        Never take down the real Analytics page.
      */

      if (
        req.path ===
        "/analytics"
      ) {
        req.skipAiEnhancement =
          true;


        return next();
      }


      return res
        .status(429)
        .json(
          options.message
        );
    },
  });


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  chatBurstLimiter,

  chatDailyLimiter,

  analyticsBurstLimiter,

  analyticsDailyLimiter,

  noticeSummaryBurstLimiter,

  noticeSummaryDailyLimiter,

  studyPlanBurstLimiter,

  studyPlanDailyLimiter,

  projectAiDailyLimiter,
};