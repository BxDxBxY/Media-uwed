"use client";

import { type Article, useGlobalContext } from "@/lib/context";
import { Loader2, ArrowRight, Grid, List as ListIcon, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

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
  const { language, searchQuery, setSearchQuery } = useGlobalContext();
  const searchParams = useSearchParams();

  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCategories, setShowCategories] = useState(false);
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page") || "1"));
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

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

  const categories = useMemo(() => {
    return ["All", ...availableCategories];
  }, [availableCategories]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const res = await fetch("/api/frontend/categories");
        const data = await res.json();
        if (!cancelled && res.ok) {
          setAvailableCategories((data?.categories || []).map((c: { id: string; name: string }) => c.name));
        }
      } catch (error) {
        console.error("Failed to load categories", error);
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
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
      });

      if (activeCategory !== "All") params.set("category", activeCategory);
      if (searchQuery?.trim()) params.set("q", searchQuery.trim());
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/frontend/articles?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch articles");

      setArticles((data?.articles || []) as Article[]);
      setPagination(data?.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    } catch (error) {
      console.error("Failed to load articles", error);
      setArticles([]);
      setPagination({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, searchQuery, dateFrom, dateTo, currentPage]);

  useEffect(() => {
    const queryFromUrl = searchParams.get("q") || "";
    if (queryFromUrl !== searchQuery) {
      setSearchQuery(queryFromUrl);
    }
  }, [searchParams, searchQuery, setSearchQuery]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory !== "All") params.set("category", activeCategory);
    if (searchQuery?.trim()) params.set("q", searchQuery.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (currentPage > 1) params.set("page", String(currentPage));
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", next);
  }, [activeCategory, searchQuery, dateFrom, dateTo, currentPage]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, dateFrom, dateTo]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground font-serif italic">Fetching latest stories...</p>
      </div>
    );
  }

  const pages = buildPageList(pagination.page, pagination.totalPages);

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl md:text-6xl font-serif font-bold mb-8">News Archive</h1>

        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-card p-6 rounded-2xl border border-border/40 shadow-sm">
          <div className="space-y-3 w-full lg:w-auto">
            <button onClick={() => setShowCategories((prev) => !prev)} className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-semibold hover:bg-muted/60">
              <Filter className="h-4 w-4" /> {showCategories ? "Hide categories" : "Show categories"}
            </button>

            {activeCategory !== "All" && (
              <div className="text-xs font-semibold text-primary">Selected category: {activeCategory}</div>
            )}

            {showCategories && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">Date:</span>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1" />
                  <span className="text-muted-foreground">to</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1" />
                  {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">Clear</button>}
                </div>
              </div>
            )}
          </div>
          <div className="flex bg-muted p-1 rounded-lg">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}><Grid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}><ListIcon className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <Link key={article.id} href={`/article/${article.slug}`} className="group flex flex-col h-full bg-card rounded-2xl border border-border/40 overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="aspect-[16/10] overflow-hidden relative">
                <Image src={article.image} alt={article.title} fill unoptimized sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {articleCategories(article).slice(0, 2).map((cat) => (
                    <span key={`${article.id}-${cat}`} className="text-[10px] font-black uppercase tracking-widest text-primary">{cat}</span>
                  ))}
                  <span className="text-[10px] text-muted-foreground font-bold">• {article.date}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight">{getLocalized(article, "title")}</h3>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">{getLocalized(article, "summary")}</p>
                <div className="flex items-center justify-between pt-4 border-t border-border/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span>By {article.author}</span>
                  <span className="flex items-center gap-1 group-hover:text-primary transition-colors">Read More <ArrowRight className="h-3 w-3" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map((article) => (
            <Link key={article.id} href={`/article/${article.slug}`} className="group flex flex-col md:flex-row gap-6 bg-card p-4 rounded-2xl border border-border/40 hover:shadow-lg transition-all">
              <div className="w-full md:w-64 aspect-[16/10] md:aspect-square shrink-0 rounded-xl overflow-hidden relative">
                <Image src={article.image} alt={article.title} fill unoptimized sizes="(max-width: 768px) 100vw, 256px" className="object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="flex flex-col justify-center flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {articleCategories(article).slice(0, 2).map((cat) => (
                    <span key={`${article.id}-list-${cat}`} className="text-[10px] font-black uppercase tracking-widest text-primary">{cat}</span>
                  ))}
                  <span className="text-[10px] text-muted-foreground font-bold">• {article.date}</span>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">{getLocalized(article, "title")}</h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">{getLocalized(article, "summary")}</p>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">By {article.author}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={pagination.page <= 1}
            className="h-10 px-3 rounded-md border border-border bg-card disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pages.map((entry, idx) => (
            entry === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
            ) : (
              <button
                key={entry}
                onClick={() => setCurrentPage(entry)}
                className={`h-10 min-w-10 px-3 rounded-md border ${entry === pagination.page ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
              >
                {entry}
              </button>
            )
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={pagination.page >= pagination.totalPages}
            className="h-10 px-3 rounded-md border border-border bg-card disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {articles.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-border/40 rounded-3xl">
          <p className="text-lg font-serif italic text-muted-foreground">We couldn&apos;t find any stories matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
