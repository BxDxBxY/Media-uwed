import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { getSubscriberPreferenceMap } from "@/lib/subscriber-preferences";

type TargetMode = "subscribers" | "messages" | "single";

async function sendViaResend(to: string[], subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.OUTREACH_FROM_EMAIL;

  if (!apiKey || !from) {
    return { sent: false, reason: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend failed: ${details}`);
  }

  return { sent: true, reason: null };
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const mode = (body.mode || "subscribers") as TargetMode;
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    const recipientEmail = String(body.recipientEmail || "").trim();

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    let recipients: string[] = [];

    if (mode === "subscribers") {
      const subscribers = await prisma.subscriber.findMany({ select: { email: true } });
      const prefs = await getSubscriberPreferenceMap();
      recipients = subscribers
        .map((s) => s.email)
        .filter((email) => prefs[email.toLowerCase()] !== false);
    } else if (mode === "messages") {
      const messages = await prisma.contactMessage.findMany({
        where: {
          subject: { notIn: ["__assistant_memory__", "__outreach_log__"] },
          archivedAt: null,
        },
        select: { email: true },
      });
      recipients = messages.map((m) => m.email);
    } else {
      if (!recipientEmail) {
        return NextResponse.json({ error: "Recipient email is required for single mode" }, { status: 400 });
      }
      recipients = [recipientEmail];
    }

    recipients = [...new Set(recipients.filter(Boolean))];

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients found" }, { status: 400 });
    }

    const delivery = await sendViaResend(recipients, subject, message).catch((error) => ({
      sent: false,
      reason: error instanceof Error ? error.message : "Unknown send error",
    }));

    await prisma.contactMessage.create({
      data: {
        name: "Admin Outreach",
        email: "system@local",
        subject: "__outreach_log__",
        message: JSON.stringify({
          mode,
          subject,
          recipientCount: recipients.length,
          sent: delivery.sent,
          reason: delivery.reason,
          createdAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      sent: delivery.sent,
      recipientCount: recipients.length,
      fallback: !delivery.sent,
      fallbackReason: delivery.reason,
      requiredEnv: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    });
  } catch (error) {
    console.error("Outreach send failed:", error);
    return NextResponse.json({ error: "Failed to send outreach" }, { status: 500 });
  }
}
