import rateLimit from "express-rate-limit";
import type { Request } from "express";

/**
 * Per-IP limiter for authentication endpoints (login, signup, refresh,
 * Apple sign-in, password reset). 10 requests per minute matches the
 * previous hand-rolled limiter's window. Mounted via `app.use("/api/auth",
 * authRateLimiter)` in server/app.ts.
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error:
      "Too many authentication attempts. Please wait a moment and try again.",
  },
});

interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Per-user limiter for the user-search endpoint. 10 requests per minute
 * per authenticated user — falls back to IP if `req.userId` isn't set
 * (which shouldn't happen because this is mounted after authenticateToken,
 * but the fallback prevents a route-config typo from accidentally lifting
 * the limit).
 */
export const userSearchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request) =>
    (req as AuthenticatedRequest).userId ?? req.ip ?? "unknown",
  message: {
    error: "Too many user lookups. Please wait a moment and try again.",
  },
});

/**
 * Per-user limiter for invitations. 20 invitations per rolling 24h
 * window. Same key fallback as `userSearchRateLimiter`.
 */
export const invitationRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request) =>
    (req as AuthenticatedRequest).userId ?? req.ip ?? "unknown",
  message: {
    error:
      "Daily invitation limit reached. Try again in 24 hours or contact support.",
  },
});
