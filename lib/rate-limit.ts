import { NextResponse } from "next/server";

/**
 * Minimal in-process fixed-window rate limiter.
 *
 * Scope/limitations (read before relying on this):
 * - State lives in the Node process, so each serverless instance counts separately.
 *   On a single long-lived server (VPS/container) it is accurate; on Vercel it is
 *   best-effort. For strict guarantees move the counter to Redis/Upstash.
 * - Keyed on the client IP taken from `x-forwarded-for` / `x-real-ip`. Behind a proxy
 *   that does not set those headers every caller collapses into one bucket, which
 *   fails closed (stricter), not open.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Keep the map from growing without bound on long-lived servers.
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return {
    ok: true,
    remaining: options.limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Guard helper for route handlers. Returns a 429 response when the caller is over
 * budget, otherwise `null`.
 *
 *   const limited = enforceRateLimit(request, "login", { limit: 10, windowMs: 60_000 });
 *   if (limited) return limited;
 */
export function enforceRateLimit(
  request: Request,
  scope: string,
  options: { limit: number; windowMs: number },
): NextResponse | null {
  const result = rateLimit(`${scope}:${getClientIp(request)}`, options);
  if (result.ok) return null;

  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}

/** Sensible defaults, so call sites stay consistent. */
export const RATE_LIMITS = {
  /** Credential submission — tight. */
  auth: { limit: 10, windowMs: 60_000 },
  /** Account creation / password-reset requests — very tight. */
  authSensitive: { limit: 5, windowMs: 15 * 60_000 },
  /** Anonymous public writes (contact form, newsletter). */
  publicWrite: { limit: 20, windowMs: 60_000 },
  /** Expensive pipeline triggers. */
  pipeline: { limit: 6, windowMs: 60_000 },
} as const;
