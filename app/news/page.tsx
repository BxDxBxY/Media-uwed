"use client";

import { useGlobalContext } from "@/lib/context";
import { Search, Loader2, ArrowRight, Grid, List as ListIcon } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";

function articleCategories(article: any): string[] {
  const rel = Array.isArray(article.categories) ? article.categories.map((c: any) => c?.name).filter(Boolean) : [];
  const single = article.category ? [article.category] : [];
  return [...new Set([...rel, ...single])];
}

export default function NewsPage() {
  const { articles, isLoading, language } = useGlobalContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categories = useMemo(() => {
    const all = articles.flatMap((a) => articleCategories(a));
    return ["All", ...Array.from(new Set(all))];
  }, [articles]);

  const filteredArticles = articles.filter((article) => {
    const title = (article.title || "").toLowerCase();
    const summary = (article.summary || "").toLowerCase();
    const matchesSearch = title.includes(searchQuery.toLowerCase()) || summary.includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || articleCategories(article).includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  const getLocalized = (article: any, key: string) => {
    if (language === "ru") {
      const ruVal = article[key + "Ru"];
      if (ruVal) return ruVal;
    }
    if (language === "uz") {
      const uzVal = article[key + "Uz"];
      if (uzVal) return uzVal;
    }
    return article[key];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground font-serif italic">Fetching latest stories...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl md:text-6xl font-serif font-bold mb-8">News Archive</h1>

        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center bg-card p-6 rounded-2xl border border-border/40 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  activeCategory === cat ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex bg-muted p-1 rounded-lg">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}><Grid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}><ListIcon className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </header>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArticles.map((article) => (
            <Link key={article.id} href={`/article/${article.slug}`} className="group flex flex-col h-full bg-card rounded-2xl border border-border/40 overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={article.image} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
          {filteredArticles.map((article) => (
            <Link key={article.id} href={`/article/${article.slug}`} className="group flex flex-col md:flex-row gap-6 bg-card p-4 rounded-2xl border border-border/40 hover:shadow-lg transition-all">
              <div className="w-full md:w-64 aspect-[16/10] md:aspect-square shrink-0 rounded-xl overflow-hidden">
                <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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

      {filteredArticles.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-border/40 rounded-3xl">
          <p className="text-lg font-serif italic text-muted-foreground">We couldn't find any stories matching your criteria.</p>
          <button onClick={() => { setActiveCategory("All"); setSearchQuery(""); }} className="mt-4 text-primary font-bold hover:underline">Clear all filters</button>
        </div>
      )}
    </div>
  );
}
