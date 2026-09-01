import axios from "axios";
import * as cheerio from "cheerio";
import { assertPublicUrl } from "@/lib/safe-fetch";
import { logger } from "@/lib/logger";

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
    logger.warn("Could not read an image from the page", {
      url,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Chrome, wrappers and boilerplate that must never end up inside an article body. */
const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "nav",
  "aside",
  "form",
  "header",
  "footer",
  "figcaption",
  "[role='navigation']",
  "[role='banner']",
  "[aria-hidden='true']",
  ".breadcrumbs",
  ".share",
  ".sharing",
  ".social",
  ".related",
  ".recommend",
  ".comments",
  ".subscribe",
  ".newsletter",
  ".advert",
  ".advertisement",
  ".banner",
  ".cookie",
  ".paywall",
  ".tags",
  ".pagination",
].join(", ");

/**
 * Containers news sites put article bodies in, most specific first. Used to score
 * candidates rather than to pick the first match — a page can have several of these.
 */
const BODY_CONTAINERS = [
  "[itemprop='articleBody']",
  "article",
  "main",
  ".article__body",
  ".article__text",
  ".article-body",
  ".article-content",
  ".article__content",
  ".entry-content",
  ".post-content",
  ".news-detail",
  ".content__body",
  "#content",
  ".content",
];

/** Block elements that can hold a paragraph of prose. */
const BLOCK_SELECTOR = "p, div, li, blockquote, h2, h3, h4, section, span";

const MIN_BLOCK_CHARS = 40;

/**
 * Fraction of a block's text that sits inside links. Menus and "related articles" lists
 * are almost entirely linked text; real paragraphs are not.
 */
function linkDensity($: cheerio.CheerioAPI, element: cheerio.Cheerio<never>): number {
  const total = element.text().replace(/\s+/g, " ").trim().length;
  if (!total) return 1;
  const linked = element
    .find("a")
    .map((_, a) => $(a).text().replace(/\s+/g, " ").trim().length)
    .get()
    .reduce((sum, length) => sum + length, 0);
  return linked / total;
}

/**
 * Extracts prose from a subtree without assuming `<p>` tags exist.
 *
 * This is the whole reason the scraper was rewritten: several large news sites (RIA among
 * them) mark paragraphs up as `<div class="article__text">` and ship pages with **zero**
 * `<p>` elements. The old `p`-only extractor returned an empty body for them, and the
 * editorial model then had nothing but the headline to work from — so it invented the
 * article. Anything that walks block elements generically has to solve two problems:
 * nested blocks (a `div` wrapping five paragraph `div`s would be counted twice) and
 * navigation (link-dense blocks that look like text). Both are handled below.
 */
function extractProse($: cheerio.CheerioAPI, root: cheerio.Cheerio<never>): string {
  const candidates: Array<{ node: never; text: string }> = [];

  root.find(BLOCK_SELECTOR).each((_, element) => {
    const node = $(element);
    const text = node.text().replace(/\s+/g, " ").trim();

    if (text.length < MIN_BLOCK_CHARS) return;
    if (linkDensity($, node as cheerio.Cheerio<never>) > 0.4) return;

    candidates.push({ node: element as never, text });
  });

  // Drop any candidate that contains another candidate: keep the innermost blocks, which
  // are the actual paragraphs rather than their wrappers.
  const innermost = candidates.filter(
    ({ node }) =>
      !candidates.some(
        (other) => other.node !== node && $.contains(node as never, other.node as never),
      ),
  );

  const seen = new Set<string>();
  const paragraphs: string[] = [];

  for (const { text } of innermost) {
    const key = text.slice(0, 120).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    paragraphs.push(text);
  }

  return paragraphs.join("\n\n").trim();
}

/**
 * `articleBody` from JSON-LD structured data. The most reliable source when a site
 * publishes it, because it is the body the site itself declares — no markup guessing.
 */
function extractJsonLdBody($: cheerio.CheerioAPI): string {
  const blocks = $("script[type='application/ld+json']")
    .map((_, element) => $(element).text())
    .get();

  const bodies: string[] = [];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;

    const record = value as Record<string, unknown>;
    if (typeof record.articleBody === "string" && record.articleBody.trim().length > 200) {
      bodies.push(record.articleBody.trim());
    }
    // Schema.org allows nesting under @graph, mainEntity, etc.
    Object.values(record).forEach(visit);
  };

  for (const block of blocks) {
    try {
      visit(JSON.parse(block));
    } catch {
      // Malformed JSON-LD is common; fall through to the markup-based extractors.
    }
  }

  return bodies.sort((a, b) => b.length - a.length)[0] || "";
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

    // Images are read before noise removal: og:image lives in <head>, and some sites put
    // the lead photo in a <figure> inside <header>.
    const imageCandidates = [
      $("meta[property='og:image']").attr("content"),
      $("meta[property='og:image:secure_url']").attr("content"),
      $("meta[name='twitter:image']").attr("content"),
      $("link[rel='image_src']").attr("href"),
      ...$("article img, main img, [itemprop='articleBody'] img, .article__body img, figure img")
        .map((_, img) => {
          const node = $(img);
          return (
            node.attr("src") ||
            node.attr("data-src") ||
            node.attr("data-original") ||
            node.attr("srcset")?.split(",").pop()?.trim().split(" ")[0]
          );
        })
        .get(),
    ]
      .map((candidate) => normalizeImageUrl(candidate || undefined, url))
      .filter((value): value is string => Boolean(value));

    const imageUrls = Array.from(new Set(imageCandidates))
      .sort((a, b) => scoreImage(b) - scoreImage(a))
      .slice(0, 6);

    // 1) Structured data, if the site publishes it.
    let content = extractJsonLdBody($);

    if (content.length < 400) {
      $(NOISE_SELECTORS).remove();

      // 2) Score the known body containers and keep the best result. Scoring beats
      //    first-match because pages often nest `article` inside `main` inside `.content`,
      //    and the widest container drags in sidebars.
      for (const selector of BODY_CONTAINERS) {
        const nodes = $(selector);
        if (nodes.length === 0) continue;

        nodes.each((_, element) => {
          const extracted = extractProse($, $(element) as cheerio.Cheerio<never>);
          if (extracted.length > content.length) content = extracted;
        });

        if (content.length > 1200) break;
      }

      // 3) Last resort: the whole body.
      if (content.length < 200) {
        const fallback = extractProse($, $("body") as cheerio.Cheerio<never>);
        if (fallback.length > content.length) content = fallback;
      }
    }

    return {
      content: content || null,
      imageUrl: pickBestImage(imageUrls) || null,
      imageUrls,
    };
  } catch (error) {
    logger.warn("Could not scrape the article body", {
      url,
      message: error instanceof Error ? error.message : String(error),
    });
    return { content: null, imageUrl: null, imageUrls: [] };
  }
}
