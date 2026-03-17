import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/news`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${siteUrl}/events`, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/media`, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const articles = await prisma.article.findMany({
    select: { slug: true, updatedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/article/${article.slug}`,
    lastModified: article.updatedAt || article.createdAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticPages, ...articlePages];
}
