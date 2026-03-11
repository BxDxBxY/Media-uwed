"use client";

import { useGlobalContext, type Article } from "@/lib/context";
import { ArrowRight, Play, TrendingUp, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getMediaPreviewUrl, hasMediaCategory } from "@/lib/media-utils";

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

function uniqueById<T extends { id: string }>(arr: T[]) {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function Home() {
  const { articles, isLoading, media, language, addSubscriber } = useGlobalContext();

  const featuredArticle = articles[0];
  const trendingNews = articles.slice(4, 14); // up to ten items
  const breakingItems = articles.slice(0, 6);

  const categoryPools = [
    { title: language === "ru" ? "Мир и политика" : language === "uz" ? "Jahon va siyosat" : "World & Policy", source: byCategory(articles, "World"), reverse: false },
    { title: language === "ru" ? "Университет и кампус" : language === "uz" ? "Universitet va kampus" : "University & Campus", source: byCategory(articles, "University"), reverse: true },
    { title: language === "ru" ? "Интервью и аналитика" : language === "uz" ? "Intervyu va tahlil" : "Interviews & Analysis", source: byCategory(articles, "Analysis"), reverse: false },
  ];

  const used = new Set<string>();
  const structuredBlocks = categoryPools.map((pool, idx) => {
    const candidates = pool.source.length > 0 ? pool.source : articles.slice(idx * 6, idx * 6 + 10);
    const picked: Article[] = [];

    for (const item of candidates) {
      if (used.has(item.id)) continue;
      used.add(item.id);
      picked.push(item);
      if (picked.length === 5) break;
    }

    if (picked.length < 5) {
      for (const fallback of articles) {
        if (used.has(fallback.id)) continue;
        used.add(fallback.id);
        picked.push(fallback);
        if (picked.length === 5) break;
      }
    }

    return { title: pool.title, items: picked, reverse: pool.reverse };
  });

  const hiddenHomeCategories = new Set(["hero-side", "hero-banner"]);
  const homeVisibleMedia = media.filter((m) => ![...hiddenHomeCategories].some((cat) => hasMediaCategory(m.category, cat)));

  const universityVideos = homeVisibleMedia
    .filter((item) => item.type === "video" && hasMediaCategory(item.category, "university"))
    .slice(0, 3);

  const universityVideoIds = new Set(universityVideos.map((item) => item.id));
  const cleanedFeaturedMedia = uniqueById(homeVisibleMedia.filter((item) => !universityVideoIds.has(item.id))).slice(0, 4);

  const heroBackground = media.find((item) => hasMediaCategory(item.category, "hero-banner")) || null;
  const heroSide = media.find((item) => hasMediaCategory(item.category, "hero-side")) || null;


  const columnSections = [
    {
      title: language === "ru" ? "Новости кампуса" : language === "uz" ? "Kampus yangiliklari" : "Campus News",
      items: (byCategory(articles, "University").length ? byCategory(articles, "University") : articles).slice(0, 5),
    },
    {
      title: language === "ru" ? "Мир" : language === "uz" ? "Jahon" : "World",
      items: (byCategory(articles, "World").length ? byCategory(articles, "World") : articles.slice(3)).slice(0, 5),
    },
    {
      title: language === "ru" ? "Бизнес" : language === "uz" ? "Biznes" : "Business",
      items: (byCategory(articles, "Economy").length ? byCategory(articles, "Economy") : articles.slice(6)).slice(0, 5),
    },
    {
      title: language === "ru" ? "Спорт" : language === "uz" ? "Sport" : "Sport",
      items: (byCategory(articles, "Sports").length ? byCategory(articles, "Sports") : articles.slice(9)).slice(0, 5),
    },
  ];

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
    latestVideos: language === "ru" ? "Последние университетские видео" : language === "uz" ? "So'nggi universitet videolari" : "Latest University Videos",
  };

  if (isLoading) {
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
      <div className="bg-muted/60 text-foreground py-2 overflow-hidden border-y border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <span className="bg-primary/15 text-primary text-[10px] font-black uppercase px-2 py-0.5 rounded whitespace-nowrap animate-pulse">{t.breaking}</span>
          <div className="flex-1 overflow-hidden">
            <div className="ticker-track text-sm font-medium whitespace-nowrap inline-flex gap-10">
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
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={featuredArticle.image} alt={localizedText(featuredArticle, language, "title")} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="p-6 md:p-10">
                  <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">{getPrimaryCategory(featuredArticle)}</span>
                  <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4 leading-tight group-hover:text-primary transition-colors">{localizedText(featuredArticle, language, "title")}</h1>
                  <p className="text-muted-foreground text-lg mb-6 line-clamp-2 max-w-2xl">{localizedText(featuredArticle, language, "summary")}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border/40">
                    <span className="font-bold text-foreground">By {featuredArticle.author}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {featuredArticle.date}</span>
                  </div>
                </div>
              </Link>
            ) : <div className="aspect-[16/9] bg-muted rounded-3xl animate-pulse flex items-center justify-center text-muted-foreground italic">No featured article found</div>}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h3 className="font-serif text-xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> {t.trending}</h3>
              <Link href="/news" className="text-xs font-semibold text-primary hover:underline">{t.viewAll}</Link>
            </div>
            <div className="space-y-4">
              {trendingNews.map((article, i) => (
                <Link key={article.id} href={`/article/${article.slug}`} className="flex gap-4 group">
                  <span className="text-4xl font-serif font-black text-muted/30 group-hover:text-primary/20 transition-colors">0{i + 1}</span>
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 block">{getPrimaryCategory(article)}</span>
                    <h4 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">{localizedText(article, language, "title")}</h4>
                  </div>
                </Link>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const email = (e.currentTarget.elements as any).email.value;
                if (email) {
                  addSubscriber(email);
                  (e.target as HTMLFormElement).reset();
                }
              }}
              className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
            >
              <h4 className="font-serif text-3xl font-bold">{t.joinNews}</h4>
              <p className="text-muted-foreground">{t.joinDesc}</p>
              <input name="email" type="email" required placeholder={t.email} className="w-full rounded-lg border border-input bg-background px-3 py-2" />
              <button type="submit" className="w-full rounded-lg bg-primary text-primary-foreground py-2 font-bold">{t.subscribe}</button>
            </form>
          </div>
        </div>
      </section>


      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-7">
          {columnSections.map((column) => {
            const lead = column.items[0];
            const rest = column.items.slice(1);
            return (
              <div key={column.title} className="space-y-4">
                <div className="border-t-2 border-border/80 pt-3 flex items-center justify-between">
                  <h3 className="font-bold uppercase tracking-wide text-lg">{column.title}</h3>
                  <ChevronRight className="h-5 w-5" />
                </div>

                {lead && (
                  <Link href={`/article/${lead.slug}`} className="block group">
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img src={lead.image} alt={localizedText(lead, language, "title")} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <h4 className="text-2xl font-serif font-bold mt-3 leading-tight group-hover:text-primary transition-colors">{localizedText(lead, language, "title")}</h4>
                    <p className="text-base text-muted-foreground mt-2 line-clamp-3">{localizedText(lead, language, "summary")}</p>
                  </Link>
                )}

                <div className="space-y-0">
                  {rest.map((item) => (
                    <Link key={item.id} href={`/article/${item.slug}`} className="block py-4 border-t border-border/40 group">
                      <h5 className="text-[1.9rem] leading-tight font-serif font-semibold group-hover:text-primary transition-colors line-clamp-2">{localizedText(item, language, "title")}</h5>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 space-y-14">
        {structuredBlocks.map((block) => {
          const lead = block.items[0];
          const side = block.items.slice(1, 5); // right side four
          if (!lead) return null;

          return (
            <div key={block.title}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-2xl font-serif font-bold flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />{block.title}</h3>
                <Link href="/news" className="text-sm font-semibold text-primary hover:underline">{t.viewAll}</Link>
              </div>

              <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${block.reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <Link href={`/article/${lead.slug}`} className="lg:col-span-6 group rounded-2xl border border-border/40 overflow-hidden bg-card">
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={lead.image} alt={localizedText(lead, language, "title")} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <h4 className="text-2xl font-bold leading-tight mb-3 group-hover:text-primary transition-colors">{localizedText(lead, language, "title")}</h4>
                    <p className="text-muted-foreground line-clamp-2">{localizedText(lead, language, "summary")}</p>
                  </div>
                </Link>

                <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {side.map((item) => (
                    <Link key={item.id} href={`/article/${item.slug}`} className="group rounded-xl border border-border/40 overflow-hidden bg-card/50">
                      <div className="aspect-[16/10] overflow-hidden">
                        <img src={item.image} alt={localizedText(item, language, "title")} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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

      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif font-bold">{t.mediaHighlights}</h2>
            <p className="text-muted-foreground">{t.mediaDesc}</p>
          </div>
          <Link href="/media" className="bg-primary/10 text-primary px-5 py-2 rounded-full font-bold text-sm hover:bg-primary/20 transition-colors">{t.viewAll}</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cleanedFeaturedMedia.map((item) => (
            <Link key={item.id} href="/media" className="group relative aspect-[4/3] rounded-3xl overflow-hidden border border-border/40 bg-muted">
              <img src={getMediaPreviewUrl(item)} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-0 left-0 p-6"><h4 className="text-white font-bold text-sm line-clamp-2">{item.title}</h4></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-[2rem] bg-slate-950 border border-slate-800 p-8 md:p-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-white text-3xl font-serif font-bold">{t.latestVideos}</h2>
            <Link href="/media" className="text-slate-300 hover:text-white text-sm">{t.viewAll}</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(universityVideos.length > 0 ? universityVideos : homeVisibleMedia.filter((m) => m.type === "video").slice(0, 3)).map((item) => (
              <Link key={item.id} href="/media" className="group rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60">
                <div className="aspect-video relative overflow-hidden">
                  <img src={getMediaPreviewUrl(item)} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded uppercase font-bold"><Play className="h-3 w-3 fill-current" /> University</span>
                </div>
                <div className="p-4"><h4 className="text-white font-bold leading-tight line-clamp-2">{item.title}</h4></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden relative min-h-[500px] grid lg:grid-cols-12">
          <img src={heroBackground ? getMediaPreviewUrl(heroBackground) : "https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&w=1350&q=80"} alt="University Campus" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />
          <div className="relative z-10 p-8 md:p-16 max-w-2xl lg:col-span-8">
            <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[10px] font-black uppercase px-2 py-1 rounded mb-6"><Play className="h-3 w-3 fill-current" /> Inside University</span>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight">Watch the 2026 Academic Year Opening</h2>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">Experience the vibrant energy of our campus. Hear from our faculty, students, and alumni about why our university is a place of discovery.</p>
            <Link href="/media" className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-slate-100 transition-colors inline-flex items-center gap-2">Start Watching <ChevronRight className="h-5 w-5" /></Link>
          </div>
          <div className="relative z-10 lg:col-span-4 p-6 md:p-10 flex items-end">
            <Link href="/media" className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm overflow-hidden hover:bg-white/15 transition-colors">
              {heroSide ? (
                <>
                  <div className="aspect-video overflow-hidden"><img src={getMediaPreviewUrl(heroSide)} alt={heroSide.title} className="w-full h-full object-cover" /></div>
                  <div className="p-4"><p className="text-xs uppercase tracking-widest text-white/70 mb-1">Featured slot</p><h4 className="text-white font-bold line-clamp-2">{heroSide.title}</h4></div>
                </>
              ) : (
                <div className="p-6"><p className="text-xs uppercase tracking-widest text-white/70 mb-2">Featured slot</p><h4 className="text-white font-bold">Set media category to "hero-side" from Admin Media to show content here.</h4></div>
              )}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
