import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type MessageStatus = "new" | "contacted" | "closed" | "spam";

function sanitizeSubject(subject: string) {
  return subject.replace(/^\s*\[SPAM\]\s*/i, "").trim();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const body = await request.json();
    const status = String(body?.status || "") as MessageStatus;

    if (!["new", "contacted", "closed", "spam"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const cleanSubject = sanitizeSubject(existing.subject);

    const updateData =
      status === "new"
        ? { readAt: null, archivedAt: null, subject: cleanSubject }
        : status === "contacted"
          ? { readAt: existing.readAt || new Date(), archivedAt: null, subject: cleanSubject }
          : status === "closed"
            ? { readAt: existing.readAt || new Date(), archivedAt: new Date(), subject: cleanSubject }
            : { readAt: existing.readAt || new Date(), archivedAt: new Date(), subject: `[SPAM] ${cleanSubject}` };

    const message = await prisma.contactMessage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Failed to update message status" }, { status: 500 });
  }
}
