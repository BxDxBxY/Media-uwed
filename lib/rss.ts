import Parser from "rss-parser";
import crypto from "crypto";

export interface NormalizedRSSItem {
  url: string;
  title: string;
  description: string | null;
  author: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  guid: string;
  rawJson: string;
}

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
  },
});

/**
 * Generate a stable GUID for an RSS item
 */
function generateGuid(item: any, url: string, title: string): string {
  if (item.guid) {
    return typeof item.guid === "string"
      ? item.guid
      : item.guid?._ || JSON.stringify(item.guid);
  }
  const hash = crypto.createHash("sha256");
  hash.update(`${url}::${title}`);
  return hash.digest("hex");
}

/**
 * Extract image from RSS item
 */
function extractImage(item: any): string | null {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item["media:content"]?.[0]?.url) return item["media:content"][0].url;
  if (item["media:thumbnail"]?.[0]?.url) return item["media:thumbnail"][0].url;

  const content = item.content || item.description || "";
  const contentMatch = content.match(/src="([^"]+)"/);
  if (contentMatch) return contentMatch[1];

  return null;
}

/**
 * Normalize an RSS item into a consistent format
 */
function normalizeItem(item: any): NormalizedRSSItem | null {
  const url = item.link?.trim();
  const title = item.title?.trim();

  if (!url || !title) {
    return null;
  }

  const description =
    item.contentSnippet?.trim() ||
    item.content?.trim() ||
    item.description?.trim() ||
    null;

  const author = item.creator || item.author || item["dc:creator"] || null;
  const imageUrl = extractImage(item);

  let publishedAt: Date | null = null;
  if (item.isoDate) {
    publishedAt = new Date(item.isoDate);
  } else if (item.pubDate) {
    publishedAt = new Date(item.pubDate);
  }

  const guid = generateGuid(item, url, title);
  const rawJson = JSON.stringify(item);

  return {
    url,
    title,
    description,
    author,
    imageUrl,
    publishedAt,
    guid,
    rawJson,
  };
}

export async function fetchRSSFeed(feedUrl: string): Promise<{
  items: NormalizedRSSItem[];
  error?: string;
}> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const items: NormalizedRSSItem[] = [];

    for (const item of feed.items || []) {
      const normalized = normalizeItem(item);
      if (normalized) {
        items.push(normalized);
      }
    }

    return { items };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to fetch RSS feed ${feedUrl}:`, errorMessage);
    return {
      items: [],
      error: errorMessage,
    };
  }
}

export async function fetchMultipleFeeds(
  feedUrls: string[],
  concurrencyLimit: number = 5,
): Promise<Map<string, { items: NormalizedRSSItem[]; error?: string }>> {
  const results = new Map<
    string,
    { items: NormalizedRSSItem[]; error?: string }
  >();

  for (let i = 0; i < feedUrls.length; i += concurrencyLimit) {
    const batch = feedUrls.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(async (url) => ({
        url,
        result: await fetchRSSFeed(url),
      })),
    );

    for (const { url, result } of batchResults) {
      results.set(url, result);
    }
  }

  return results;
}
