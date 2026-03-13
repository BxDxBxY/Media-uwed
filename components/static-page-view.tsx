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
    const cleaned = raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/on\w+\s*=\s*"[^"]*"/gi, "");

    if (!/<(p|h2|h3|ul|ol|blockquote|div|section|article|br)\b/i.test(cleaned)) {
      return cleaned
        .split(/\n{2,}/)
        .map((part) => `<p>${part.replace(/\n/g, "<br />")}</p>`)
        .join("");
    }

    return cleaned;
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
      <h1 className="text-4xl md:text-5xl font-serif font-bold mb-8 leading-tight">{localized.title}</h1>
      <div
        className="rounded-2xl border border-border/40 bg-card p-6 md:p-9 text-base text-foreground/90 [&_p]:mb-4 [&_p]:leading-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_li]:mb-2 [&_strong]:font-semibold [&_mark]:bg-yellow-300/50 [&_a]:text-primary [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </main>
  );
}
