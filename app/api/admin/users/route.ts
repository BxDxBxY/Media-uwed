import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest, isSessionStale } from "@/lib/admin-auth";

// Middleware helper to ensure request is from a super administrator
async function checkSuperAdmin(request: Request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: session.userId },
  });

  if (isSessionStale(session, user)) {
    return {
      errorResponse: NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 }),
      user: null,
    };
  }

  if (!user || !user.isSuperAdmin || !user.approved) {
    return { 
      errorResponse: NextResponse.json({ error: "Forbidden. Super admin privileges required." }, { status: 403 }), 
      user: null 
    };
  }

  return { errorResponse: null, user };
}

export async function GET(request: Request) {
  const { errorResponse } = await checkSuperAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        approved: true,
        isSuperAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to fetch admin users:", error);
    return NextResponse.json({ error: "Failed to fetch admin users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { errorResponse } = await checkSuperAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (action === "approve") {
      const updatedUser = await prisma.adminUser.update({
        where: { id: userId },
        data: { approved: true },
        select: { id: true, username: true, approved: true },
      });

      return NextResponse.json({ ok: true, user: updatedUser });
    }

    if (action === "toggle_super") {
      const targetUser = await prisma.adminUser.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Demoting the last super-admin bricks the instance: `checkSuperAdmin` would then
      // reject every caller of this route, so nobody could approve accounts or promote
      // anyone back — including the person who just demoted themselves. The delete handler
      // below already counts super-admins; this must do the same, because the bootstrap
      // email is configurable and cannot be relied on as the guard.
      if (targetUser.isSuperAdmin) {
        const remainingSuperAdmins = await prisma.adminUser.count({
          where: { isSuperAdmin: true, approved: true, id: { not: targetUser.id } },
        });

        if (remainingSuperAdmins === 0) {
          return NextResponse.json(
            { error: "Cannot demote the only remaining super admin. Promote another one first." },
            { status: 400 },
          );
        }
      }

      const updatedUser = await prisma.adminUser.update({
        where: { id: userId },
        data: { isSuperAdmin: !targetUser.isSuperAdmin },
        select: { id: true, username: true, isSuperAdmin: true },
      });

      return NextResponse.json({ ok: true, user: updatedUser });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { errorResponse } = await checkSuperAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const targetUser = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Do not allow deleting the main super admin account
    if (targetUser.email === "admin@university.edu" || targetUser.isSuperAdmin) {
      // Allow delete only if there are other super admins
      const superAdminsCount = await prisma.adminUser.count({
        where: { isSuperAdmin: true, approved: true },
      });

      if (superAdminsCount <= 1 && targetUser.isSuperAdmin) {
        return NextResponse.json({ error: "Cannot delete the only remaining super admin" }, { status: 400 });
      }
    }

    await prisma.adminUser.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
