import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMultipleFeeds } from "@/lib/rss";
import { matchesRequirements, normalizeKeywords } from "@/lib/automation-filters";

export const maxDuration = 60; // Allow up to 60 seconds for this endpoint

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const {
      includeKeywords,
      excludeKeywords,
      force,
    } = await request.json().catch(() => ({
      includeKeywords: [],
      excludeKeywords: [],
      force: false,
    }));

    const automationSettings = await prisma.automationConfig.findUnique({ where: { id: "default" } });


    if (!automationSettings?.automatedPull && !force) {
      return NextResponse.json({
        sourcesChecked: 0,
        itemsFetched: 0,
        newInserted: 0,
        message: "Automated pull pipeline is disabled in admin settings.",
        pipelineEnabled: false,
      });
    }
    const includeSource = includeKeywords ?? automationSettings?.includeKeywords ?? "";
    const excludeSource = excludeKeywords ?? automationSettings?.excludeKeywords ?? "";
    const include = normalizeKeywords(includeSource);
    const exclude = normalizeKeywords(excludeSource);
    const effectiveInclude = include;

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
    const feedResults = await fetchMultipleFeeds(feedUrls, 5);

    let totalItemsFetched = 0;
    let totalNewInserted = 0;
    let skippedByRequirements = 0;
    const errors: Array<{ source: string; error: string }> = [];

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

      const filteredItems = result.items.filter((item) =>
        matchesRequirements(item, effectiveInclude, exclude),
      );
      skippedByRequirements += result.items.length - filteredItems.length;

      for (const item of filteredItems) {
        try {
          await prisma.articleRaw.upsert({
            where: {
              sourceId_guid: {
                sourceId: source.id,
                guid: item.guid,
              },
            },
            update: {
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
          if (
            error instanceof Error &&
            error.message.includes("Unique constraint")
          ) {
            continue;
          }

          console.error(`Error upserting article from ${source.name}:`, error);
        }
      }

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
      skippedByRequirements,
      requirementsApplied: effectiveInclude.length > 0 || exclude.length > 0,
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
