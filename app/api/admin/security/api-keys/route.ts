import { randomBytes, scryptSync } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest, requireAdmin } from "@/lib/admin-auth";

function hashApiKey(key: string) {
  const salt = process.env.ADMIN_API_KEY_SALT ?? "dev-api-key-salt";
  return scryptSync(key, salt, 64).toString("hex");
}

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const apiKeys = await prisma.adminApiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        updatedAt: true,
        revokedAt: true,
        lastUsedAt: true,
      },
    });

    return NextResponse.json({ apiKeys });
  } catch {
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const session = getAdminSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Key name is required" }, { status: 400 });
    }

    const rawKey = `mk_${randomBytes(24).toString("hex")}`;
    const keyPrefix = rawKey.slice(0, 12);

    await prisma.adminApiKey.create({
      data: {
        name,
        keyPrefix,
        keyHash: hashApiKey(rawKey),
        createdById: session.userId,
      },
    });

    return NextResponse.json({ apiKey: rawKey }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
