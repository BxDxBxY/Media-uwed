import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const messages = await prisma.contactMessage.findMany({
      where: { subject: { not: "__assistant_memory__" } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}
