import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/admin-auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "reset-password", RATE_LIMITS.authSensitive);
  if (limited) return limited;

  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({
      where: { resetToken: token },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // A token with no recorded expiry is treated as invalid rather than eternal.
    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return NextResponse.json({ error: "Reset link has expired. Request a new one" }, { status: 400 });
    }

    // Update password hash and burn the reset token.
    //
    // `approved` is deliberately NOT modified here. It used to be set to `true`,
    // which allowed anyone to self-register and then approve their own admin
    // account by running the password-reset flow against their own mailbox.
    // Approval is granted only by a super admin via POST /api/admin/users.
    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(password),
        resetToken: null,
        resetTokenExpires: null,
        // Locks out any session created before the reset — the point of account recovery.
        passwordChangedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      approved: user.approved,
      message: user.approved
        ? "Password updated. You can sign in now."
        : "Password updated. Your account still needs administrator approval before you can sign in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
