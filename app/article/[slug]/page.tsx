import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { polishText } from "@/lib/text-clean";
import { getPublicSiteUrl } from "@/lib/site-url";
import type { Article } from "@/lib/context";
import ArticleView from "./article-view";

// Published articles change rarely; revalidate so the HTML stays cacheable but fresh.
export const revalidate = 300;

const ARTICLE_SELECT = {
  id: true,
  title: true,
  titleRu: true,
  titleUz: true,
  summary: true,
  summaryRu: true,
  summaryUz: true,
  content: true,
  contentRu: true,
  contentUz: true,
  image: true,
  imageCaption: true,
  imageCaptionRu: true,
  imageCaptionUz: true,
  date: true,
  slug: true,
  author: true,
  createdAt: true,
  updatedAt: true,
  categories: { select: { id: true, name: true } },
} as const;

async function getArticle(slug: string) {
  return prisma.article.findUnique({
    where: { slug },
    select: ARTICLE_SELECT,
  });
}

/** Plain-text excerpt for meta descriptions. */
function toDescription(value: string, limit = 160) {
  const text = polishText(String(value || ""))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return { title: "Article not found", robots: { index: false, follow: false } };
  }

  const siteUrl = getPublicSiteUrl();
  const canonical = `${siteUrl}/article/${article.slug}`;
  const title = polishText(article.title);
  const description = toDescription(article.summary || article.content);
  const publishedTime = article.createdAt?.toISOString();

  return {
    title,
    description,
    alternates: {
      canonical,
      // The UI switches language client-side on one URL, so every locale shares it.
      languages: { en: canonical, ru: canonical, uz: canonical },
    },
    authors: article.author ? [{ name: article.author }] : undefined,
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      siteName: "University Media Portal",
      publishedTime,
      modifiedTime: article.updatedAt?.toISOString(),
      images: article.image ? [{ url: article.image, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: article.image ? [article.image] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await getArticle(slug);

  if (!record) notFound();

  const siteUrl = getPublicSiteUrl();

  // Shape it exactly like the client context's Article so the view component and the
  // rest of the app stay interchangeable.
  const article: Article = {
    id: record.id,
    title: record.title,
    titleRu: record.titleRu,
    titleUz: record.titleUz,
    summary: record.summary,
    summaryRu: record.summaryRu,
    summaryUz: record.summaryUz,
    content: record.content,
    contentRu: record.contentRu,
    contentUz: record.contentUz,
    image: record.image,
    imageCaption: record.imageCaption,
    imageCaptionRu: record.imageCaptionRu,
    imageCaptionUz: record.imageCaptionUz,
    category: record.categories[0]?.name || "News",
    categories: record.categories,
    date: record.date,
    slug: record.slug,
    author: record.author,
    createdAt: record.createdAt?.toISOString(),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: polishText(record.title).slice(0, 110),
    description: toDescription(record.summary || record.content, 300),
    image: record.image ? [record.image] : undefined,
    datePublished: record.createdAt?.toISOString(),
    dateModified: record.updatedAt?.toISOString(),
    author: record.author ? [{ "@type": "Person", name: record.author }] : undefined,
    publisher: {
      "@type": "Organization",
      name: "University Media Portal",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/article/${record.slug}`,
    },
    articleSection: record.categories[0]?.name,
    inLanguage: "en",
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data for search engines; content comes from our own database.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleView article={article} />
    </>
  );
}
