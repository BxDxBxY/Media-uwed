import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
