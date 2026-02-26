"use client";

import { useGlobalContext } from "@/lib/context";
import { ArrowRight, Play, TrendingUp, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function Home() {
  const { articles, isLoading, media } = useGlobalContext();

  const featuredArticle = articles[0];
  const latestNews = articles.slice(1, 4);
  const trendingNews = articles.slice(4, 7);
  const mainBreakingNews = articles.length > 0 ? articles[0].title : "Gathering latest campus updates...";

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
      {/* Breaking News Ticker */}
      <div className="bg-primary text-primary-foreground py-2 overflow-hidden border-y border-primary/20">
        <div className="container mx-auto px-4 flex items-center">
          <span className="bg-white text-primary text-[10px] font-black uppercase px-2 py-0.5 rounded mr-4 whitespace-nowrap animate-pulse">Breaking</span>
          <div className="text-sm font-medium whitespace-nowrap animate-marquee">
            {mainBreakingNews} • Applications for Fall Semester 2026 are now open • New Research Grant awarded to Faculty of Science
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Featured Story */}
          <div className="lg:col-span-8">
            {featuredArticle ? (
              <Link href={`/article/${featuredArticle.slug}`} className="group block relative overflow-hidden rounded-3xl border border-border/40 bg-card shadow-sm hover:shadow-xl transition-all duration-500">
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={featuredArticle.image} alt={featuredArticle.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="p-6 md:p-10">
                  <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">{featuredArticle.category}</span>
                  <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4 leading-tight group-hover:text-primary transition-colors">
                    {featuredArticle.title}
                  </h1>
                  <p className="text-muted-foreground text-lg mb-6 line-clamp-2 max-w-2xl">
                    {featuredArticle.summary}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border/40">
                    <span className="font-bold text-foreground">By {featuredArticle.author}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {featuredArticle.date}</span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="aspect-[16/9] bg-muted rounded-3xl animate-pulse flex items-center justify-center text-muted-foreground italic">No featured article found</div>
            )}
          </div>

          {/* Side Highlights */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/40">
              <h3 className="font-serif text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Trending
              </h3>
              <Link href="/news" className="text-xs font-semibold text-primary hover:underline">View All</Link>
            </div>
            <div className="space-y-6">
              {trendingNews.length > 0 ? trendingNews.map((article, i) => (
                <Link key={article.id} href={`/article/${article.slug}`} className="flex gap-4 group">
                  <span className="text-4xl font-serif font-black text-muted/30 group-hover:text-primary/20 transition-colors">0{i + 1}</span>
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 block">{article.category}</span>
                    <h4 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">{article.title}</h4>
                  </div>
                </Link>
              )) : (
                <p className="text-xs text-muted-foreground italic">More trending stories coming soon...</p>
              )}
            </div>

            <div className="bg-muted/30 rounded-2xl p-6 border border-border/40">
              <h3 className="font-serif text-lg font-bold mb-4">Join our Newsletter</h3>
              <p className="text-sm text-muted-foreground mb-4">Weekly digest of university news, research, and campus stories.</p>
              <form
                className="space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const email = (form.elements.namedItem("email") as HTMLInputElement).value;
                  if (!email) return;

                  try {
                    const res = await fetch("/api/frontend/subscribers", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    if (res.ok) {
                      toast.success("Subscribed successfully!");
                      form.reset();
                    } else {
                      toast.error("Subscription failed");
                    }
                  } catch (err) {
                    toast.error("An error occurred");
                  }
                }}
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Your email address"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Latest News Grid */}
      <section className="bg-muted/10 py-16 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-serif font-bold">Latest Campus News</h2>
            <Link href="/news" className="group flex items-center gap-1 font-bold text-sm text-primary">
              Full Archive <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {latestNews.map((article) => (
              <Link key={article.id} href={`/article/${article.slug}`} className="group">
                <div className="aspect-[3/2] overflow-hidden rounded-2xl mb-4 border border-border/40">
                  <img src={article.image} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">{article.category}</span>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors leading-tight">{article.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{article.summary}</p>
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>{article.author}</span>
                  <span>{article.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Multimedia Highlights */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif font-bold">Multimedia Highlights</h2>
            <p className="text-muted-foreground">University life in motion and pictures.</p>
          </div>
          <Link href="/media" className="bg-primary/10 text-primary px-5 py-2 rounded-full font-bold text-sm hover:bg-primary/20 transition-colors">
            Explore Gallery
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {media.slice(0, 4).map((item) => (
            <Link key={item.id} href="/media" className="group relative aspect-[4/3] rounded-3xl overflow-hidden border border-border/40 bg-muted">
              <img
                src={item.type === "video" ? (item.thumbnail || `https://img.youtube.com/vi/${item.url.split('v=')[1]}/hqdefault.jpg`) : item.url}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-0 left-0 p-6">
                <div className="mb-2">
                  {item.type === "video" ? (
                    <span className="bg-primary text-primary-foreground p-1.5 rounded-full inline-block">
                      <Play className="h-3 w-3 fill-current" />
                    </span>
                  ) : (
                    <span className="bg-white/20 backdrop-blur-md text-white p-1.5 rounded-full inline-block">
                      <TrendingUp className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <h4 className="text-white font-bold text-sm line-clamp-2">{item.title}</h4>
              </div>
            </Link>
          ))}
          {media.length === 0 && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-muted rounded-3xl animate-pulse" />
          ))}
        </div>
      </section>

      {/* Inside University Banner */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden relative min-h-[500px] flex items-center">
          <img
            src="https://images.unsplash.com/photo-1541339907198-e08756ebafe3?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            alt="University Campus"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />
          <div className="relative z-10 p-8 md:p-16 max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[10px] font-black uppercase px-2 py-1 rounded mb-6">
              <Play className="h-3 w-3 fill-current" /> Inside University
            </span>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight">Watch the 2026 Academic Year Opening</h2>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">Experience the vibrant energy of our campus. Hear from our faculty, students, and alumni about why our university is a place of discovery.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/media" className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-slate-100 transition-colors flex items-center gap-2">
                Start Watching <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
