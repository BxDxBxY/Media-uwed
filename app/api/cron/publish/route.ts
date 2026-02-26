import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper to generate URL-safe slugs
function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars (except spaces and hyphens)
    .replace(/[\s_]+/g, "-") // Replace spaces/underscores with -
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing -
}

export const maxDuration = 60;

export async function POST() {
  try {
    // Find items marked as 'ready' by admin
    const readyToPublish = await prisma.articleProcessed.findMany({
      where: { status: "ready" },
      include: { raw: { include: { source: true } } },
      take: 20,
    });

    if (readyToPublish.length === 0) {
      return NextResponse.json({
        publishedCount: 0,
        message:
          "No articles with 'ready' status found. Please review and approve articles first.",
      });
    }

    let publishedCount = 0;
    const errors: string[] = [];

    for (const item of readyToPublish) {
      try {
        // Robust slug generation
        const baseSlug = generateSlug(item.headlineEn || "news-article").slice(
          0,
          50,
        );
        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const slug = `${baseSlug || "article"}-${randomSuffix}`;

        // Append source link to content
        const sourceLinkText = `\n\n---\n*Original source: [${item.raw.source.name}](${item.raw.url})*`;

        const contentEn = (item.contentEn || item.summaryEn) + sourceLinkText;
        const contentRu = item.contentRu
          ? item.contentRu + sourceLinkText
          : null;
        const contentUz = item.contentUz
          ? item.contentUz + sourceLinkText
          : null;

        // Handle Categories
        const categoryNames = item.categories
          ? item.categories
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : ["News"];

        // Create or find categories
        const categoryConnect = await Promise.all(
          categoryNames.map(async (name) => {
            const cat = await prisma.category.upsert({
              where: { name },
              update: {},
              create: { name },
            });
            return { id: cat.id };
          }),
        );

        // Create the main Article
        await prisma.article.create({
          data: {
            title: item.headlineEn,
            titleRu: item.headlineRu,
            titleUz: item.headlineUz,
            summary: item.summaryEn,
            summaryRu: item.summaryRu,
            summaryUz: item.summaryUz,
            content: contentEn,
            contentRu: contentRu,
            contentUz: contentUz,
            slug: slug,
            image:
              item.raw.imageUrl ||
              `https://picsum.photos/seed/${item.id}/800/600`,
            author: item.raw.author || item.raw.source.name || "Global Media",
            url: item.raw.url,
            date: new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            categories: {
              connect: categoryConnect,
            },
          },
        });

        // Mark as published
        await prisma.articleProcessed.update({
          where: { id: item.id },
          data: { status: "published" },
        });

        publishedCount++;
      } catch (error: any) {
        console.error(`Failed to publish item ${item.id}:`, error);
        errors.push(`Item ${item.id}: ${error.message || "Unknown error"}`);
      }
    }

    return NextResponse.json({
      publishedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully published ${publishedCount} articles.`,
    });
  } catch (error: any) {
    console.error("Critical error in publish endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to publish",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
