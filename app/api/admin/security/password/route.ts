import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createAdminSessionToken,
  getAdminSessionFromRequest,
  hashPassword,
  requireAdmin,
  setAdminSessionCookie,
  verifyPassword,
} from "@/lib/admin-auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function PUT(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const limited = enforceRateLimit(request, "change-password", RATE_LIMITS.auth);
    if (limited) return limited;

    const session = getAdminSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({ where: { id: session.userId } });
    if (!admin || !verifyPassword(currentPassword, admin.passwordHash)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    if (verifyPassword(newPassword, admin.passwordHash)) {
      return NextResponse.json(
        { error: "New password must differ from the current one" },
        { status: 400 },
      );
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        passwordHash: hashPassword(newPassword),
        // Invalidates sessions issued before now (see isSessionStale).
        passwordChangedAt: new Date(),
      },
    });

    // Issue a fresh token so the admin who just changed their own password is not
    // logged out by the invalidation above.
    const response = NextResponse.json({ ok: true });
    setAdminSessionCookie(
      response,
      createAdminSessionToken({ userId: admin.id, role: admin.role }),
    );
    return response;
  } catch {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
