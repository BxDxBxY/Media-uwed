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

function sanitizeCategoryTag(input: string) {
  const normalized = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!normalized || normalized === "news") return "#world";
  return `#${normalized}`;
}

function clampTelegramSummary(text: string): string {
  const cleaned = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!cleaned) return "";

  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2);

  const merged = (paragraphs.length > 0 ? paragraphs : [cleaned]).join("\n\n");
  return merged.length > 800 ? `${merged.slice(0, 797).trim()}...` : merged;
}

const TELEGRAM_FOOTER = [
  "🌐UWED.UZ | https://uwed.uz/",
  "🕊Telegram | https://t.me/uwed_official",
  "📱Instagram | https://instagram.com/uwed_official?igshid=YzA2ZDJiZGQ=",
  "🕊X | https://x.com/uwedofficial",
  "📱Facebook | http://www.facebook.com/uwed.uzb",
  "📺YouTube | https://www.youtube.com/channel/UC5T0U7o_epCcdM4ERGCzciQ",
].join("\n");

function buildTelegramNewsMessage(input: {
  category: string;
  titleUz: string;
  summaryUz: string;
  titleRu: string;
  summaryRu: string;
  titleEn: string;
  summaryEn: string;
}) {
  return [
    sanitizeCategoryTag(input.category),
    "",
    `🇺🇿 <b>${escapeTelegramHtml(input.titleUz)}</b>`,
    escapeTelegramHtml(clampTelegramSummary(input.summaryUz)),
    "",
    `🇷🇺 <b>${escapeTelegramHtml(input.titleRu)}</b>`,
    escapeTelegramHtml(clampTelegramSummary(input.summaryRu)),
    "",
    `🇬🇧 <b>${escapeTelegramHtml(input.titleEn)}</b>`,
    escapeTelegramHtml(clampTelegramSummary(input.summaryEn)),
    "",
    TELEGRAM_FOOTER,
  ].join("\n");
}

function stripHtmlTags(value: string) {
  return String(value || "").replace(/<[^>]+>/g, "");
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


export type PublishInput = { processedIds?: string[] | null };

/**
 * Publish step: move approved review items into `Article`, link categories and
 * optionally broadcast to Telegram.
 *
 * Lives in `lib/` so trusted server-side callers (the admin assistant) can invoke it
 * directly — see the note in `lib/pipeline/pull.ts`.
 */
export async function runPublish(input: PublishInput = {}) {
  {
    const processedIds = Array.isArray(input?.processedIds) ? input.processedIds.filter(Boolean) : null;

    const readyToPublish = await prisma.articleProcessed.findMany({
      where: processedIds && processedIds.length > 0
        ? { id: { in: processedIds }, status: { in: ["ready", "pending_review"] } }
        : { status: "ready" },
      include: { raw: { include: { source: true } } },
      take: 20,
    });

    if (readyToPublish.length === 0) {
      return {
        publishedCount: 0,
        message: processedIds && processedIds.length > 0
          ? "No matching review items found for single/batch publish."
          : "No articles with 'ready' status found. Please review and approve articles first.",
      };
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

        const sourceUrl = sanitizeSourceUrl(item.raw.url);
        const sourceLinkText = `\n\nOriginal source: [${item.raw.source.name}](${sourceUrl})`;

        const contentEn = (item.contentEn || item.summaryEn) + sourceLinkText;
        const contentRu = item.contentRu ? item.contentRu + sourceLinkText : null;
        const contentUz = item.contentUz ? item.contentUz + sourceLinkText : null;

        const baseCategories = item.categories
          ? item.categories
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
              .filter((c) => c.toLowerCase() !== "news")
          : [];

        const normalizedCategoryNames = (baseCategories.length > 0 ? baseCategories : [item.raw.source.category || "World"])
          .slice(0, 3);

        const categoryConnect = await Promise.all(
          normalizedCategoryNames.map(async (name) => {
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
            contentRu,
            contentUz,
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
              category: normalizedCategoryNames[0] || item.raw.source.category || "World",
              titleUz: item.headlineUz || item.headlineEn,
              summaryUz: item.summaryUz || item.summaryEn,
              titleRu: item.headlineRu || item.headlineEn,
              summaryRu: item.summaryRu || item.summaryEn,
              titleEn: item.headlineEn,
              summaryEn: item.summaryEn,
            });

            if (!articleUrl) {
              logger.error("Skipping Telegram send due to invalid public site URL", { itemId: item.id });
              errors.push(`Item ${item.id}: Telegram skipped (invalid APP_URL/NEXT_PUBLIC_SITE_URL)`);
            } else {
              logger.info("Publishing article to Telegram", {
                itemId: item.id,
                hasImage: Boolean(article.image),
                chatId: telegramIntegration.channelId.trim(),
                articleUrl,
              });

              try {
                await sendTelegramMessage({
                  botToken: telegramBotToken,
                  chatId: telegramIntegration.channelId.trim(),
                  text: telegramMessage,
                  photoUrl: article.image,
                  parseMode: "HTML",
                  disableWebPagePreview: false,
                  retries: telegramIntegration.retryLimit,
                  buttonText: "Read on website",
                  buttonUrl: articleUrl,
                });
              } catch (parseError) {
                const maybeParseIssue = parseError instanceof Error && /parse|entities|can't parse/i.test(parseError.message);
                if (!maybeParseIssue) throw parseError;

                logger.warn("Telegram HTML parse failed; retrying with plain text", {
                  itemId: item.id,
                  error: parseError.message,
                });

                await sendTelegramMessage({
                  botToken: telegramBotToken,
                  chatId: telegramIntegration.channelId.trim(),
                  text: stripHtmlTags(telegramMessage),
                  photoUrl: article.image,
                  parseMode: undefined,
                  disableWebPagePreview: false,
                  retries: telegramIntegration.retryLimit,
                  buttonText: "Read on website",
                  buttonUrl: articleUrl,
                });
              }

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

    return {
      publishedCount,
      telegramSentCount,
      telegramEnabled,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully published ${publishedCount} articles. Telegram sent: ${telegramSentCount}.`,
    };
  }
}

