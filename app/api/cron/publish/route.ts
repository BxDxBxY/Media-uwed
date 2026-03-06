import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { decryptSecret } from "@/lib/security";
import { logger } from "@/lib/logger";

function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildTelegramNewsMessage(input: {
  title: string;
  summary: string;
  sourceName: string;
  categoryNames: string[];
  articleUrl: string;
}) {
  const categoryText = input.categoryNames.length > 0 ? input.categoryNames.join(", ") : "News";
  return [
    `📰 <b>${input.title}</b>`,
    "",
    input.summary,
    "",
    `🏷️ <b>Categories:</b> ${categoryText}`,
    `🌐 <b>Source:</b> ${input.sourceName}`,
    `<a href=\"${input.articleUrl}\">Read full article</a>`,
  ].join("\n");
}

export const maxDuration = 60;

export async function POST() {
  try {
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

    const telegramIntegration = await prisma.integrationConfig.findUnique({
      where: { integrationType: "telegram" },
    });

    const telegramEnabled = Boolean(telegramIntegration?.enabled && telegramIntegration?.sendOnPublish);
    const telegramBotToken = decryptSecret(telegramIntegration?.providerApiKeyEncrypted);

    let publishedCount = 0;
    let telegramSentCount = 0;
    const errors: string[] = [];

    for (const item of readyToPublish) {
      try {
        const baseSlug = generateSlug(item.headlineEn || "news-article").slice(0, 50);
        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const slug = `${baseSlug || "article"}-${randomSuffix}`;

        const sourceLinkText = `\n\n---\n*Original source: [${item.raw.source.name}](${item.raw.url})*`;

        const contentEn = (item.contentEn || item.summaryEn) + sourceLinkText;
        const contentRu = item.contentRu ? item.contentRu + sourceLinkText : null;
        const contentUz = item.contentUz ? item.contentUz + sourceLinkText : null;

        const categoryNames = item.categories
          ? item.categories
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : ["News"];

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

        const article = await prisma.article.create({
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
            slug,
            image: item.raw.imageUrl || `https://picsum.photos/seed/${item.id}/800/600`,
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

        await prisma.articleProcessed.update({
          where: { id: item.id },
          data: { status: "published" },
        });

        if (telegramEnabled && telegramBotToken && telegramIntegration?.channelId) {
          try {
            const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/article/${article.slug}`;
            const telegramMessage = buildTelegramNewsMessage({
              title: item.headlineEn,
              summary: item.summaryEn,
              sourceName: item.raw.source.name,
              categoryNames,
              articleUrl,
            });

            await sendTelegramMessage({
              botToken: telegramBotToken,
              chatId: telegramIntegration.channelId,
              text: telegramMessage,
              parseMode: "HTML",
              disableWebPagePreview: false,
              retries: telegramIntegration.retryLimit,
            });
            telegramSentCount++;
          } catch (telegramError) {
            logger.error("Telegram delivery failed for published article", {
              itemId: item.id,
              error: telegramError instanceof Error ? telegramError.message : String(telegramError),
            });
            errors.push(`Item ${item.id}: published but Telegram delivery failed`);
          }
        }

        publishedCount++;
      } catch (error: any) {
        logger.error("Failed to publish item", { itemId: item.id, error: error?.message || "Unknown error" });
        errors.push(`Item ${item.id}: ${error?.message || "Unknown error"}`);
      }
    }

    return NextResponse.json({
      publishedCount,
      telegramSentCount,
      telegramEnabled,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully published ${publishedCount} articles. Telegram sent: ${telegramSentCount}.`,
    });
  } catch (error: any) {
    logger.error("Critical error in publish endpoint", { error: error?.message || "Unknown" });
    return NextResponse.json(
      {
        error: "Failed to publish",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
