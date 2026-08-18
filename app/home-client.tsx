"use client";

import { useGlobalContext, type Article } from "@/lib/context";
import { Play, TrendingUp, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getMediaPreviewUrl, hasMediaCategory } from "@/lib/media-utils";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

function getArticleCategories(article: Article): string[] {
  const relationNames = (article.categories || []).map((c) => c.name).filter(Boolean);
  const single = article.category ? [article.category] : [];
  return [...new Set([...relationNames, ...single])];
}

function getPrimaryCategory(article: Article): string {
  return getArticleCategories(article)[0] || "News";
}

function byCategory(articles: Article[], category: string) {
  const key = category.toLowerCase();
  return articles.filter((a) => getArticleCategories(a).some((c) => c.toLowerCase() === key));
}

function localizedText(article: Article, language: "en" | "ru" | "uz", field: "title" | "summary") {
  if (language === "ru") {
    const val = field === "title" ? article.titleRu : article.summaryRu;
    if (val) return val;
  }
  if (language === "uz") {
    const val = field === "title" ? article.titleUz : article.summaryUz;
    if (val) return val;
  }
  return field === "title" ? article.title : article.summary;
}

const HOME_HIDDEN_MEDIA_CATEGORIES = ["hero-side", "hero-banner"];

function uniqueById<T extends { id: string }>(arr: T[]) {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function getTopCategoryNames(articles: Article[], limit: number) {
  const map = new Map<string, number>();
  for (const article of articles) {
    for (const cat of getArticleCategories(article)) {
      map.set(cat, (map.get(cat) || 0) + 1);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

export default function Home() {
  const { articles, isLoading, media, language, addSubscriber } = useGlobalContext();
  const [newsletterMessage, setNewsletterMessage] = useState<"" | "thanks" | "animating">("");
  const [newsletterDismissed, setNewsletterDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("newsletter-hidden") === "1" || localStorage.getItem("newsletter-signed") === "1";
  });

  const [categoryArticles, setCategoryArticles] = useState<Record<string, Article[]>>({});
  const [homeCategorySets, setHomeCategorySets] = useState<{ structured: string[]; columns: string[] }>({
    structured: ["World", "University", "Analysis"],
    columns: ["University", "World", "Economy", "Sports"],
  });

  const sourceArticles = articles;

  const featuredArticle = sourceArticles[0];
  const trendingNews = sourceArticles.slice(4, 14);
  const breakingItems = sourceArticles.slice(0, 6);
  const breakingCharacters = breakingItems.reduce((sum, item) => sum + localizedText(item, language, "title").length, 0);
  const tickerDuration = Math.min(42, Math.max(24, Math.round(breakingCharacters * 0.36)));

  const structuredCategoryKeys = homeCategorySets.structured;

  const categoryPools = structuredCategoryKeys.map((key, index) => ({
    key,
    title: key,
    source: categoryArticles[key] || byCategory(sourceArticles, key),
    reverse: index % 2 === 1,
  }));

  const used = new Set<string>();
  const structuredBlocks = categoryPools
    .map((pool) => {
      const picked: Article[] = [];
      for (const item of pool.source) {
        if (used.has(item.id)) continue;
        used.add(item.id);
        picked.push(item);
        if (picked.length === 5) break;
      }
      return { key: pool.key, title: pool.title, items: picked, reverse: pool.reverse };
    })
    .filter((block) => block.items.length > 0);

  const columnCategoryKeys = homeCategorySets.columns;

  const columnPools = columnCategoryKeys.map((key) => ({ key, title: key, source: categoryArticles[key] || byCategory(sourceArticles, key) }));
  const columnUsed = new Set<string>(Array.from(used));
  const columnSections = columnPools
    .map((pool) => {
      const items: Article[] = [];
      for (const item of pool.source) {
        if (columnUsed.has(item.id)) continue;
        columnUsed.add(item.id);
        items.push(item);
        if (items.length === 5) break;
      }
      return { key: pool.key, title: pool.title, items };
    })
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    let isCancelled = false;

    const fetchHomeCategoryFeeds = async () => {
      try {
        const categoriesRes = await fetch("/api/frontend/categories");
        const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { categories: [] };
        const available = (categoriesData?.categories || []).map((c: { name: string }) => c.name).filter(Boolean);

        const preferredStructured = ["World", "University", "Analysis"];
        const preferredColumns = ["University", "World", "Economy", "Sports"];
        const ranked = [...new Set([...getTopCategoryNames(sourceArticles, 8), ...available])];

        const structured = uniqueById(preferredStructured.map((key) => ({ id: key, key })).concat(ranked.map((key) => ({ id: key, key })))).map((x) => x.key).slice(0, 3);
        const columns = uniqueById(preferredColumns.map((key) => ({ id: key, key })).concat(ranked.map((key) => ({ id: key, key })))).map((x) => x.key).slice(0, 4);

        const toFetch = [...new Set([...structured, ...columns])];
        const responses = await Promise.all(
          toFetch.map(async (category) => {
            const res = await fetch(`/api/frontend/articles?page=1&limit=10&category=${encodeURIComponent(category)}`);
            const data = res.ok ? await res.json() : { articles: [] };
            return [category, (data?.articles || []) as Article[]] as const;
          }),
        );

        if (!isCancelled) {
          setHomeCategorySets({ structured, columns });
          setCategoryArticles(Object.fromEntries(responses));
        }
      } catch {
        // keep context fallback
      }
    };

    fetchHomeCategoryFeeds();
    return () => {
      isCancelled = true;
    };
  }, [sourceArticles]);

  const homeVisibleMedia = useMemo(
    () => uniqueById(media.filter((m) => !HOME_HIDDEN_MEDIA_CATEGORIES.some((cat) => hasMediaCategory(m.category, cat)))),
    [media],
  );

  const featuredImages = homeVisibleMedia.filter((item) => item.type === "image").slice(0, 4);
  const featuredImageIds = new Set(featuredImages.map((item) => item.id));

  const latestVideos = homeVisibleMedia
    .filter((item) => item.type === "video" && !featuredImageIds.has(item.id))
    .slice(0, 3);

  const heroBackground = media.find((item) => hasMediaCategory(item.category, "hero-banner")) || null;
  const heroSide = media.find((item) => hasMediaCategory(item.category, "hero-side")) || null;
  const heroText = media.find((item) => hasMediaCategory(item.category, "hero-text")) || null;

  const t = {
    breaking: language === "ru" ? "Срочно" : language === "uz" ? "Shoshilinch" : "Breaking",
    trending: language === "ru" ? "В тренде" : language === "uz" ? "Trend" : "Trending",
    viewAll: language === "ru" ? "Смотреть все" : language === "uz" ? "Barchasi" : "View all",
    joinNews: language === "ru" ? "Подпишитесь на рассылку" : language === "uz" ? "Newsletterga qo'shiling" : "Join our Newsletter",
    joinDesc:
      language === "ru"
        ? "Еженедельный дайджест университетских новостей, исследований и кампуса."
        : language === "uz"
          ? "Universitet yangiliklari, tadqiqotlar va kampus hayoti bo'yicha haftalik dayjest."
          : "Weekly digest of university news, research, and campus stories.",
    email: language === "ru" ? "Ваш email" : language === "uz" ? "Email manzilingiz" : "Your email address",
    subscribe: language === "ru" ? "Подписаться" : language === "uz" ? "Obuna bo'lish" : "Subscribe",
    mediaHighlights: language === "ru" ? "Мультимедиа" : language === "uz" ? "Media lavhalar" : "Multimedia Highlights",
    mediaDesc: language === "ru" ? "Жизнь университета в кадре." : language === "uz" ? "Universitet hayoti kadrda." : "University life in motion and pictures.",
    latestVideos: language === "ru" ? "Последние видео" : language === "uz" ? "So'nggi videolar" : "Latest Videos",
    insideUniversity: language === "ru" ? "Изнутри университета" : language === "uz" ? "Universitet ichidan" : "Inside University",
    openGallery: language === "ru" ? "Открыть галерею" : language === "uz" ? "Galereyani ochish" : "Open the gallery",
    by: language === "ru" ? "Автор" : language === "uz" ? "Muallif" : "By",
    video: language === "ru" ? "Видео" : language === "uz" ? "Video" : "Video",
  };

  const localizedMediaTitle = (item: { title: string; titleRu?: string | null; titleUz?: string | null }) => {
    if (language === "ru" && item.titleRu) return item.titleRu;
    if (language === "uz" && item.titleUz) return item.titleUz;
    return item.title;
  };

  /** Locale-aware date, falling back to the stored string when it is not parseable. */
  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const locale = language === "ru" ? "ru-RU" : language === "uz" ? "uz-UZ" : "en-GB";
    return parsed.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  };

  if (isLoading && sourceArticles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-muted-foreground font-serif italic">Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="bg-muted/60 text-foreground py-2 overflow-hidden border-y border-border/50">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <span className="bg-primary/15 text-primary text-[10px] font-black uppercase px-2 py-0.5 rounded whitespace-nowrap">{t.breaking}</span>
          <div className="flex-1 overflow-hidden">
            <div className="ticker-track text-sm font-medium whitespace-nowrap inline-flex gap-10" style={{ "--ticker-duration": `${tickerDuration}s` } as CSSProperties}>
              {[...breakingItems, ...breakingItems].map((item, index) => (
                <Link key={`${item.id}-${index}`} href={`/article/${item.slug}`} className="hover:text-primary transition-colors">
                  {localizedText(item, language, "title")}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            {featuredArticle ? (
              <Link href={`/article/${featuredArticle.slug}`} className="group block relative overflow-hidden rounded-3xl border border-border/40 bg-card shadow-sm hover:shadow-xl transition-all duration-500">
                <div className="aspect-[16/9] overflow-hidden relative">
                  <Image src={featuredArticle.image} alt={localizedText(featuredArticle, language, "title")} fill unoptimized sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="p-6 md:p-10">
                  <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">{getPrimaryCategory(featuredArticle)}</span>
                  <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4 leading-tight group-hover:text-primary transition-colors">{localizedText(featuredArticle, language, "title")}</h1>
                  <p className="text-muted-foreground text-lg mb-6 line-clamp-2 max-w-2xl">{localizedText(featuredArticle, language, "summary")}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border/40">
                    <span className="font-bold text-foreground">{t.by} {featuredArticle.author}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatDate(featuredArticle.date)}</span>
                  </div>
                </div>
              </Link>
            ) : null}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h3 className="font-serif text-xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> {t.trending}</h3>
              <Link href="/news" className="text-xs font-semibold text-primary hover:underline">{t.viewAll}</Link>
            </div>
            <div className="space-y-4">
              {trendingNews.map((article, i) => (
                <Link key={article.id} href={`/article/${article.slug}`} className="flex gap-4 group">
                  <span className="text-4xl font-serif font-black text-muted/30 group-hover:text-primary/20 transition-colors">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 block">{getPrimaryCategory(article)}</span>
                    <h4 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">{localizedText(article, language, "title")}</h4>
                  </div>
                </Link>
              ))}
            </div>

            {!newsletterDismissed ? <form
              onSubmit={(e) => {
                e.preventDefault();
                const emailInput = e.currentTarget.querySelector('input[name="email"]') as HTMLInputElement | null;
                const email = emailInput?.value || "";
                if (email) {
                  addSubscriber(email);
                  localStorage.setItem("newsletter-signed", "1");
                  setNewsletterMessage("animating");
                  (e.target as HTMLFormElement).reset();
                  window.setTimeout(() => {
                    setNewsletterMessage("thanks");
                  }, 180);
                  window.setTimeout(() => {
                    setNewsletterDismissed(true);
                    setNewsletterMessage("");
                  }, 2200);
                }
              }}
              className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 space-y-4"
            >
              <div className="flex justify-end">
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { localStorage.setItem("newsletter-hidden", "1"); setNewsletterDismissed(true); }}>✕</button>
              </div>
              <h4 className="font-serif text-3xl font-bold">{t.joinNews}</h4>
              <p className="text-muted-foreground">{t.joinDesc}</p>
              <input name="email" type="email" required placeholder={t.email} className="w-full rounded-lg border border-input bg-background px-3 py-2" />
              <button type="submit" className="w-full rounded-lg bg-primary text-primary-foreground py-2 font-bold">{t.subscribe}</button>

              {(newsletterMessage === "animating" || newsletterMessage === "thanks") && (
                <div className="absolute inset-0 bg-background/95 dark:bg-card/95 backdrop-blur-sm flex items-center justify-center transition-all duration-500 animate-in fade-in zoom-in-95">
                  <div className="text-center">
                    <p className="text-base md:text-lg font-semibold text-foreground animate-pulse">Submitted. Thank you!</p>
                    <p className="text-xs text-muted-foreground mt-1">You’re on the list ✨</p>
                  </div>
                </div>
              )}
            </form> : null}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 space-y-14">
        {structuredBlocks.map((block) => {
          const lead = block.items[0];
          const side = block.items.slice(1, 5);
          if (!lead) return null;

          return (
            <div key={block.title}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-2xl font-serif font-bold flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />{block.title}</h3>
                <Link href={`/news?category=${encodeURIComponent(block.key)}`} className="text-sm font-semibold text-primary hover:underline">{t.viewAll}</Link>
              </div>

              <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${block.reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <Link href={`/article/${lead.slug}`} className="lg:col-span-6 group rounded-2xl border border-border/40 overflow-hidden bg-card">
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <Image src={lead.image} alt={localizedText(lead, language, "title")} fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <h4 className="text-2xl font-bold leading-tight mb-3 group-hover:text-primary transition-colors">{localizedText(lead, language, "title")}</h4>
                    <p className="text-muted-foreground line-clamp-2">{localizedText(lead, language, "summary")}</p>
                  </div>
                </Link>

                <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {side.map((item) => (
                    <Link key={item.id} href={`/article/${item.slug}`} className="group rounded-xl border border-border/40 overflow-hidden bg-card/50">
                      <div className="aspect-[16/10] overflow-hidden relative">
                        <Image src={item.image} alt={localizedText(item, language, "title")} fill unoptimized sizes="(max-width: 768px) 100vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-3">
                        <span className="text-[10px] font-bold text-primary uppercase">{getPrimaryCategory(item)}</span>
                        <h5 className="font-bold mt-1 leading-tight line-clamp-2 group-hover:text-primary transition-colors">{localizedText(item, language, "title")}</h5>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-7">
          {columnSections.map((column) => {
            const lead = column.items[0];
            const rest = column.items.slice(1);
            return (
              <div key={column.title} className="space-y-4">
                <Link href={`/news?category=${encodeURIComponent(column.key)}`} className="border-t-2 border-border/80 pt-3 flex items-center justify-between group">
                  <h3 className="font-bold uppercase tracking-wide text-lg group-hover:text-primary transition-colors">{column.title}</h3>
                  <ChevronRight className="h-5 w-5 group-hover:text-primary transition-colors" />
                </Link>

                {lead && (
                  <Link href={`/article/${lead.slug}`} className="block group">
                    <div className="aspect-[16/10] overflow-hidden bg-muted relative">
                      <Image src={lead.image} alt={localizedText(lead, language, "title")} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <h4 className="text-2xl font-serif font-bold mt-3 leading-tight group-hover:text-primary transition-colors">{localizedText(lead, language, "title")}</h4>
                    <p className="text-base text-muted-foreground mt-2 line-clamp-3">{localizedText(lead, language, "summary")}</p>
                  </Link>
                )}

                <div className="space-y-0">
                  {rest.map((item) => (
                    <Link key={item.id} href={`/article/${item.slug}`} className="block py-4 border-t border-border/40 group">
                      <h5 className="text-2xl leading-tight font-serif font-semibold group-hover:text-primary transition-colors line-clamp-2">{localizedText(item, language, "title")}</h5>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sections with nothing in them are not rendered at all: a heading above an empty
          grid reads as a broken page, which is exactly how the homepage looked while the
          media library was empty. */}
      {featuredImages.length > 0 && (
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif font-bold">{t.mediaHighlights}</h2>
            <p className="text-muted-foreground">{t.mediaDesc}</p>
          </div>
          <Link href="/media" className="bg-primary/10 text-primary px-5 py-2 rounded-full font-bold text-sm hover:bg-primary/20 transition-colors">{t.viewAll}</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredImages.map((item) => (
            <Link key={item.id} href="/media" className="group relative aspect-[4/3] rounded-3xl overflow-hidden border border-border/40 bg-muted">
              <Image src={getMediaPreviewUrl(item)} alt={localizedMediaTitle(item)} fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-0 left-0 p-6"><h4 className="text-white font-bold text-sm line-clamp-2">{localizedMediaTitle(item)}</h4></div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {latestVideos.length > 0 && (
      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-[2rem] bg-card border border-border p-8 md:p-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-foreground text-3xl font-serif font-bold">{t.latestVideos}</h2>
            <Link href="/media" className="text-muted-foreground hover:text-foreground text-sm">{t.viewAll}</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {latestVideos.map((item) => (
              <Link key={item.id} href="/media" className="group rounded-xl overflow-hidden border border-border bg-muted/30">
                <div className="aspect-video relative overflow-hidden">
                  <Image src={getMediaPreviewUrl(item)} alt={localizedMediaTitle(item)} fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded uppercase font-bold"><Play className="h-3 w-3 fill-current" /> {t.video}</span>
                </div>
                <div className="p-4"><h4 className="text-foreground font-bold leading-tight line-clamp-2">{localizedMediaTitle(item)}</h4></div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* The whole banner depends on a curated media item. Without one it used to render a
          stock photo and, in the side slot, the instruction "Set media category to
          hero-side from Admin Media" — addressed to an administrator, shown to readers. */}
      {heroBackground && (
      <section className="container mx-auto px-4 py-16">
        <div className="bg-card rounded-[2.5rem] overflow-hidden relative min-h-[500px] grid lg:grid-cols-12 border border-border">
          <Image src={getMediaPreviewUrl(heroBackground)} alt={heroBackground.title} fill unoptimized sizes="100vw" className="absolute inset-0 object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="relative z-10 p-8 md:p-16 max-w-2xl lg:col-span-8">
            <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[10px] font-black uppercase px-2 py-1 rounded mb-6"><Play className="h-3 w-3 fill-current" /> {t.insideUniversity}</span>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">{localizedMediaTitle(heroBackground)}</h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">{heroText ? localizedMediaTitle(heroText) : t.mediaDesc}</p>
            <Link href="/media" className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold hover:bg-primary/90 transition-colors inline-flex items-center gap-2">{t.openGallery} <ChevronRight className="h-5 w-5" /></Link>
          </div>
          {heroSide && (
            <div className="relative z-10 lg:col-span-4 p-6 md:p-10 flex items-end">
              <Link href="/media" className="w-full rounded-2xl border border-border/70 bg-background/70 overflow-hidden hover:bg-background/80 transition-colors">
                <div className="aspect-video overflow-hidden relative"><Image src={getMediaPreviewUrl(heroSide)} alt={heroSide.title} fill unoptimized sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" /></div>
                <div className="p-4"><h4 className="text-foreground font-bold line-clamp-2">{localizedMediaTitle(heroSide)}</h4></div>
              </Link>
            </div>
          )}
        </div>
      </section>
      )}
    </main>
  );
}
