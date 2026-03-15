import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const [totalVisits, totalArticleViews, popularArticles] = await Promise.all(
      [
        prisma.siteVisit.count(),
        prisma.articleView.count(),
        prisma.article.findMany({
          take: 5,
          orderBy: { views: "desc" },
          select: { id: true, title: true, views: true },
        }),
      ],
    );

    return NextResponse.json({
      totalVisits,
      totalArticleViews,
      popularArticles,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
