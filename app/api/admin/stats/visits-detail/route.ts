import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseCountry(visitorIdentifier: string): string {
  const [first] = visitorIdentifier.split("|");
  if (first && /^[A-Z]{2}$/.test(first)) return first;
  return "ZZ";
}

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    const recentVisits = await prisma.siteVisit.findMany({
      where: { timestamp: { gte: monthAgo } },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true, visitorIdentifier: true },
    });

    const byDay = new Map<string, number>();
    const byCountry = new Map<string, number>();
    const byCountryByDay = new Map<string, Map<string, number>>();

    for (const visit of recentVisits) {
      const key = dayKey(visit.timestamp);
      byDay.set(key, (byDay.get(key) || 0) + 1);

      const country = parseCountry(visit.visitorIdentifier);
      byCountry.set(country, (byCountry.get(country) || 0) + 1);
      const countryDay = byCountryByDay.get(country) || new Map<string, number>();
      countryDay.set(key, (countryDay.get(key) || 0) + 1);
      byCountryByDay.set(country, countryDay);
    }

    const daily: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = dayKey(d);
      daily.push({ date: key, count: byDay.get(key) || 0 });
    }

    const countries = [...byCountry.entries()]
      .map(([country, visits]) => ({ country, visits }))
      .sort((a, b) => b.visits - a.visits);

    const countryDaily = countries.map(({ country }) => ({
      country,
      daily: daily.map((entry) => ({
        date: entry.date,
        count: byCountryByDay.get(country)?.get(entry.date) || 0,
      })),
    }));

    const uniqueVisitors = new Set(recentVisits.map((x) => x.visitorIdentifier)).size;

    return NextResponse.json({
      totalVisits: recentVisits.length,
      uniqueVisitors,
      daily,
      countries,
      countryDaily,
      latestRecordedAt: recentVisits[0]?.timestamp || null,
      windowDays: 30,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch visits detail" }, { status: 500 });
  }
}
