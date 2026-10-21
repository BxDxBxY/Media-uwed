import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendEmailBatch } from "@/lib/mailer";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Base URL for the reset link.
 *
 * The request `Host` header is attacker-controlled, so a link built from it can be
 * pointed at any domain (host-header injection → token theft). We therefore prefer
 * the configured public URL and only fall back to `Host` outside production.
 */
function resolveBaseUrl(request: Request): string | null {
  const configured = (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      console.warn("APP_URL/NEXT_PUBLIC_SITE_URL is not a valid URL; ignoring it.");
    }
  }

  if (process.env.NODE_ENV === "production") return null;

  const host = request.headers.get("host");
  if (!host) return null;
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "forgot-password", RATE_LIMITS.authSensitive);
  if (limited) return limited;

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Case-insensitive lookup: signup does not normalise case, so a stored
    // "Admin@Uwed.uz" must still match the lowercased input.
    const user = await prisma.adminUser.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    // Always answer identically, so this endpoint cannot be used to enumerate accounts.
    const genericResponse = {
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    };

    if (!user) {
      return NextResponse.json(genericResponse);
    }

    const baseUrl = resolveBaseUrl(request);
    if (!baseUrl) {
      console.error(
        "Cannot build a password reset link: set APP_URL (or NEXT_PUBLIC_SITE_URL) to the public site origin.",
      );
      return NextResponse.json(
        { error: "Password reset is not configured on this server. Contact an administrator." },
        { status: 500 },
      );
    }

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: expires },
    });

    const resetUrl = `${baseUrl}/admin/reset-password?token=${token}`;
    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      // Local convenience only — never log reset tokens in production.
      console.log(`\n🔐 PASSWORD RESET for ${user.username} (${user.email})\n   ${resetUrl}\n`);
    }

    let emailSent = false;
    try {
      const result = await sendEmailBatch({
        to: [user.email],
        subject: "Password Reset Request - University Media Portal",
        html: `
          <p>Hello ${user.username},</p>
          <p>You requested a password reset for your admin account.</p>
          <p>Please click the link below to reset your password:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link is valid for 1 hour. If you did not request it, you can ignore this email.</p>
        `,
      });
      emailSent = result.sent.length > 0;
    } catch (e) {
      // Do not fail the request: the token is stored, and in development the link is
      // printed above so local testing still works without an email provider.
      console.warn("Could not dispatch password reset email:", (e as Error).message);
    }

    if (!emailSent && !isDev) {
      console.error(
        `Password reset email could not be delivered to ${user.email}. Check RESEND_API_KEY / RESEND_FROM_EMAIL.`,
      );
    }

    return NextResponse.json({
      ...genericResponse,
      // The link is only ever returned outside production, purely for local testing.
      ...(isDev ? { resetLink: resetUrl, emailSent } : {}),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to request password reset" }, { status: 500 });
  }
}
