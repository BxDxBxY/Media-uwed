import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { RESERVED_MESSAGE_SUBJECTS } from "@/lib/assistant-memory";

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const [
      totalArticles,
      totalEvents,
      totalMedia,
      totalSubscribers,
      totalMessages,
      totalSources,
      totalVisits,
      totalArticleViews,
      recentArticles,
      popularArticles,
    ] = await Promise.all([
      prisma.article.count(),
      prisma.event.count(),
      prisma.media.count(),
      prisma.subscriber.count(),
      prisma.contactMessage.count({
        where: { archivedAt: null, subject: { notIn: [...RESERVED_MESSAGE_SUBJECTS] } },
      }),
      prisma.source.count(),
      prisma.siteVisit.count(),
      prisma.articleView.count(),
      prisma.article.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          date: true,
          categories: { select: { name: true } },
        },
      }),
      prisma.article.findMany({
        take: 5,
        orderBy: { views: "desc" },
        select: { id: true, title: true, views: true },
      }),
    ]);

    return NextResponse.json({
      totals: {
        totalArticles,
        totalEvents,
        totalMedia,
        totalSubscribers,
        totalMessages,
        totalSources,
        totalVisits,
        totalArticleViews,
      },
      recentArticles: recentArticles.map((article) => ({
        id: article.id,
        title: article.title,
        date: article.date,
        category: article.categories[0]?.name || "News",
      })),
      popularArticles,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
