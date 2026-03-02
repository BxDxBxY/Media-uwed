import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendEmailBatch } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const audience = body.audience as "subscribers" | "messages" | "both";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const messageBody = typeof body.message === "string" ? body.message.trim() : "";

    if (!subject || !messageBody) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    if (!["subscribers", "messages", "both"].includes(audience)) {
      return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    }

    const recipients = new Set<string>();

    if (audience === "subscribers" || audience === "both") {
      const subscribers = await prisma.subscriber.findMany({ select: { email: true } });
      subscribers.forEach((subscriber) => recipients.add(subscriber.email));
    }

    if (audience === "messages" || audience === "both") {
      const messages = await prisma.contactMessage.findMany({ select: { email: true } });
      messages.forEach((entry) => recipients.add(entry.email));
    }

    const recipientList = Array.from(recipients);
    if (recipientList.length === 0) {
      return NextResponse.json({ error: "No recipients found for selected audience" }, { status: 400 });
    }

    const result = await sendEmailBatch({
      to: recipientList,
      subject,
      html: `<p>${messageBody.replace(/\n/g, "<br/>")}</p>`,
      text: messageBody,
    });

    await prisma.adminBroadcastLog.create({
      data: {
        audience,
        subject,
        message: messageBody,
        recipientCount: recipientList.length,
        sentCount: result.sent.length,
        failedCount: result.failed.length,
      },
    });

    return NextResponse.json({
      recipients: recipientList.length,
      sent: result.sent.length,
      failed: result.failed.length,
      provider: result.provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send broadcast";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
