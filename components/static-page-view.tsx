"use client";

import { useEffect, useMemo, useState } from "react";
import { useGlobalContext } from "@/lib/context";
import { Loader2 } from "lucide-react";

type StaticPage = {
  slug: "privacy-policy" | "terms-of-use";
  title: string;
  titleRu?: string;
  titleUz?: string;
  content: string;
  contentRu?: string;
  contentUz?: string;
  updatedAt?: string;
};

export function StaticPageView({ slug }: { slug: StaticPage["slug"] }) {
  const { language } = useGlobalContext();
  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/frontend/static-pages?slug=${slug}`);
        const data = await res.json();
        if (res.ok) setPage(data.page);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const localized = useMemo(() => {
    if (!page) return null;
    if (language === "ru") {
      return {
        title: page.titleRu || page.title,
        content: page.contentRu || page.content,
      };
    }
    if (language === "uz") {
      return {
        title: page.titleUz || page.title,
        content: page.contentUz || page.content,
      };
    }
    return { title: page.title, content: page.content };
  }, [page, language]);

  const safeHtml = useMemo(() => {
    const raw = localized?.content || "";
    return raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/on\w+\s*=\s*"[^"]*"/gi, "");
  }, [localized?.content]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
        Loading…
      </div>
    );
  }

  if (!localized) {
    return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Unable to load this page.</div>;
  }

  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">{localized.title}</h1>
      <div
        className="rounded-2xl border border-border/40 bg-card p-6 md:p-8 leading-8 text-base text-foreground/90 whitespace-pre-wrap text-justify [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:my-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_strong]:font-semibold [&_mark]:bg-yellow-300/50"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </main>
  );
}
