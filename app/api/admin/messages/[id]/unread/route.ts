import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const message = await prisma.contactMessage.update({
      where: { id },
      data: { readAt: null },
    });

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json(
      { error: "Failed to mark message as unread" },
      { status: 500 },
    );
  }
}
