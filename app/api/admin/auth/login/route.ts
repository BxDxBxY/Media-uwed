import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createAdminSessionToken,
  setAdminSessionCookie,
  verifyPassword,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const { identity, password } = await request.json();

    if (!identity || !password) {
      return NextResponse.json(
        { error: "Username/email and password are required" },
        { status: 400 },
      );
    }

    const admin = await (prisma as any).adminUser.findFirst({
      where: {
        OR: [
          { username: String(identity).toLowerCase() },
          { email: String(identity).toLowerCase() },
        ],
      },
    });

    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createAdminSessionToken({
      userId: admin.id,
      role: admin.role,
    });

    const response = NextResponse.json({ ok: true, role: admin.role });
    setAdminSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
