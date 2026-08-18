import type { Metadata } from "next";

/**
 * Per-route metadata for the public pages.
 *
 * These pages are client components — they read language, articles and media from the
 * global context — and a client component cannot export `metadata`. Every one of them
 * therefore inherited only the root layout's defaults: the same title, the same
 * description and a canonical URL pointing at `/`. For a news site that is a real cost:
 * search results showed one entry for the whole domain, and social shares of `/news` or
 * `/events` rendered the site-wide card.
 *
 * The fix is a thin server wrapper per route that owns the metadata and renders the
 * client component underneath.
 *
 * Language: the site switches language in the browser, so there is one set of tags per
 * route rather than one per language. Real per-language metadata needs language-prefixed
 * routes (`/en/news`), which is tracked separately in `docs/05` §3.
 */
export function buildPageMetadata(input: {
  title: string;
  description: string;
  /** Route path, e.g. `/news`. Used for the canonical URL and Open Graph `url`. */
  path: string;
}): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.path,
      type: "website",
      siteName: "Media Uwed",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
  };
}
