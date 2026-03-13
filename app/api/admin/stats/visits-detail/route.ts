import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const [totalVisits, recentVisits] = await Promise.all([
      prisma.siteVisit.count(),
      prisma.siteVisit.findMany({
        orderBy: { timestamp: "desc" },
        take: 1000,
        select: { timestamp: true, visitorIdentifier: true },
      }),
    ]);

    const byDay = new Map<string, number>();
    for (const visit of recentVisits) {
      const key = dayKey(visit.timestamp);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }

    const daily = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, count]) => ({ date, count }));

    const uniqueVisitors = new Set(recentVisits.map((x) => x.visitorIdentifier)).size;

    return NextResponse.json({
      totalVisits,
      uniqueVisitors,
      daily,
      latestRecordedAt: recentVisits[0]?.timestamp || null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch visits detail" }, { status: 500 });
  }
}
