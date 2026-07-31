import axios from "axios";
import * as cheerio from "cheerio";
import { assertPublicUrl } from "@/lib/safe-fetch";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
};

function normalizeImageUrl(src: string | undefined, baseUrl: string): string | null {
  if (!src) return null;
  try {
    const url = new URL(src, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function scoreImage(url: string): number {
  const lower = url.toLowerCase();
  let score = 100;

  if (/thumb|thumbnail|icon|sprite|logo|avatar|small|\b120x\b|\b150x\b|\b200x\b/.test(lower)) score -= 60;
  if (/\.svg(\?|$)/.test(lower)) score -= 40;
  if (/\b(1080|1200|1280|1600|1920|2048)\b/.test(lower)) score += 30;
  if (/\b(720|800|900|1024)\b/.test(lower)) score += 15;
  if (/og:image|twitter:image/.test(lower)) score += 20;

  return score;
}

function pickBestImage(candidates: string[]): string | null {
  if (!candidates.length) return null;
  const unique = Array.from(new Set(candidates));
  unique.sort((a, b) => scoreImage(b) - scoreImage(a));
  return unique[0] || null;
}

/**
 * Scrapes a URL for OpenGraph and Twitter meta tags to find an image.
 */
export async function scrapeOgImage(url: string): Promise<string | null> {
  try {
    await assertPublicUrl(url);
    const response = await axios.get(url, {
      timeout: 10000,
      headers: DEFAULT_HEADERS,
    });

    const html = response.data as string;

    // Common image meta tags
    const patterns = [
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
      /<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return normalizeImageUrl(match[1], url);
      }
    }

    return null;
  } catch (error) {
    console.error(`Scraper error for ${url}:`, error);
    return null;
  }
}

export async function scrapeArticleDetails(url: string): Promise<{ content: string | null; imageUrl: string | null; imageUrls: string[] }> {
  try {
    await assertPublicUrl(url);
    const response = await axios.get(url, {
      timeout: 15000,
      headers: DEFAULT_HEADERS,
    });

    const html = response.data as string;
    const $ = cheerio.load(html);

    $("script, style, noscript, iframe").remove();

    const contentSelectors = [
      "article p",
      "main p",
      ".article-content p",
      ".post-content p",
      ".entry-content p",
      ".content p",
      "p",
    ];

    let content = "";

    for (const selector of contentSelectors) {
      const paragraphs = $(selector)
        .map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
        .get()
        .filter((text) => text.length > 40);

      const combined = paragraphs.join("\n\n").trim();
      if (combined.length > content.length) {
        content = combined;
      }

      if (content.length > 700) break;
    }

    const rawCandidates = [
      $("meta[property='og:image']").attr("content"),
      $("meta[name='twitter:image']").attr("content"),
      ...$("article img, main img, .content img").map((_, img) => $(img).attr("src")).get(),
      ...$("article img, main img, .content img").map((_, img) => $(img).attr("data-src")).get(),
      ...$("article img, main img, .content img").map((_, img) => $(img).attr("srcset")?.split(",").pop()?.trim().split(" ")[0]).get(),
    ];

    const imageCandidates = rawCandidates
      .map((candidate) => normalizeImageUrl(candidate || undefined, url))
      .filter((v): v is string => Boolean(v));

    const imageUrls = Array.from(new Set(imageCandidates)).sort((a, b) => scoreImage(b) - scoreImage(a)).slice(0, 6);
    const imageUrl = pickBestImage(imageUrls);

    return {
      content: content || null,
      imageUrl: imageUrl || null,
      imageUrls,
    };
  } catch (error) {
    console.error(`Article detail scraper error for ${url}:`, error);
    return { content: null, imageUrl: null, imageUrls: [] };
  }
}
