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

  const paragraphs = localized.content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">{localized.title}</h1>
      <div className="rounded-2xl border border-border/40 bg-card p-6 md:p-8 space-y-5">
        {paragraphs.map((paragraph, idx) => (
          <p key={idx} className="leading-8 text-base text-foreground/90 whitespace-pre-wrap text-justify">
            {paragraph}
          </p>
        ))}
      </div>
    </main>
  );
}
