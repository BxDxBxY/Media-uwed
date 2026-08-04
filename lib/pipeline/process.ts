import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { DEFAULT_AI_MODEL, MIN_SOURCE_CHARS, detectSourceLanguage, processNewsAI } from "@/lib/ai";
import { getAiUsage, recordAiRequests } from "@/lib/ai-usage";
import { scrapeArticleDetails } from "@/lib/scraper";
import { decryptSecret } from "@/lib/security";
import {
  deriveTermsFromInstructions,
  matchesRequirements,
  normalizeKeywords,
} from "@/lib/automation-filters";

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
    const instructionTerms = deriveTermsFromInstructions(String(instructionsSource || ""));
    const effectiveInclude = strictSource ? [...new Set([...include, ...instructionTerms])] : include;

    const targetArticles = await prisma.articleRaw.findMany({
      where: {
        ...(retranslate ? {} : { processed: { is: null } }),
        ...(ids ? { id: { in: ids } } : {}),
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

    const filteredArticles = targetArticles.filter((raw) =>
      matchesRequirements(raw, effectiveInclude, exclude),
    );

    const aiIntegration = await prisma.integrationConfig.findUnique({
      where: { integrationType: "ai" },
    });

    if (filteredArticles.length === 0) {
      return {
        processedCount: 0,
        skippedByRequirements: targetArticles.length,
        message:
          effectiveInclude.length > 0 || exclude.length > 0
            ? "No articles matched admin requirements"
            : "No articles found for processing",
      };
    }

    let processedCount = 0;
    let failedCount = 0;
    const previews: Array<Record<string, unknown>> = [];

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

    if (budgetApplies && usage.remaining <= 0) {
      return {
        processedCount: 0,
        failedCount: 0,
        totalAttempted: 0,
        aiBudget: { used: usage.used, limit: usage.limit, remaining: 0, spentThisRun: 0 },
        message:
          `Daily AI request budget is spent (${usage.used}/${usage.limit} for ${usage.day}). ` +
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

    for (const raw of filteredArticles) {
      if (budgetApplies && requestsSpent >= usage.remaining) {
        // Leaving the rest queued beats processing them with the weak heuristic path:
        // they keep their place and get a real editorial pass tomorrow.
        stoppedForBudget = true;
        logger.warn("Stopping the batch: daily AI request budget reached", {
          requestsSpent,
          budgetRemaining: usage.remaining,
        });
        break;
      }

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
          continue;
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
            providerApiKey: aiProviderApiKey || undefined,
            providerModel: aiProviderModel,
            providerBaseUrl: (aiIntegration as any)?.providerBaseUrl || undefined,
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
          continue;
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
        console.error(`Error processing article ${raw.id}:`, error);
        failedCount++;
      }
    }

    // Flush whatever the per-article write missed, e.g. an article that threw.
    if (requestsSpent > requestsRecorded) {
      await recordAiRequests(requestsSpent - requestsRecorded);
    }

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
      requirementsApplied: effectiveInclude.length > 0 || exclude.length > 0,
      aiStrictMode: Boolean(aiStrictMode),
      aiInstructionTerms: instructionTerms.length,
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
      message: retranslate
        ? `Generated ${processedCount} re-translation preview(s). Save changes to persist.${budgetNote}`
        : `Successfully processed ${processedCount} articles ` +
          `(${llmArticles} via the AI editorial pass, ${heuristicArticles} via offline heuristics). ` +
          `Status: pending_review.${thinNote}${budgetNote}`,
    };
  }
}

