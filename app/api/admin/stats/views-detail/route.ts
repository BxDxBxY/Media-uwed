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

    const [totalArticleViews, recentViews, topArticles] = await Promise.all([
      prisma.articleView.count(),
      prisma.articleView.findMany({
        orderBy: { timestamp: "desc" },
        take: 3000,
        select: { timestamp: true, articleId: true },
      }),
      prisma.article.findMany({
        take: 10,
        orderBy: { views: "desc" },
        select: { id: true, title: true, slug: true, views: true },
      }),
    ]);

    const byDay = new Map<string, number>();
    for (const view of recentViews) {
      const key = dayKey(view.timestamp);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }

    const daily = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      totalArticleViews,
      topArticles,
      daily,
      latestRecordedAt: recentViews[0]?.timestamp || null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch article views detail" }, { status: 500 });
  }
}
