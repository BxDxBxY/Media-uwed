import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Quick DB check with counts
    const [sourcesCount, rawCount, processedCount] = await Promise.all([
      prisma.source.count(),
      prisma.articleRaw.count(),
      prisma.articleProcessed.count(),
    ]);

    const enabledSources = await prisma.source.count({
      where: { enabled: true },
    });

    const unprocessedCount = await prisma.articleRaw.count({
      where: { processed: null },
    });

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      counts: {
        sources: sourcesCount,
        enabledSources,
        articlesRaw: rawCount,
        articlesProcessed: processedCount,
        unprocessed: unprocessedCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
