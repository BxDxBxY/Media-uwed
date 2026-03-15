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

function escapeTelegramHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}



function sanitizeSourceUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl;
  }
}

function buildTelegramNewsMessage(input: {
  titleRu: string;
  summaryRu: string;
  titleEn: string;
  summaryEn: string;
  titleUz: string;
  summaryUz: string;
}) {
  return [
    "📰 <b>New article published</b>",
    "",
    `🇷🇺 <b>${escapeTelegramHtml(input.titleRu)}</b>`,
    escapeTelegramHtml(input.summaryRu),
    "",
    `🇬🇧 <b>${escapeTelegramHtml(input.titleEn)}</b>`,
    escapeTelegramHtml(input.summaryEn),
    "",
    `🇺🇿 <b>${escapeTelegramHtml(input.titleUz)}</b>`,
    escapeTelegramHtml(input.summaryUz),
  ].join("\n");
}


function getPublicSiteBaseUrl() {
  const candidate = (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const processedIds = Array.isArray(body?.processedIds) ? body.processedIds.filter(Boolean) : null;

    const readyToPublish = await prisma.articleProcessed.findMany({
      where: processedIds && processedIds.length > 0
        ? { id: { in: processedIds }, status: { in: ["ready", "pending_review"] } }
        : { status: "ready" },
      include: { raw: { include: { source: true } } },
      take: 20,
    });

    if (readyToPublish.length === 0) {
      return NextResponse.json({
        publishedCount: 0,
        message: processedIds && processedIds.length > 0
          ? "No matching review items found for single/batch publish."
          : "No articles with 'ready' status found. Please review and approve articles first.",
      });
    }

    const telegramIntegration = await prisma.integrationConfig.findUnique({
      where: { integrationType: "telegram" },
    });

    const telegramEnabled = Boolean(telegramIntegration?.enabled && telegramIntegration?.sendOnPublish);
    const telegramBotToken = decryptSecret(telegramIntegration?.providerApiKeyEncrypted)?.trim();
    const publicSiteBaseUrl = getPublicSiteBaseUrl();

    let publishedCount = 0;
    let telegramSentCount = 0;
    const errors: string[] = [];

    if (telegramEnabled && !publicSiteBaseUrl) {
      logger.error("Telegram publish skipped: missing valid public APP_URL/NEXT_PUBLIC_SITE_URL", {
        appUrl: process.env.APP_URL || null,
        nextPublicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
      });
      errors.push("Telegram enabled but APP_URL/NEXT_PUBLIC_SITE_URL is missing or points to localhost.");
    }

    if (telegramEnabled && (!telegramBotToken || !telegramIntegration?.channelId?.trim())) {
      logger.error("Telegram is enabled but credentials are incomplete", {
        hasToken: Boolean(telegramBotToken),
        hasChannelId: Boolean(telegramIntegration?.channelId?.trim()),
      });
      errors.push("Telegram is enabled but bot token or channel ID is missing.");
    }

    for (const item of readyToPublish) {
      try {
        const baseSlug = generateSlug(item.headlineEn || "news-article").slice(0, 50);
        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const slug = `${baseSlug || "article"}-${randomSuffix}`;

        let rawJson: Record<string, unknown> = {};
        try {
          rawJson = item.raw.rawJson ? JSON.parse(item.raw.rawJson) : {};
        } catch {
          rawJson = {};
        }

        const sourceUrl = sanitizeSourceUrl(item.raw.url);
        const sourceLinkText = `\n\nOriginal source: [${item.raw.source.name}](${sourceUrl})`;

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
            image: item.raw.imageUrl || "",
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

        if (telegramEnabled && telegramBotToken && telegramIntegration?.channelId?.trim()) {
          try {
            const articleUrl = publicSiteBaseUrl ? `${publicSiteBaseUrl}/article/${article.slug}` : null;
            const telegramMessage = buildTelegramNewsMessage({
              titleRu: item.headlineRu || item.headlineEn,
              summaryRu: item.summaryRu || item.summaryEn,
              titleEn: item.headlineEn,
              summaryEn: item.summaryEn,
              titleUz: item.headlineUz || item.headlineEn,
              summaryUz: item.summaryUz || item.summaryEn,
            });

            if (!articleUrl) {
              logger.error("Skipping Telegram send due to invalid public site URL", { itemId: item.id });
              errors.push(`Item ${item.id}: Telegram skipped (invalid APP_URL/NEXT_PUBLIC_SITE_URL)`);
            } else {
              logger.info("Publishing article to Telegram", { itemId: item.id, hasImage: Boolean(article.image), chatId: telegramIntegration.channelId.trim(), articleUrl });
              await sendTelegramMessage({
              botToken: telegramBotToken,
              chatId: telegramIntegration.channelId.trim(),
              text: telegramMessage,
              photoUrl: article.image,
              parseMode: undefined,
              disableWebPagePreview: false,
              retries: telegramIntegration.retryLimit,
              buttonText: "Read on website",
              buttonUrl: articleUrl,
            });
              telegramSentCount++;
            }
          } catch (telegramError) {
            logger.error("Telegram delivery failed for published article", {
              itemId: item.id,
              error: telegramError instanceof Error ? telegramError.message : String(telegramError),
            });
            errors.push(`Item ${item.id}: published but Telegram delivery failed (${telegramError instanceof Error ? telegramError.message : String(telegramError)})`);
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
