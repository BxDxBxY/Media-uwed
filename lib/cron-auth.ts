import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";

/**
 * Authorization for the automation pipeline endpoints (`/api/cron/*`).
 *
 * Two callers are legitimate:
 *  1. the admin UI, which triggers steps manually from the browser (session cookie);
 *  2. a scheduler (Vercel Cron, GitHub Actions, systemd timer, cron-job.org),
 *     which sends the shared secret.
 *
 * Accepted secret transports:
 *  - `x-automation-secret: <secret>`
 *  - `Authorization: Bearer <secret>`   (Vercel Cron sends CRON_SECRET this way)
 *
 * This **fails closed**: if no secret is configured, only an authenticated admin
 * session is accepted. The previous implementation returned "allowed" whenever
 * AUTOMATION_CRON_SECRET was unset, which left publishing and Telegram broadcasts
 * open to anonymous callers.
 */

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function getConfiguredSecret() {
  return (process.env.AUTOMATION_CRON_SECRET || process.env.CRON_SECRET || "").trim();
}

function extractProvidedSecret(request: Request) {
  const header = request.headers.get("x-automation-secret")?.trim();
  if (header) return header;

  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return "";
}

export type CronCaller = "admin" | "scheduler";

/**
 * Returns `null` when the caller may proceed, otherwise the response to return.
 */
export function authorizeCronRequest(request: Request): NextResponse | null {
  const session = getAdminSessionFromRequest(request);
  if (session && session.role === "admin") return null;

  const expected = getConfiguredSecret();
  const provided = extractProvidedSecret(request);

  if (expected && provided && timingSafeEqual(provided, expected)) return null;

  if (!expected) {
    console.warn(
      "Rejected an unauthenticated automation request: AUTOMATION_CRON_SECRET is not set, so scheduler access is disabled.",
    );
  }

  return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 });
}

/** True when this request came from a scheduler rather than a signed-in admin. */
export function isSchedulerRequest(request: Request) {
  const expected = getConfiguredSecret();
  if (!expected) return false;
  const provided = extractProvidedSecret(request);
  return Boolean(provided) && timingSafeEqual(provided, expected);
}
