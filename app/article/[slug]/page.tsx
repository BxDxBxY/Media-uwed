"use client";

import { useGlobalContext, type Article } from "@/lib/context";
import { polishText } from "@/lib/text-clean";
import { useParams, useRouter } from "next/navigation";
import { Clock, Share2, ArrowLeft, Bookmark, MessageSquare, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractInlineImageUrls, splitReadableParagraphs } from "@/lib/article-format";

function stripInlineImageUrls(content: string): string {
  return String(content || "")
    .replace(/https?:\/\/[^\s)"']+\.(?:jpg|jpeg|png|webp|gif)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function renderInlineMarkdownLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^\)]+\))/g);

  return parts.map((part, idx) => {
    const match = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
    if (!match) return <span key={idx}>{part}</span>;

    return (
      <a
        key={idx}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-primary/60 underline-offset-2 hover:text-primary"
      >
        {match[1]}
      </a>
    );
  });
}

export default function ArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { articles, isLoading, language, recordArticleView } = useGlobalContext();
  const router = useRouter();
  const [fontScale, setFontScale] = useState<"md" | "lg">("lg");
  const [fullArticle, setFullArticle] = useState<Article | null>(null);
  const [isArticleLoading, setIsArticleLoading] = useState(false);

  const article = fullArticle || articles.find((a) => a.slug === slug);

  useEffect(() => {
    let isCancelled = false;
    setFullArticle(null);

    const fetchArticleBySlug = async () => {
      if (!slug) return;

      const baseArticle = articles.find((a) => a.slug === slug);
      if (baseArticle && (baseArticle as any).content) {
        setFullArticle(baseArticle);
        return;
      }

      setIsArticleLoading(true);
      try {
        const res = await fetch(`/api/frontend/articles?slug=${encodeURIComponent(slug)}&full=1`);
        const data = await res.json();

        if (!isCancelled && res.ok && data?.article) {
          setFullArticle(data.article);
        }
      } catch (error) {
        console.error("Failed to load full article", error);
      } finally {
        if (!isCancelled) setIsArticleLoading(false);
      }
    };

    fetchArticleBySlug();

    return () => {
      isCancelled = true;
    };
  }, [slug, articles]);

  useEffect(() => {
    if (article?.id && recordArticleView) {
      recordArticleView(article.id);
    }
  }, [article?.id, recordArticleView]);

  if (isLoading || isArticleLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground font-serif italic">Opening story...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-serif font-bold mb-4">Article Not Found</h2>
        <p className="text-muted-foreground mb-8">The story you are looking for does not exist or has been moved.</p>
        <Link href="/news" className="text-primary font-bold hover:underline">Return to News Archive</Link>
      </div>
    );
  }

  const getLocalized = (key: string) => {
    if (language === "ru") {
      const ruVal = (article as any)[key + "Ru"];
      if (ruVal) return ruVal;
    }
    if (language === "uz") {
      const uzVal = (article as any)[key + "Uz"];
      if (uzVal) return uzVal;
    }
    return (article as any)[key];
  };

  const title = polishText(getLocalized("title") || "");
  const summary = polishText(getLocalized("summary") || "");
  const content = polishText(getLocalized("content") || "");
  const imageCaption = polishText(getLocalized("imageCaption") || "");

  const extracted = extractInlineImageUrls(content);
  const cleanDisplayContent = stripInlineImageUrls(content);
  const contentBlocks = splitReadableParagraphs(cleanDisplayContent).map((line) => polishText(line)).filter(Boolean);
  const inlineImages = Array.from(new Set([article.image, ...extracted].filter(Boolean) as string[])).slice(0, 3);

  const relatedArticles = articles
    .filter((a) => a.id !== article.id)
    .filter((a) => a.category === article.category || (a.categories || []).some((c) => article.categories?.some((ac) => ac.id === c.id)))
    .slice(0, 4);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  return (
    <article className="min-h-screen pb-20">
      <header className="container mx-auto px-4 pt-8 md:pt-12 mb-12">
        <div className="max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => router.push("/news")}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to News
          </button>

          <div className="flex items-center gap-3 mb-6">
            <span className="bg-primary/10 text-primary text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest">
              {article.category}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1">
              <Clock className="h-3 w-3" /> {article.date} {article.createdAt && `• ${new Date(article.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">{title}</h1>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6 mb-8 shadow-sm">
            <p className="text-lg md:text-2xl text-foreground/90 font-serif italic leading-relaxed">{summary}</p>
          </div>

          <div className="flex items-center justify-between py-6 border-y border-border/40 mb-12">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-primary">{article.author.charAt(0)}</div>
              <div>
                <span className="block text-sm font-bold">{article.author}</span>
                <span className="block text-xs text-muted-foreground">Campus Correspondent</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleShare} className="p-2 rounded-full hover:bg-muted transition-colors" title="Share"><Share2 className="h-5 w-5" /></button>
              <button className="p-2 rounded-full hover:bg-muted transition-colors" title="Save"><Bookmark className="h-5 w-5" /></button>
            </div>
          </div>
        </div>

        <figure className="max-w-6xl mx-auto mb-12">
          <div className="aspect-[21/9] rounded-3xl overflow-hidden border border-border/40 shadow-xl relative">
            {article.image ? (
              <Image src={article.image} alt={title} fill unoptimized sizes="100vw" className="object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-muted to-muted/40" />
            )}
          </div>
          {imageCaption && <figcaption className="mt-4 text-center text-sm text-muted-foreground font-serif italic">{imageCaption}</figcaption>}
        </figure>
      </header>

      <div className="container mx-auto px-4 mb-20">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 flex items-center justify-end gap-2 text-xs">
            <span className="text-muted-foreground">Text size</span>
            <button type="button" onClick={() => setFontScale("md")} className={`px-2 py-1 rounded border ${fontScale === "md" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>A</button>
            <button type="button" onClick={() => setFontScale("lg")} className={`px-2 py-1 rounded border ${fontScale === "lg" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>A+</button>
          </div>

          <div className="space-y-6">
            {contentBlocks.map((block: string, i: number) => {
              if (block === "---") return <hr key={`sep-${i}`} className="my-8 border-border/50" />;

              const isLead = i === 0;
              const isSourceLine = /original source:/i.test(block);
              const injectImage = i > 0 && i % 2 === 0 && inlineImages[Math.floor(i / 2) - 1];

              return (
                <div key={`chunk-${i}`} className="space-y-5">
                  <p
                    className={[
                      fontScale === "lg" ? "text-[1.12rem]" : "text-base",
                      "leading-8 md:leading-9 text-foreground/90 whitespace-pre-line",
                      isLead ? "first-letter:text-4xl first-letter:font-serif first-letter:font-bold first-letter:mr-1" : "",
                      isSourceLine ? "mt-10 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm" : "",
                    ].join(" ")}
                  >
                    {renderInlineMarkdownLinks(block)}
                  </p>

                  {injectImage && (
                    <figure className="rounded-2xl overflow-hidden border border-border/40">
                      <Image src={injectImage} alt={`${title} visual ${i}`} width={1200} height={700} unoptimized className="w-full h-auto object-cover" />
                    </figure>
                  )}
                </div>
              );
            })}
          </div>

          {(article as any).categories && (article as any).categories.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase py-1">Filed under:</span>
              {(article as any).categories.map((cat: any) => (
                <span key={cat.id} className="text-xs font-bold px-3 py-1 bg-muted rounded-full">#{cat.name}</span>
              ))}
            </div>
          )}

          <div className="mt-16 pt-16 border-t border-border/40 flex flex-wrap gap-4">
            <button className="flex items-center gap-2 px-6 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-bold">
              <MessageSquare className="h-4 w-4" /> Discussion (0)
            </button>
          </div>
        </div>
      </div>

      {relatedArticles.length > 0 && (
        <section className="bg-muted/30 py-20 border-y border-border/40">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-serif font-bold mb-10">More news</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {relatedArticles.map((rel) => (
                  <Link key={rel.id} href={`/article/${rel.slug}`} className="group">
                    <div className="aspect-[16/10] overflow-hidden rounded-2xl mb-4 border border-border/40 shadow-sm relative">
                      <Image src={rel.image} alt={rel.title} fill unoptimized sizes="(max-width: 768px) 100vw, 25vw" className="object-cover transition-transform group-hover:scale-105" />
                    </div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">{rel.category}</span>
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {language === "ru" ? (rel.titleRu || rel.title) : language === "uz" ? (rel.titleUz || rel.title) : rel.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
