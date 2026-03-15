import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const headersList = await headers();
    const ip = (headersList.get("x-forwarded-for") || "127.0.0.1").split(",")[0].trim();
    const country = (headersList.get("x-vercel-ip-country") || headersList.get("cf-ipcountry") || "ZZ").toUpperCase();
    const date = new Date().toISOString().split("T")[0];
    const identifier = `${country}|${ip}-${date}`;

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
