import { prisma } from "@/lib/prisma";
import { fetchMultipleFeeds } from "@/lib/rss";
import { matchesRequirements, normalizeKeywords } from "@/lib/automation-filters";
import { logger } from "@/lib/logger";

/**
 * Keeps the scraped body and image list from a previous run while taking the feed's
 * fresher metadata. Fields the incoming item does not have simply survive.
 */
function mergeRawJson(existingRaw: string, incomingRaw: string): string {
  try {
    const existing = JSON.parse(existingRaw) as Record<string, unknown>;
    const incoming = JSON.parse(incomingRaw) as Record<string, unknown>;

    const preserved: Record<string, unknown> = { ...incoming };
    for (const key of ["fullContent", "detailImages", "detailFetchedAt"]) {
      if (!incoming[key] && existing[key]) preserved[key] = existing[key];
    }

    return JSON.stringify(preserved);
  } catch {
    return incomingRaw;
  }
}

export type PullInput = {
  includeKeywords?: string | string[] | null;
  excludeKeywords?: string | string[] | null;
  force?: boolean;
};

/**
 * Ingest step: fetch every enabled RSS source and store new items as `ArticleRaw`.
 *
 * Lives in `lib/` rather than in the route module because Next.js only allows route
 * files to export HTTP handlers and a fixed set of config values — and because the
 * scheduler needs to call this directly instead of fabricating an internal `Request`
 * (which would carry no credentials).
 */
export async function runPull(input: PullInput = {}) {
  const startTime = Date.now();
  const { includeKeywords, excludeKeywords, force } = input;

  const automationSettings = await prisma.automationConfig.findUnique({ where: { id: "default" } });

  if (!automationSettings?.automatedPull && !force) {
    return {
      sourcesChecked: 0,
      itemsFetched: 0,
      newInserted: 0,
      message: "Automated pull pipeline is disabled in admin settings.",
      pipelineEnabled: false,
    };
  }

  {
    const includeSource = includeKeywords ?? automationSettings?.includeKeywords ?? "";
    const excludeSource = excludeKeywords ?? automationSettings?.excludeKeywords ?? "";
    const include = normalizeKeywords(includeSource);
    const exclude = normalizeKeywords(excludeSource);
    const effectiveInclude = include;

    const sources = await prisma.source.findMany({
      where: { enabled: true },
    });

    if (sources.length === 0) {
      return {
        sourcesChecked: 0,
        itemsFetched: 0,
        newInserted: 0,
        message: "No enabled sources found. Add RSS sources in Admin → Automation first.",
      };
    }

    const feedUrls = sources.map((s) => s.feedUrl);
    const feedResults = await fetchMultipleFeeds(feedUrls, 5);

    let totalItemsFetched = 0;
    let totalNewInserted = 0;
    let totalRefreshed = 0;
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
          // Distinguish "new" from "refreshed" so the reported counts mean something.
          const existing = await prisma.articleRaw.findUnique({
            where: {
              sourceId_guid: {
                sourceId: source.id,
                guid: item.guid,
              },
            },
            select: { id: true, rawJson: true },
          });

          // A refresh must not discard a body that was already scraped: the feed item
          // carries only the teaser, so overwriting rawJson wholesale would throw away
          // the scraped text and images and force the article to be fetched again.
          const rawJson = existing?.rawJson
            ? mergeRawJson(existing.rawJson, item.rawJson)
            : item.rawJson;

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
              // A feed that stops sending an image must not blank one already found.
              ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
              publishedAt: item.publishedAt,
              rawJson,
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
              rawJson,
            },
          });

          if (existing) {
            totalRefreshed++;
          } else {
            totalNewInserted++;
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("Unique constraint")
          ) {
            continue;
          }

          logger.error("Failed to store a feed item", {
            source: source.name,
            url: item.url,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await prisma.source.update({
        where: { id: source.id },
        data: { lastFetchedAt: new Date() },
      });
    }

    const duration = Date.now() - startTime;

    logger.info("Feed pull finished", {
      sources: sources.length,
      itemsFetched: totalItemsFetched,
      newInserted: totalNewInserted,
      refreshed: totalRefreshed,
      failedFeeds: errors.length,
      durationMs: duration,
    });

    return {
      sourcesChecked: sources.length,
      itemsFetched: totalItemsFetched,
      newInserted: totalNewInserted,
      refreshed: totalRefreshed,
      skippedByRequirements,
      requirementsApplied: effectiveInclude.length > 0 || exclude.length > 0,
      errors: errors.length > 0 ? errors : undefined,
      durationMs: duration,
      message:
        `Checked ${sources.length} source(s) in ${duration}ms: ` +
        `${totalNewInserted} new, ${totalRefreshed} refreshed, ${skippedByRequirements} filtered out.`,
    };
  }
}

