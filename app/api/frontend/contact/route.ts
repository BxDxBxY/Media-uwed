import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { RESERVED_MESSAGE_SUBJECTS } from "@/lib/assistant-memory";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME = 120;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "contact", RATE_LIMITS.publicWrite);
  if (limited) return limited;

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const rawSubject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email and message are required" }, { status: 400 });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    if (name.length > MAX_NAME || rawSubject.length > MAX_SUBJECT || message.length > MAX_MESSAGE) {
      return NextResponse.json({ error: "One of the fields is too long" }, { status: 400 });
    }

    // The inbox table is also used internally (assistant memory/actions keyed by
    // subject). A public caller must not be able to forge those rows — otherwise
    // arbitrary text lands in the admin assistant's context.
    const subject =
      !rawSubject || RESERVED_MESSAGE_SUBJECTS.includes(rawSubject) ? "General Inquiry" : rawSubject;

    const contact = await prisma.contactMessage.create({
      data: { name, email, subject, message },
    });

    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
