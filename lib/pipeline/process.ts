import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { DEFAULT_AI_MODEL, MIN_SOURCE_CHARS, detectSourceLanguage, processNewsAI } from "@/lib/ai";
import { getAiUsage, recordAiRequests } from "@/lib/ai-usage";
import { scrapeArticleDetails } from "@/lib/scraper";
import { decryptSecret } from "@/lib/security";
import { matchesRequirements, normalizeKeywords } from "@/lib/automation-filters";
import { triageArticles } from "@/lib/pipeline/triage";

export type ProcessInput = {
  ids?: string[] | null;
  includeKeywords?: string | string[] | null;
  excludeKeywords?: string | string[] | null;
  aiInstructions?: string | null;
  aiStrictMode?: boolean;
  retranslate?: boolean;
  force?: boolean;
};

/**
 * Processing step: scrape article bodies, run the AI pipeline (rewrite/summarise/
 * translate/categorise) and store the result as `ArticleProcessed` awaiting review.
 *
 * Lives in `lib/` so the scheduler can call it directly — see the note in
 * `lib/pipeline/pull.ts`.
 */
export async function runProcess(input: ProcessInput = {}) {
  const {
    ids,
    includeKeywords,
    excludeKeywords,
    aiInstructions,
    aiStrictMode,
    retranslate,
    force,
  } = input;

  {
    const automationSettings = await prisma.automationConfig.findUnique({ where: { id: "default" } });


    if (!automationSettings?.processing && !force) {
      return {
        processedCount: 0,
        failedCount: 0,
        message: "Processing pipeline is disabled in admin settings.",
        pipelineEnabled: false,
      };
    }
    const includeSource = includeKeywords ?? automationSettings?.includeKeywords ?? "";
    const excludeSource = excludeKeywords ?? automationSettings?.excludeKeywords ?? "";
    const instructionsSource = aiInstructions ?? automationSettings?.aiInstructions ?? "";
    const strictSource = typeof aiStrictMode === "boolean" ? aiStrictMode : Boolean(automationSettings?.aiStrictMode);

    const include = normalizeKeywords(includeSource);
    const exclude = normalizeKeywords(excludeSource);
    const editorialBrief = String(instructionsSource || "").trim();

    const targetArticles = await prisma.articleRaw.findMany({
      where: {
        ...(retranslate ? {} : { processed: { is: null } }),
        ...(ids ? { id: { in: ids } } : {}),
        // Articles already judged off-brief stay out unless explicitly requested by id.
        // `not: "rejected"` alone would drop everything: in SQL `NULL <> 'rejected'` is
        // NULL, not true, so un-judged articles would never match.
        ...(ids ? {} : { OR: [{ relevance: null }, { relevance: { not: "rejected" } }] }),
      },
      include: {
        source: true,
        processed: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: ids ? undefined : 50,
    });

    const keywordFiltered = targetArticles.filter((raw) =>
      matchesRequirements(raw, include, exclude),
    );

    const aiIntegration = await prisma.integrationConfig.findUnique({
      where: { integrationType: "ai" },
    });

    const aiProviderApiKey = decryptSecret(aiIntegration?.providerApiKeyEncrypted);
    const aiProviderModel =
      aiIntegration?.providerModel?.trim() ||
      process.env.OPENROUTER_TRANSLATE_MODEL ||
      DEFAULT_AI_MODEL;

    // The environment variable is a valid way to configure the key, so the budget has to
    // apply to it too — otherwise an env-only setup silently runs unmetered.
    const hasProviderKey = Boolean(
      (aiProviderApiKey || "").trim() || (process.env.OPENROUTER_API_KEY || "").trim(),
    );
    const usage = await getAiUsage();
    // Only the LLM path spends quota. Without a key every article takes the offline
    // heuristic path, which is free and unlimited.
    const budgetApplies = hasProviderKey && !usage.unlimited;

    let requestsSpent = 0;
    let requestsRecorded = 0;
    let stoppedForBudget = false;
    // Split the batch by which pipeline actually produced each article: the LLM
    // editorial pass, or the offline heuristics. A run that quietly went all-heuristic
    // is the failure mode this reporting exists to make visible.
    let llmArticles = 0;
    let heuristicArticles = 0;
    let skippedThinSource = 0;
    let rejectedOffBrief = 0;

    const aiTaskConfig = {
      providerApiKey: aiProviderApiKey || undefined,
      providerModel: aiProviderModel,
      providerBaseUrl: (aiIntegration as any)?.providerBaseUrl || undefined,
    };

    /**
     * Topical triage against the admin's editorial brief. Runs before the editorial pass so
     * off-brief articles never reach it: one batched request can spare dozens of
     * article-sized ones, which on the free tier is the difference between publishing the
     * day's relevant news and burning the quota on wire noise.
     *
     * `ids` means an editor asked for these specific articles — their judgement overrides
     * the brief, so triage is skipped.
     */
    let filteredArticles = keywordFiltered;

    if (editorialBrief && hasProviderKey && !ids && strictSource) {
      const untriaged = keywordFiltered.filter((raw) => !raw.relevance);

      if (untriaged.length > 0) {
        const verdicts = await triageArticles({
          candidates: untriaged.map((raw) => ({
            id: raw.id,
            title: raw.title,
            description: raw.description,
            sourceName: raw.source?.name ?? null,
          })),
          brief: editorialBrief,
          taskConfig: {
            ...aiTaskConfig,
            onProviderRequest: () => {
              requestsSpent++;
            },
          },
          // Triage may never take more than a small slice of the day.
          maxRequests: budgetApplies ? Math.max(1, Math.min(3, usage.remaining)) : 3,
        });

        if (requestsSpent > requestsRecorded) {
          await recordAiRequests(requestsSpent - requestsRecorded);
          requestsRecorded = requestsSpent;
        }

        if (verdicts) {
          const rejectedIds = verdicts.filter((v) => !v.keep).map((v) => v.id);
          const checkedAt = new Date();

          // Persist every verdict, kept and rejected alike, so the next run does not pay
          // to judge the same headlines again.
          await Promise.all(
            verdicts.map((verdict) =>
              prisma.articleRaw.update({
                where: { id: verdict.id },
                data: {
                  relevance: verdict.keep ? "relevant" : "rejected",
                  relevanceReason: verdict.reason || null,
                  relevanceCheckedAt: checkedAt,
                },
              }),
            ),
          );

          const rejected = new Set(rejectedIds);
          rejectedOffBrief = rejected.size;
          filteredArticles = keywordFiltered.filter((raw) => !rejected.has(raw.id));

          logger.info("Triage applied the editorial brief", {
            judged: verdicts.length,
            rejected: rejected.size,
            requestsSpent,
          });
        } else {
          // Triage could not run. Processing everything is the safe failure: a filter that
          // fails closed would stop the site publishing at all.
          logger.warn("Triage produced no verdicts; processing the batch unfiltered");
        }
      } else {
        filteredArticles = keywordFiltered.filter((raw) => raw.relevance !== "rejected");
      }
    }

    if (filteredArticles.length === 0) {
      return {
        processedCount: 0,
        skippedByRequirements: targetArticles.length - filteredArticles.length,
        rejectedOffBrief,
        message:
          rejectedOffBrief > 0
            ? `No articles left after the editorial brief rejected ${rejectedOffBrief} as off-topic.`
            : include.length > 0 || exclude.length > 0
              ? "No articles matched admin requirements"
              : "No articles found for processing",
      };
    }

    let processedCount = 0;
    let failedCount = 0;
    const previews: Array<Record<string, unknown>> = [];

    if (budgetApplies && usage.remaining - requestsSpent <= 0) {
      return {
        processedCount: 0,
        failedCount: 0,
        totalAttempted: 0,
        aiBudget: {
          used: usage.used + requestsSpent,
          limit: usage.limit,
          remaining: 0,
          spentThisRun: requestsSpent,
        },
        rejectedOffBrief,
        message:
          `Daily AI request budget is spent (${usage.used + requestsSpent}/${usage.limit} for ${usage.day}). ` +
          `${filteredArticles.length} article(s) stay queued until the quota resets at 00:00 UTC. ` +
          `Raise AI_DAILY_REQUEST_LIMIT, or set it to 0 to disable metering, if the account is not on the free tier.`,
      };
    }

    logger.debug("Processing batch with AI provider", {
      hasProviderKey,
      integrationEnabled: aiIntegration?.enabled ?? true,
      providerName: aiIntegration?.provider || null,
      providerModel: aiProviderModel,
      articles: filteredArticles.length,
      dailyBudget: budgetApplies ? `${usage.used}/${usage.limit}` : "unmetered",
    });

    /**
     * Articles are processed concurrently.
     *
     * They used to run strictly one at a time, and each editorial pass takes roughly 75
     * seconds against a free model. `/api/cron/automation` declares `maxDuration = 300`, so
     * a sequential run could never finish more than about four articles before the platform
     * killed it — the scheduled pipeline was capped at four articles per run regardless of
     * how many were queued. OpenRouter's free tier allows 20 requests a minute, so a small
     * pool stays well inside the rate limit while cutting wall-clock time by the pool size.
     *
     * Shared counters are safe to mutate here: JavaScript runs one task at a time, so the
     * increments below cannot interleave mid-statement. The budget is re-checked before each
     * article is claimed, which is what keeps the pool from overshooting the daily quota.
     */
    const concurrency = Math.max(1, Math.min(8, Number(process.env.AI_PROCESS_CONCURRENCY || 4)));
    const queue = [...filteredArticles];

    const processOne = async (raw: (typeof filteredArticles)[number]) => {
      try {
        let detailedContent = "";
        let finalImageUrl = raw.imageUrl;
        let detailImages: string[] = [];

        let parsedRawJson: Record<string, unknown> = {};
        try {
          parsedRawJson = raw.rawJson ? JSON.parse(raw.rawJson) : {};
        } catch {
          parsedRawJson = {};
        }

        const existingDetail =
          typeof parsedRawJson.fullContent === "string" ? parsedRawJson.fullContent : "";

        if (existingDetail.length > 200) {
          detailedContent = existingDetail;
          detailImages = Array.isArray((parsedRawJson as any).detailImages)
            ? (parsedRawJson as any).detailImages.filter((x: unknown): x is string => typeof x === "string")
            : [];
        } else {
          try {
            const details = await scrapeArticleDetails(raw.url);
            detailedContent = details.content || "";
            detailImages = Array.isArray(details.imageUrls) ? details.imageUrls : [];
            if (!finalImageUrl && details.imageUrl) {
              finalImageUrl = details.imageUrl;
            }
          } catch (scrapeError) {
            console.warn(`Scrape failed for article ${raw.id}, continuing with RSS summary only`, scrapeError);
          }

          const uniqueDetailImages = Array.from(new Set(detailImages.filter(Boolean))).filter((img) => img !== finalImageUrl);

          await prisma.articleRaw.update({
            where: { id: raw.id },
            data: {
              imageUrl: finalImageUrl || null,
              rawJson: JSON.stringify({
                ...parsedRawJson,
                fullContent: detailedContent || null,
                detailFetchedAt: new Date().toISOString(),
                detailImages: uniqueDetailImages.length > 0 ? uniqueDetailImages : null,
              }),
            },
          });
        }

        const sourceMaterial = `${raw.title}\n${raw.description || ""}\n${detailedContent}`;

        // A headline with no body and no teaser cannot be rewritten into an article —
        // it can only be padded out with invented detail. Leave it queued: a later run
        // may scrape successfully, and until then nothing false gets published.
        if (sourceMaterial.trim().length < MIN_SOURCE_CHARS) {
          skippedThinSource++;
          logger.warn("Skipping article: not enough source material to rewrite", {
            id: raw.id,
            url: raw.url,
            chars: sourceMaterial.trim().length,
          });
          return;
        }

        const sourceLang = detectSourceLanguage(sourceMaterial);

        const aiResult = await processNewsAI(
          raw.title,
          raw.description || "",
          sourceLang,
          detailedContent,
          {
            summarizationEnabled: aiIntegration?.aiSummarization ?? true,
            categorizationEnabled: aiIntegration?.aiCategorization ?? true,
            translationPolicy:
              aiIntegration?.translationPolicy === "summary_only" ||
              aiIntegration?.translationPolicy === "disabled"
                ? aiIntegration.translationPolicy
                : "full",
            ...aiTaskConfig,
            editorialPrompt: aiIntegration?.editorialPrompt || undefined,
            maxProviderRequests: budgetApplies
              ? Math.max(1, usage.remaining - requestsSpent)
              : undefined,
            onProviderRequest: () => {
              requestsSpent++;
            },
            onEditorialOutcome: ({ model }) => {
              if (model) llmArticles++;
              else heuristicArticles++;
            },
          },
        );

        // Persist the counter before branching, so a failed article still pays for the
        // requests it sent.
        if (requestsSpent > requestsRecorded) {
          await recordAiRequests(requestsSpent - requestsRecorded);
          requestsRecorded = requestsSpent;
        }

        if (!aiResult) {
          failedCount++;
          return;
        }

        const sourceCategory = (raw.source?.category || "").trim();
        const cleanedCategories = Array.from(new Set((aiResult.categories || []).map((c) => String(c || "").trim()).filter(Boolean)))
          .filter((c) => c.toLowerCase() !== "news")
          .slice(0, 3);
        const normalizedCategories = cleanedCategories.length > 0
          ? cleanedCategories
          : [sourceCategory || "World"];

        if (retranslate) {
          previews.push({
            rawId: raw.id,
            processedId: raw.processed?.id || null,
            headlineEn: aiResult.headlineEn,
            headlineRu: aiResult.headlineRu,
            headlineUz: aiResult.headlineUz,
            summaryEn: aiResult.summaryEn,
            summaryRu: aiResult.summaryRu,
            summaryUz: aiResult.summaryUz,
            contentEn: aiResult.contentEn,
            contentRu: aiResult.contentRu,
            contentUz: aiResult.contentUz,
            categories: normalizedCategories.join(", "),
            rawImageUrl: finalImageUrl || null,
          });
        } else if (raw.processed) {
          await prisma.articleProcessed.update({
            where: { id: raw.processed.id },
            data: {
              headlineEn: aiResult.headlineEn,
              headlineRu: aiResult.headlineRu,
              headlineUz: aiResult.headlineUz,
              summaryEn: aiResult.summaryEn,
              summaryRu: aiResult.summaryRu,
              summaryUz: aiResult.summaryUz,
              contentEn: aiResult.contentEn,
              contentRu: aiResult.contentRu,
              contentUz: aiResult.contentUz,
              categories: normalizedCategories.join(", "),
              status: "pending_review",
            },
          });
        } else {
          await prisma.articleProcessed.create({
            data: {
              rawId: raw.id,
              headlineEn: aiResult.headlineEn,
              headlineRu: aiResult.headlineRu,
              headlineUz: aiResult.headlineUz,
              summaryEn: aiResult.summaryEn,
              summaryRu: aiResult.summaryRu,
              summaryUz: aiResult.summaryUz,
              contentEn: aiResult.contentEn,
              contentRu: aiResult.contentRu,
              contentUz: aiResult.contentUz,
              categories: normalizedCategories.join(", "),
              status: "pending_review",
            },
          });
        }

        processedCount++;
      } catch (error) {
        logger.error("Failed to process an article", {
          id: raw.id,
          url: raw.url,
          message: error instanceof Error ? error.message : String(error),
        });
        failedCount++;
      }
    };

    const worker = async () => {
      for (;;) {
        if (budgetApplies && requestsSpent >= usage.remaining) {
          // Leaving the rest queued beats processing them with the weak heuristic path:
          // they keep their place and get a real editorial pass tomorrow.
          stoppedForBudget = true;
          return;
        }
        const raw = queue.shift();
        if (!raw) return;
        await processOne(raw);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()),
    );

    // Flush whatever the per-article write missed, e.g. an article that threw.
    if (requestsSpent > requestsRecorded) {
      await recordAiRequests(requestsSpent - requestsRecorded);
    }

    const briefNote = rejectedOffBrief
      ? ` ${rejectedOffBrief} rejected as off-topic by the editorial brief.`
      : "";

    const thinNote = skippedThinSource
      ? ` ${skippedThinSource} skipped: the source gave only a headline, so there was nothing to rewrite.`
      : "";

    const budgetNote = stoppedForBudget
      ? ` Stopped early: the daily AI request budget (${usage.limit}) is spent, ` +
        `${filteredArticles.length - processedCount - failedCount} article(s) stay queued until 00:00 UTC.`
      : "";

    return {
      processedCount,
      failedCount,
      totalAttempted: filteredArticles.length,
      skippedByRequirements: Math.max(0, targetArticles.length - filteredArticles.length),
      requirementsApplied: include.length > 0 || exclude.length > 0,
      aiStrictMode: strictSource,
      briefApplied: Boolean(editorialBrief) && strictSource && hasProviderKey,
      previews: retranslate ? previews : undefined,
      aiBudget: budgetApplies
        ? {
            used: usage.used + requestsSpent,
            limit: usage.limit,
            remaining: Math.max(0, usage.remaining - requestsSpent),
            spentThisRun: requestsSpent,
          }
        : undefined,
      llmArticles,
      heuristicArticles,
      skippedThinSource,
      rejectedOffBrief,
      message: retranslate
        ? `Generated ${processedCount} re-translation preview(s). Save changes to persist.${budgetNote}`
        : `Successfully processed ${processedCount} articles ` +
          `(${llmArticles} via the AI editorial pass, ${heuristicArticles} via offline heuristics). ` +
          `Status: pending_review.${briefNote}${thinNote}${budgetNote}`,
    };
  }
}

