"use client";

import { type Article, useGlobalContext } from "@/lib/context";
import { Loader2, ArrowRight, Grid, List as ListIcon, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

const PAGE_SIZE = 12;

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function articleCategories(article: Article): string[] {
  const rel = Array.isArray(article.categories) ? article.categories.map((c) => c?.name).filter(Boolean) : [];
  const single = article.category ? [article.category] : [];
  return [...new Set([...rel, ...single])];
}

function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default function NewsPage() {
  const { language } = useGlobalContext();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "All");
  const [searchText, setSearchText] = useState(searchParams.get("q") || "");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCategories, setShowCategories] = useState(false);
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page") || "1"));
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const t = {
    heading: language === "ru" ? "Архив новостей" : language === "uz" ? "Yangiliklar arxivi" : "News archive",
    showFilters: language === "ru" ? "Показать фильтры" : language === "uz" ? "Filtrlarni ko'rsatish" : "Show filters",
    hideFilters: language === "ru" ? "Скрыть фильтры" : language === "uz" ? "Filtrlarni yashirish" : "Hide filters",
    all: language === "ru" ? "Все" : language === "uz" ? "Barchasi" : "All",
    date: language === "ru" ? "Дата" : language === "uz" ? "Sana" : "Date",
    to: language === "ru" ? "по" : language === "uz" ? "dan" : "to",
    clear: language === "ru" ? "Сбросить" : language === "uz" ? "Tozalash" : "Clear",
    updating: language === "ru" ? "Обновляем список…" : language === "uz" ? "Ro'yxat yangilanmoqda…" : "Updating the list…",
    by: language === "ru" ? "Автор" : language === "uz" ? "Muallif" : "By",
    readMore: language === "ru" ? "Читать" : language === "uz" ? "O'qish" : "Read more",
    empty:
      language === "ru"
        ? "По вашему запросу ничего не найдено."
        : language === "uz"
          ? "So'rovingiz bo'yicha hech narsa topilmadi."
          : "We couldn't find any stories matching your criteria.",
    found: language === "ru" ? "Найдено" : language === "uz" ? "Topildi" : "Found",
  };

  /** Locale-aware date; falls back to the stored string when it is not parseable. */
  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const locale = language === "ru" ? "ru-RU" : language === "uz" ? "uz-UZ" : "en-GB";
    return parsed.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  };

  const getLocalized = (article: Article, key: "title" | "summary") => {
    if (language === "ru") {
      const ruVal = article[key === "title" ? "titleRu" : "summaryRu"];
      if (ruVal) return ruVal;
    }
    if (language === "uz") {
      const uzVal = article[key === "title" ? "titleUz" : "summaryUz"];
      if (uzVal) return uzVal;
    }
    return article[key];
  };

  const categories = useMemo(() => ["All", ...availableCategories], [availableCategories]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const res = await fetch("/api/frontend/categories");
        const data = await res.json();
        if (!cancelled && res.ok) {
          setAvailableCategories((data?.categories || []).map((c: { id: string; name: string }) => c.name));
        }
      } catch {
        // keep silent
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
      if (activeCategory !== "All") params.set("category", activeCategory);
      if (searchText.trim()) params.set("q", searchText.trim());
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/frontend/articles?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch articles");

      setArticles((data?.articles || []) as Article[]);
      setPagination(data?.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    } catch {
      setArticles([]);
      setPagination({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, searchText, dateFrom, dateTo, currentPage]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory !== "All") params.set("category", activeCategory);
    if (searchText.trim()) params.set("q", searchText.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (currentPage > 1) params.set("page", String(currentPage));
    router.replace(`/news${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }, [activeCategory, searchText, dateFrom, dateTo, currentPage, router]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    const urlCategory = searchParams.get("category") || "All";
    const urlQuery = searchParams.get("q") || "";
    const urlDateFrom = searchParams.get("dateFrom") || "";
    const urlDateTo = searchParams.get("dateTo") || "";
    const urlPage = Number(searchParams.get("page") || "1");

    setActiveCategory((prev) => (prev === urlCategory ? prev : urlCategory));
    setSearchText((prev) => (prev === urlQuery ? prev : urlQuery));
    setDateFrom((prev) => (prev === urlDateFrom ? prev : urlDateFrom));
    setDateTo((prev) => (prev === urlDateTo ? prev : urlDateTo));
    setCurrentPage((prev) => (prev === urlPage ? prev : urlPage));
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchText, dateFrom, dateTo]);

  const pages = buildPageList(pagination.page, pagination.totalPages);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-6xl font-serif font-bold mb-6">{t.heading}</h1>

        <div className="flex flex-col gap-4 bg-card p-4 md:p-6 rounded-2xl border border-border/40 shadow-sm">
          <div className="flex items-center gap-2 self-end md:self-auto justify-end">
            <button onClick={() => setShowCategories((prev) => !prev)} className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-semibold hover:bg-muted/60">
              <Filter className="h-4 w-4" /> {showCategories ? t.hideFilters : t.showFilters}
            </button>
            <div className="flex bg-muted p-1 rounded-lg">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}><Grid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}><ListIcon className="h-4 w-4" /></button>
            </div>
          </div>

          {showCategories && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all ${activeCategory === cat ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {cat === "All" ? t.all : cat}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground font-medium">{t.date}</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs md:text-sm" />
                <span className="text-muted-foreground">{t.to}</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs md:text-sm" />
                {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">{t.clear}</button>}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="relative min-h-[240px]">
      {isLoading && (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-xl border border-border/40 bg-background/70 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
            <p className="text-xs text-muted-foreground">{t.updating}</p>
          </div>
        </div>
      )}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {articles.map((article) => (
            <Link key={article.id} href={`/article/${article.slug}`} className="group flex flex-col h-full bg-card rounded-xl border border-border/40 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="aspect-[16/11] overflow-hidden relative">
                {article.image ? (
                  <Image src={article.image} alt={article.title} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-muted to-muted/40" />
                )}
              </div>
              <div className="p-3 md:p-4 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {articleCategories(article).slice(0, 3).map((cat) => (
                    <span key={`${article.id}-${cat}`} className="text-[11px] font-semibold rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">{cat}</span>
                  ))}
                  <span className="text-[10px] text-muted-foreground font-bold">• {formatDate(article.date)}</span>
                </div>
                <h3 className="text-base md:text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-tight">{getLocalized(article, "title")}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-3 flex-1">{getLocalized(article, "summary")}</p>
                <div className="flex items-center justify-between pt-3 border-t border-border/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span>{t.by} {article.author}</span>
                  <span className="flex items-center gap-1 group-hover:text-primary transition-colors">{t.readMore} <ArrowRight className="h-3 w-3" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {articles.map((article) => (
            <Link key={article.id} href={`/article/${article.slug}`} className="group flex flex-col sm:flex-row gap-3 bg-card p-2.5 md:p-3 rounded-xl border border-border/40 hover:shadow-md transition-all">
              <div className="w-full sm:w-44 md:w-52 aspect-[16/11] sm:aspect-[4/3] shrink-0 rounded-lg overflow-hidden relative">
                {article.image ? (
                  <Image src={article.image} alt={article.title} fill unoptimized sizes="(max-width: 640px) 100vw, 256px" className="object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-muted to-muted/40" />
                )}
              </div>
              <div className="flex flex-col justify-center flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {articleCategories(article).slice(0, 3).map((cat) => (
                    <span key={`${article.id}-list-${cat}`} className="text-[11px] font-semibold rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">{cat}</span>
                  ))}
                  <span className="text-[10px] text-muted-foreground font-bold">• {formatDate(article.date)}</span>
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 group-hover:text-primary transition-colors">{getLocalized(article, "title")}</h3>
                <p className="text-muted-foreground mb-3 line-clamp-2 text-sm md:text-base">{getLocalized(article, "summary")}</p>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t.by} {article.author}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-8 md:mt-10 flex items-center justify-center gap-2 flex-wrap">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1} className="h-10 px-3 rounded-md border border-border bg-card disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          {pages.map((entry, idx) =>
            entry === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
            ) : (
              <button key={entry} onClick={() => setCurrentPage(entry)} className={`h-10 min-w-10 px-3 rounded-md border ${entry === pagination.page ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{entry}</button>
            ),
          )}
          <button onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page >= pagination.totalPages} className="h-10 px-3 rounded-md border border-border bg-card disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {articles.length === 0 && (
        <div className="py-16 text-center border-2 border-dashed border-border/40 rounded-3xl">
          <p className="text-lg font-serif italic text-muted-foreground">{t.empty}</p>
        </div>
      )}
    </div>
  );
}
