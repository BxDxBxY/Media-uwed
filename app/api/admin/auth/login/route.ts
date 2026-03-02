import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createAdminSessionToken,
  setAdminSessionCookie,
  verifyPassword,
} from "@/lib/admin-auth";

function pickIdentity(body: Record<string, unknown>) {
  const candidates = [body.username, body.email, body.identity];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const identity = pickIdentity(body);
    const password = typeof body.password === "string" ? body.password : "";

    if (!identity || !password) {
      return NextResponse.json(
        { error: "Username/email and password are required" },
        { status: 400 },
      );
    }

    const admin = await (prisma as any).adminUser.findFirst({
      where: {
        OR: [
          { username: { equals: identity, mode: "insensitive" } },
          { email: { equals: identity, mode: "insensitive" } },
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
