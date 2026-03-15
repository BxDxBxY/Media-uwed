import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectSourceLanguage, processNewsAI } from "@/lib/ai";
import { scrapeArticleDetails } from "@/lib/scraper";
import { decryptSecret } from "@/lib/security";
import {
  deriveTermsFromInstructions,
  matchesRequirements,
  normalizeKeywords,
} from "@/lib/automation-filters";

export const maxDuration = 300; // 5 minutes for AI processing

export async function POST(request: Request) {
  try {
    const {
      ids,
      includeKeywords,
      excludeKeywords,
      aiInstructions,
      aiStrictMode,
      retranslate,
    } = await request.json().catch(() => ({
      ids: null,
      includeKeywords: [],
      excludeKeywords: [],
      aiInstructions: "",
      aiStrictMode: false,
      retranslate: false,
    }));

    const automationSettings = await prisma.automationConfig.findUnique({ where: { id: "default" } });

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
      return NextResponse.json({
        processedCount: 0,
        skippedByRequirements: targetArticles.length,
        message:
          effectiveInclude.length > 0 || exclude.length > 0
            ? "No articles matched admin requirements"
            : "No articles found for processing",
      });
    }

    let processedCount = 0;
    let failedCount = 0;
    const previews: Array<Record<string, unknown>> = [];

    const aiProviderApiKey = decryptSecret(aiIntegration?.providerApiKeyEncrypted);
    const aiProviderModel =
      aiIntegration?.providerModel?.trim() ||
      process.env.OPENROUTER_TRANSLATE_MODEL ||
      "openai/gpt-4o-mini";

    console.log("processNewsAI provider key check", {
      hasTaskProviderKey: Boolean(aiProviderApiKey && aiProviderApiKey.trim()),
      integrationEnabled: aiIntegration?.enabled ?? true,
      providerName: aiIntegration?.provider || null,
      providerModel: aiProviderModel,
    });

    for (const raw of filteredArticles) {
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

          await prisma.articleRaw.update({
            where: { id: raw.id },
            data: {
              imageUrl: finalImageUrl || null,
              rawJson: JSON.stringify({
                ...parsedRawJson,
                fullContent: detailedContent || null,
                detailFetchedAt: new Date().toISOString(),
                detailImages: detailImages.length > 0 ? detailImages : null,
              }),
            },
          });
        }

        const sourceLang = detectSourceLanguage(
          `${raw.title}\n${raw.description || ""}\n${detailedContent}`,
        );

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
            editorialPrompt: aiIntegration?.editorialPrompt || undefined,
          },
        );

        if (!aiResult) {
          failedCount++;
          continue;
        }

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
            categories: aiResult.categories.join(", "),
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
              categories: aiResult.categories.join(", "),
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
              categories: aiResult.categories.join(", "),
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

    return NextResponse.json({
      processedCount,
      failedCount,
      totalAttempted: filteredArticles.length,
      skippedByRequirements: Math.max(0, targetArticles.length - filteredArticles.length),
      requirementsApplied: effectiveInclude.length > 0 || exclude.length > 0,
      aiStrictMode: Boolean(aiStrictMode),
      aiInstructionTerms: instructionTerms.length,
      previews: retranslate ? previews : undefined,
      message: retranslate
        ? `Generated ${processedCount} re-translation preview(s). Save changes to persist.`
        : `Successfully processed ${processedCount} articles. Status: pending_review.`,
    });
  } catch (error) {
    console.error("Error in process endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to process articles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
