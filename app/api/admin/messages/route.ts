import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { RESERVED_MESSAGE_SUBJECTS } from "@/lib/assistant-memory";

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const messages = await prisma.contactMessage.findMany({
      // Hide any internal rows written by older builds of the admin assistant,
      // which stored its state in this table.
      where: { subject: { notIn: [...RESERVED_MESSAGE_SUBJECTS] } },
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
