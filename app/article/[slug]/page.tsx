"use client";

import { useGlobalContext } from "@/lib/context";
import { useParams, useRouter } from "next/navigation";
import { Clock, Share2, ArrowLeft, Bookmark, MessageSquare, Loader2, Globe } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function ArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { articles, isLoading, language, recordArticleView } = useGlobalContext();
  const router = useRouter();

  const article = articles.find((a) => a.slug === slug);

  useEffect(() => {
    if (article?.id && recordArticleView) {
      recordArticleView(article.id);
    }
  }, [article?.id, recordArticleView]);

  if (isLoading) {
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

  const title = getLocalized("title");
  const summary = getLocalized("summary");
  const content = getLocalized("content");
  const imageCaption = getLocalized("imageCaption");

  const relatedArticles = articles.filter(a => a.category === article.category && a.id !== article.id).slice(0, 3);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  return (
    <article className="min-h-screen pb-20">
      {/* Article Hero */}
      <header className="container mx-auto px-4 pt-8 md:pt-12 mb-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/news" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-8 group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to News
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <span className="bg-primary/10 text-primary text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest">
              {article.category}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1">
              <Clock className="h-3 w-3" /> {article.date} {article.createdAt && `• ${new Date(article.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
            {title}
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground font-serif italic leading-relaxed mb-8">
            {summary}
          </p>

          <div className="flex items-center justify-between py-6 border-y border-border/40 mb-12">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-primary">
                {article.author.charAt(0)}
              </div>
              <div>
                <span className="block text-sm font-bold">{article.author}</span>
                <span className="block text-xs text-muted-foreground">Campus Correspondent</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-muted transition-colors" title="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-muted transition-colors" title="Save">
                <Bookmark className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <figure className="max-w-6xl mx-auto mb-12">
          <div className="aspect-[21/9] rounded-3xl overflow-hidden border border-border/40 shadow-xl">
            <img src={article.image} alt={title} className="w-full h-full object-cover" />
          </div>
          {imageCaption && (
            <figcaption className="mt-4 text-center text-sm text-muted-foreground font-serif italic">
              {imageCaption}
            </figcaption>
          )}
        </figure>
      </header>

      {/* Article Content */}
      <div className="container mx-auto px-4 mb-20">
        <div className="max-w-3xl mx-auto">
          <div className="prose prose-slate lg:prose-xl dark:prose-invert max-w-none">
            {content.split('\n').map((para: string, i: number) => (
              <p key={i} className="mb-6 leading-relaxed text-lg text-foreground/80">
                {para}
              </p>
            ))}
          </div>

          {/* Categories */}
          {(article as any).categories && (article as any).categories.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase py-1">Filed under:</span>
              {(article as any).categories.map((cat: any) => (
                <span key={cat.id} className="text-xs font-bold px-3 py-1 bg-muted rounded-full">
                  #{cat.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-16 pt-16 border-t border-border/40 flex flex-wrap gap-4">
            <button className="flex items-center gap-2 px-6 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-bold">
              <MessageSquare className="h-4 w-4" /> Discussion (0)
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-bold text-muted-foreground uppercase">Rate this story:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} className="text-muted-foreground hover:text-primary transition-colors">★</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="bg-muted/30 py-20 border-y border-border/40">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-serif font-bold mb-10">More news</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {relatedArticles.map((rel) => (
                  <Link key={rel.id} href={`/article/${rel.slug}`} className="group">
                    <div className="aspect-[16/10] overflow-hidden rounded-2xl mb-4 border border-border/40 shadow-sm">
                      <img src={rel.image} alt={rel.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
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
