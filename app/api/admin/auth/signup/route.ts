import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/admin-auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public self-registration. Accounts are always created unapproved and cannot sign
 * in until a super admin approves them (POST /api/admin/users).
 *
 * Set ADMIN_SIGNUP_ENABLED=false to close registration entirely once the editorial
 * team has their accounts.
 */
function signupEnabled() {
  return (process.env.ADMIN_SIGNUP_ENABLED ?? "true").trim().toLowerCase() !== "false";
}

export async function POST(request: Request) {
  if (!signupEnabled()) {
    return NextResponse.json(
      { error: "Registration is closed. Ask an administrator to create your account." },
      { status: 403 },
    );
  }

  const limited = enforceRateLimit(request, "signup", RATE_LIMITS.authSensitive);
  if (limited) return limited;

  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    // Normalised to lower case so lookups in login / forgot-password stay consistent.
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (username.length < 3 || username.length > 40) {
      return NextResponse.json(
        { error: "Username must be between 3 and 40 characters" },
        { status: 400 },
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { username: { equals: username, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "That username or email is already registered" },
        { status: 409 },
      );
    }

    await prisma.adminUser.create({
      data: {
        username,
        email,
        passwordHash: hashPassword(password),
        role: "admin",
        approved: false, // Must be approved by a super admin before login works.
        isSuperAdmin: false,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Account created. An administrator must approve it before you can sign in.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
