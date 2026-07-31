import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminSessionPayload = {
  userId: string;
  role: string;
  exp: number;
  /** Issued-at (seconds). Compared against `AdminUser.passwordChangedAt`. */
  iat?: number;
};

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-admin-secret-change-me";
}

function toBase64Url(input: Buffer | string) {
  const value = typeof input === "string" ? Buffer.from(input) : input;
  return value.toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;
  const inputHash = scryptSync(password, salt, 64).toString("hex");
  const stored = Buffer.from(storedHash, "hex");
  const input = Buffer.from(inputHash, "hex");
  if (stored.length !== input.length) return false;
  return timingSafeEqual(stored, input);
}

export function createAdminSessionToken(data: { userId: string; role: string }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    userId: data.userId,
    role: data.role,
    exp: issuedAt + SESSION_TTL_SECONDS,
    iat: issuedAt,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  const expectedSignature = createHmac("sha256", getSessionSecret()).update(payloadPart).digest("base64url");
  const actual = Buffer.from(signaturePart);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadPart)) as AdminSessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookieValue(cookieHeader: string | null, key: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const target = parts.find((part) => part.startsWith(`${key}=`));
  return target ? decodeURIComponent(target.slice(key.length + 1)) : null;
}

export function getAdminSessionFromRequest(request: Request) {
  const token = parseCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export async function getAdminSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export function requireAdmin(request: Request) {
  const session = getAdminSessionFromRequest(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * True when the session predates the account's last password change.
 *
 * Session verification is otherwise stateless (no database round trip per request),
 * so this is applied where the user record is already being loaded: entering the admin
 * UI (`app/admin/(protected)/layout.tsx`) and the super-admin user management route.
 * A stolen token can therefore still be used against individual API routes until it
 * expires (12h max) — closing that fully means an async, DB-backed check in
 * `requireAdmin` on every route.
 */
export function isSessionStale(
  session: { iat?: number } | null,
  user: { passwordChangedAt?: Date | null } | null,
) {
  if (!session || !user?.passwordChangedAt) return false;
  // Tokens issued before this feature carry no `iat`; treat them as stale so a
  // password change reliably locks out older sessions.
  if (!session.iat) return true;
  return session.iat * 1000 < user.passwordChangedAt.getTime();
}
