import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processNewsAI } from "@/lib/ai";
import { scrapeOgImage } from "@/lib/scraper";

export const maxDuration = 300; // 5 minutes for AI processing

export async function POST(request: Request) {
  try {
    const { ids } = await request.json().catch(() => ({ ids: null }));

    // Find ArticleRaw items that haven't been processed yet
    const unprocessedArticles = await prisma.articleRaw.findMany({
      where: {
        processed: { is: null },
        ...(ids ? { id: { in: ids } } : {}),
      },
      include: {
        source: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: ids ? undefined : 50, // Process all selected, or 50 if generic trigger
    });

    if (unprocessedArticles.length === 0) {
      return NextResponse.json({
        processedCount: 0,
        message: "No unprocessed articles found",
      });
    }

    let processedCount = 0;
    let failedCount = 0;

    // Process each article
    for (const raw of unprocessedArticles) {
      try {
        // Detect source language
        let sourceLang: "en" | "ru" | "uz" = "en";
        const sourceName = raw.source.name.toLowerCase();
        const feedUrl = raw.source.feedUrl.toLowerCase();

        if (
          sourceName.includes("(ru)") ||
          sourceName.includes("tass") ||
          sourceName.includes("ria") ||
          feedUrl.includes(".ru/")
        ) {
          sourceLang = "ru";
        } else if (
          sourceName.includes("(uz)") ||
          sourceName.includes("kun.uz") ||
          feedUrl.includes(".uz/")
        ) {
          sourceLang = "uz";
        }

        const aiResult = await processNewsAI(
          raw.title,
          raw.description || "",
          sourceLang,
        );

        if (!aiResult) {
          failedCount++;
          continue;
        }

        // Try to scrape image if missing
        let finalImageUrl = raw.imageUrl;
        if (!finalImageUrl) {
          finalImageUrl = await scrapeOgImage(raw.url);
        }

        // Create processed article
        await prisma.articleProcessed.create({
          data: {
            rawId: raw.id,
            headlineEn: aiResult.headlineEn,
            headlineRu: aiResult.headlineRu,
            headlineUz: aiResult.headlineUz,
            summaryEn: aiResult.summaryEn,
            summaryRu: aiResult.summaryRu,
            summaryUz: aiResult.summaryUz,
            contentEn: aiResult.summaryEn,
            contentRu: aiResult.summaryRu,
            contentUz: aiResult.summaryUz,
            categories: aiResult.categories.join(", "),
            status: "pending_review",
            // We'll update the raw record if we found a new image url
          },
        });

        if (finalImageUrl && finalImageUrl !== raw.imageUrl) {
          await prisma.articleRaw.update({
            where: { id: raw.id },
            data: { imageUrl: finalImageUrl },
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
      totalAttempted: unprocessedArticles.length,
      message: `Successfully processed ${processedCount} articles. Status: pending_review.`,
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
