"use client";

import Link from "next/link";
import { PlusCircle, Search, FileEdit, Trash2, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useGlobalContext } from "@/lib/context";
import { useMemo, useState } from "react";
import { compactExcerpt } from "@/lib/article-format";

const PAGE_SIZE = 10;

type SortOption = "newest" | "oldest" | "title-asc" | "title-desc";

function articleCategories(article: any): string[] {
  const rel = Array.isArray(article.categories) ? article.categories.map((c: any) => c?.name).filter(Boolean) : [];
  const single = article.category ? [article.category] : [];
  return [...new Set([...rel, ...single])];
}

export default function AdminArticlesPage() {
  const { articles, deleteArticle } = useGlobalContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const categories = useMemo(() => {
    const values = Array.from(new Set(articles.flatMap((article) => articleCategories(article))));
    return ["all", ...values];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    const filtered = articles.filter((article) => {
      const matchesSearch = article.title.toLowerCase().includes(term) || article.author.toLowerCase().includes(term);
      const matchesCategory = category === "all" || articleCategories(article).includes(category);
      const articleTime = new Date(article.createdAt ?? article.date).getTime();
      const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
      const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
      const matchesDate = Number.isFinite(articleTime) && (fromTime === null || articleTime >= fromTime) && (toTime === null || articleTime <= toTime);
      return matchesSearch && matchesCategory && matchesDate;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "title-asc") return a.title.localeCompare(b.title);
      if (sortBy === "title-desc") return b.title.localeCompare(a.title);

      const timeA = new Date(a.createdAt ?? a.date).getTime();
      const timeB = new Date(b.createdAt ?? b.date).getTime();
      return sortBy === "oldest" ? timeA - timeB : timeB - timeA;
    });

    return sorted;
  }, [articles, category, searchTerm, sortBy, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const paginatedArticles = filteredArticles.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">Articles</h1>
        <Link href="/admin/articles/new" className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <PlusCircle className="h-4 w-4" />
          New Article
        </Link>
      </div>

      <div className="rounded-lg border border-border/40 bg-card p-4 space-y-3">
        <button onClick={() => setShowFilters((prev) => !prev)} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted">
          <Filter className="h-4 w-4" /> {showFilters ? "Hide filters" : "Show filters"}
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search articles..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {showFilters && (
          <div className="grid gap-4 md:grid-cols-4">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {categories.map((value) => (
                <option key={value} value={value}>{value === "all" ? "All Categories" : value}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                setPage(1);
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/40 bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/40 bg-muted/50">
            <tr>
              <th className="px-6 py-3 font-medium text-muted-foreground">Title</th>
              <th className="px-6 py-3 font-medium text-muted-foreground">Preview</th>
              <th className="px-6 py-3 font-medium text-muted-foreground">Category</th>
              <th className="px-6 py-3 font-medium text-muted-foreground">Author</th>
              <th className="px-6 py-3 font-medium text-muted-foreground">Date</th>
              <th className="px-6 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paginatedArticles.map((article) => (
              <tr key={article.id} className="transition-colors hover:bg-muted/30">
                <td className="max-w-sm truncate px-6 py-4 font-medium">{article.title}</td>
                <td className="px-6 py-4 max-w-md">
                  <Link href={`/article/${article.slug}`} target="_blank" className="block hover:underline">
                    <p className="line-clamp-2 text-xs text-muted-foreground leading-5">{compactExcerpt(article.summary || article.content)}</p>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {articleCategories(article).slice(0, 2).map((cat) => (
                      <span key={`${article.id}-${cat}`} className="rounded-full bg-primary/10 text-primary text-[10px] px-2 py-0.5 font-semibold">{cat}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">{article.author}</td>
                <td className="px-6 py-4">{article.date}</td>
                <td className="px-6 py-4"><span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500">Published</span></td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/articles/new?edit=${article.id}`} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><FileEdit className="h-4 w-4" /></Link>
                    <button onClick={() => deleteArticle(article.id)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredArticles.length === 0 && <div className="p-8 text-center text-muted-foreground">No articles found.</div>}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filteredArticles.length === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1} - {Math.min(clampedPage * PAGE_SIZE, filteredArticles.length)} of {filteredArticles.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={clampedPage === 1} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /> Prev</button>
          <span>Page {clampedPage} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={clampedPage >= totalPages} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 disabled:opacity-50">Next <ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
