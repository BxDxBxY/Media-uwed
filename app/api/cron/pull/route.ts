import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMultipleFeeds } from "@/lib/rss";

export const maxDuration = 60; // Allow up to 60 seconds for this endpoint

export async function POST() {
  const startTime = Date.now();

  try {
    // Get all enabled sources
    const sources = await prisma.source.findMany({
      where: { enabled: true },
    });

    if (sources.length === 0) {
      return NextResponse.json({
        sourcesChecked: 0,
        itemsFetched: 0,
        newInserted: 0,
        message: "No enabled sources found. Run /api/admin/sources/seed first.",
      });
    }

    const feedUrls = sources.map((s) => s.feedUrl);

    // Fetch all feeds with concurrency limit of 5
    const feedResults = await fetchMultipleFeeds(feedUrls, 5);

    let totalItemsFetched = 0;
    let totalNewInserted = 0;
    const errors: Array<{ source: string; error: string }> = [];

    // Process each source's results
    for (const source of sources) {
      const result = feedResults.get(source.feedUrl);

      if (!result) continue;

      if (result.error) {
        errors.push({
          source: source.name,
          error: result.error,
        });
        continue;
      }

      totalItemsFetched += result.items.length;
      console.log(result);

      // Upsert items into ArticleRaw
      for (const item of result.items) {
        try {
          await prisma.articleRaw.upsert({
            where: {
              sourceId_guid: {
                sourceId: source.id,
                guid: item.guid,
              },
            },
            update: {
              // Update fields in case RSS item changed
              title: item.title,
              description: item.description,
              author: item.author,
              imageUrl: item.imageUrl,
              publishedAt: item.publishedAt,
              rawJson: item.rawJson,
            },
            create: {
              sourceId: source.id,
              guid: item.guid,
              url: item.url,
              title: item.title,
              description: item.description,
              author: item.author,
              imageUrl: item.imageUrl,
              publishedAt: item.publishedAt,
              rawJson: item.rawJson,
            },
          });

          totalNewInserted++;
        } catch (error) {
          // Handle unique constraint violations (duplicate URLs)
          if (
            error instanceof Error &&
            error.message.includes("Unique constraint")
          ) {
            // Skip duplicates silently
            continue;
          }

          console.error(`Error upserting article from ${source.name}:`, error);
        }
      }

      // Update source lastFetchedAt
      await prisma.source.update({
        where: { id: source.id },
        data: { lastFetchedAt: new Date() },
      });
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      sourcesChecked: sources.length,
      itemsFetched: totalItemsFetched,
      newInserted: totalNewInserted,
      errors: errors.length > 0 ? errors : undefined,
      durationMs: duration,
      message: `Processed ${sources.length} sources in ${duration}ms`,
    });
  } catch (error) {
    console.error("Error in pull endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to pull RSS feeds",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
