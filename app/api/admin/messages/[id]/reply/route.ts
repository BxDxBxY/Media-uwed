import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendEmailBatch } from "@/lib/mailer";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const body = await request.json();
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const messageBody = typeof body.message === "string" ? body.message.trim() : "";

    if (!subject || !messageBody) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const emailResult = await sendEmailBatch({
      to: [message.email],
      subject,
      html: `<p>${messageBody.replace(/\n/g, "<br/>")}</p>`,
      text: messageBody,
    });

    await prisma.contactMessage.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      sent: emailResult.sent.length,
      failed: emailResult.failed.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send reply";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
