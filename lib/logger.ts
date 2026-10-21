import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

type LogMeta = Record<string, unknown>;

/**
 * Per-request context, so every line emitted while handling one request carries the same
 * id without every call site having to thread it through.
 *
 * Why this matters here: a single pipeline run emits triage verdicts, per-model fallback
 * attempts, budget warnings and scraper failures, and several runs can overlap — the
 * scheduler, an admin pressing "Process", and a cron call. In a hosting provider's log
 * viewer those lines interleave, and without an id there is no way to tell which "AI
 * editorial pass failed" belongs to which run.
 */
const requestContext = new AsyncLocalStorage<{ requestId: string }>();

/** Generates an id, preferring one the platform already assigned so traces line up. */
export function newRequestId(request?: Request): string {
  const upstream =
    request?.headers.get("x-vercel-id") ||
    request?.headers.get("x-request-id") ||
    request?.headers.get("cf-ray");

  // Platform ids can be long; the tail is the part that varies.
  if (upstream) return upstream.trim().slice(-36);
  return randomUUID().slice(0, 8);
}

/**
 * Runs `callback` with a request id attached to every log line it produces.
 *
 *   export async function POST(request: Request) {
 *     return withRequestId(request, () => handle(request));
 *   }
 */
export function withRequestId<T>(request: Request | undefined, callback: () => T): T {
  return requestContext.run({ requestId: newRequestId(request) }, callback);
}

/** The current request id, when called inside `withRequestId`. */
export function currentRequestId(): string | null {
  return requestContext.getStore()?.requestId ?? null;
}

function serialize(meta?: LogMeta) {
  const requestId = currentRequestId();
  const merged = requestId ? { rid: requestId, ...meta } : meta;
  return merged ? JSON.stringify(merged) : "";
}

/**
 * Never pass secrets (API keys, tokens, reset links, password hashes) in `meta` —
 * these lines end up in hosting provider logs. Log presence (`hasKey: true`), not value.
 */
export const logger = {
  /** Verbose diagnostics. Suppressed in production. */
  debug(message: string, meta?: LogMeta) {
    if (process.env.NODE_ENV === "production") return;
    console.debug(`[DEBUG] ${message}`, serialize(meta));
  },
  info(message: string, meta?: LogMeta) {
    console.info(`[INFO] ${message}`, serialize(meta));
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(`[WARN] ${message}`, serialize(meta));
  },
  error(message: string, meta?: LogMeta) {
    console.error(`[ERROR] ${message}`, serialize(meta));
  },
};
