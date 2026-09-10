import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";

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
    (req as AuthenticatedRequest).userId ??
    (req.ip ? ipKeyGenerator(req.ip) : "unknown"),
  message: {
    error: "Too many user lookups. Please wait a moment and try again.",
  },
});

/**
 * Per-user limiter for push-token register/unregister. The upsert is
 * idempotent on (userId, deviceId) so legitimate clients touch these
 * endpoints a handful of times per session; 30/min absorbs retries while
 * stopping an authenticated client from spamming token writes. Same key
 * fallback as `userSearchRateLimiter`.
 */
export const pushTokenRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request) =>
    (req as AuthenticatedRequest).userId ??
    (req.ip ? ipKeyGenerator(req.ip) : "unknown"),
  message: {
    error: "Too many push token updates. Please wait a moment and try again.",
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
    (req as AuthenticatedRequest).userId ??
    (req.ip ? ipKeyGenerator(req.ip) : "unknown"),
  message: {
    error:
      "Daily invitation limit reached. Try again in 24 hours or contact support.",
  },
});

/**
 * Per-user limiter for encrypted shared-media uploads/deletes. A case with
 * the 50-photo cap uploads 100 variants in one save, and a busy list may
 * save several cases back to back; 200 per 10 minutes absorbs that while
 * capping an authenticated client that loops. Same key fallback as
 * `userSearchRateLimiter`.
 */
export const sharedMediaRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request) =>
    (req as AuthenticatedRequest).userId ??
    (req.ip ? ipKeyGenerator(req.ip) : "unknown"),
  message: {
    error: "Too many photo uploads. Please wait a few minutes and try again.",
  },
});

/**
 * Per-user limiter for GET /api/users/:id/keys — the only colleague-lookup
 * endpoint that had none. Share-on-save fetches keys once per recipient,
 * so 60/min is generous for real use. Same key fallback as above.
 */
export const userKeysRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request) =>
    (req as AuthenticatedRequest).userId ??
    (req.ip ? ipKeyGenerator(req.ip) : "unknown"),
  message: {
    error: "Too many key lookups. Please wait a moment and try again.",
  },
});

interface IdentifierBudgetOptions {
  windowMs: number;
  /** Identifiers (not requests) allowed per user per window. */
  budget: number;
  /** How many identifiers this request spends. */
  weigh: (req: Request) => number;
  message: string;
  /** Injectable clock for tests. */
  now?: () => number;
}

/**
 * Weighted per-user fixed-window limiter. `express-rate-limit` counts
 * requests, which is the wrong unit for a batch endpoint: sharing the
 * 10 req/min bucket with /api/users/search still let `/discover` probe
 * 10 × 50 = 500 identifiers a minute — 50× the enumeration throughput the
 * shared bucket was meant to cap. This counts identifiers instead.
 */
export function createIdentifierBudget(opts: IdentifierBudgetOptions) {
  const now = opts.now ?? Date.now;
  const buckets = new Map<string, { spent: number; resetAt: number }>();

  const sweep = (t: number) => {
    if (buckets.size < 5000) return;
    for (const [key, b] of buckets) if (b.resetAt <= t) buckets.delete(key);
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const key =
      (req as AuthenticatedRequest).userId ??
      (req.ip ? ipKeyGenerator(req.ip) : "unknown");
    const t = now();
    sweep(t);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= t) {
      bucket = { spent: 0, resetAt: t + opts.windowMs };
      buckets.set(key, bucket);
    }
    const cost = Math.max(1, opts.weigh(req));
    if (bucket.spent + cost > opts.budget) {
      res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((bucket.resetAt - t) / 1000))),
      );
      res.status(429).json({ error: opts.message });
      return;
    }
    bucket.spent += cost;
    next();
  };
}

/** 100 contact identifiers per user per 10 minutes on POST /api/users/discover. */
export const discoverIdentifierBudget = createIdentifierBudget({
  windowMs: 10 * 60 * 1000,
  budget: 100,
  weigh: (req) => {
    const contacts = (req.body as { contacts?: unknown } | undefined)?.contacts;
    return Array.isArray(contacts) ? contacts.length : 1;
  },
  message: "Too many contact lookups. Please wait a few minutes and try again.",
});
