import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST() {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "127.0.0.1";
    const date = new Date().toISOString().split("T")[0];
    const identifier = `${ip}-${date}`;

    const existing = await prisma.siteVisit.findFirst({
      where: { visitorIdentifier: identifier },
    });

    if (!existing) {
      await prisma.siteVisit.create({
        data: { visitorIdentifier: identifier },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to record visit" },
      { status: 500 },
    );
  }
}
