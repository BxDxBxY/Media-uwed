import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Max 100 per page

    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.articleProcessed.count({
      where: { status: "ready" },
    });

    // Get articles with joins
    const processedArticles = await prisma.articleProcessed.findMany({
      where: { status: "ready" },
      include: {
        raw: {
          include: {
            source: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Format response
    const articles = processedArticles.map((article) => ({
      id: article.id,
      headline: article.headlineEn,
      summary: article.summaryEn,
      url: article.raw.url,
      sourceName: article.raw.source.name,
      sourceCategory: article.raw.source.category,
      publishedAt: article.raw.publishedAt,
      createdAt: article.createdAt,
    }));

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch articles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
