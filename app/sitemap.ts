import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getPublicSiteUrl } from "@/lib/site-url";

/**
 * Generated per request rather than at build time.
 *
 * Two reasons. A sitemap baked at build time is stale the moment an article is published,
 * which on a news site is continuously. And prerendering it made the **entire deployment**
 * depend on the build container reaching the database — an unreachable `DATABASE_URL`
 * failed the build at `Export encountered an error on /sitemap.xml`, taking the whole site
 * down with it rather than degrading one route.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getPublicSiteUrl();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/news`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${siteUrl}/events`, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/media`, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.4 },
  ];

  // A database problem must not produce a 500 for crawlers: an incomplete sitemap listing
  // the static pages is far better than none at all.
  const articles = await prisma.article
    .findMany({
      select: { slug: true, updatedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    })
    .catch((error: unknown) => {
      logger.error("Sitemap could not list articles; serving the static pages only", {
        message: error instanceof Error ? error.message : String(error),
      });
      return [] as Array<{ slug: string; updatedAt: Date | null; createdAt: Date }>;
    });

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/article/${article.slug}`,
    lastModified: article.updatedAt || article.createdAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticPages, ...articlePages];
}
