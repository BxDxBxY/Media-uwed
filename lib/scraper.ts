import axios from "axios";
import * as cheerio from "cheerio";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
};

/**
 * Scrapes a URL for OpenGraph and Twitter meta tags to find an image.
 */
export async function scrapeOgImage(url: string): Promise<string | null> {
  try {
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
        return match[1];
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

    const imageCandidates = [
      $("meta[property='og:image']").attr("content"),
      $("meta[name='twitter:image']").attr("content"),
      ...$("article img, main img, .content img").map((_, img) => $(img).attr("src")).get(),
    ]
      .filter((v): v is string => Boolean(v && /^https?:\/\//.test(v)));

    const imageUrls = Array.from(new Set(imageCandidates)).slice(0, 6);
    const imageUrl = imageUrls[0] || null;

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
