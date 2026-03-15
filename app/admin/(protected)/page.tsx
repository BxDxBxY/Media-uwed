"use client";

import Link from "next/link";
import { FileText, Calendar, Users, Eye, ArrowUpRight, Images, Mail, MessageSquare, Rss, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DashboardResponse = {
  totals: {
    totalArticles: number;
    totalEvents: number;
    totalMedia: number;
    totalSubscribers: number;
    totalMessages: number;
    totalSources: number;
    totalVisits: number;
    totalArticleViews: number;
  };
  recentArticles: { id: string; title: string; date: string; category: string }[];
  popularArticles: { id: string; title: string; views: number }[];
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const payload = await res.json();
        if (!cancelled && res.ok) setData(payload);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = data?.totals;
  const stats = [
    {
      label: "Total Articles",
      value: totals?.totalArticles ?? 0,
      icon: <FileText className="h-5 w-5" />,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      href: "/admin/articles",
    },
    {
      label: "Total Events",
      value: totals?.totalEvents ?? 0,
      icon: <Calendar className="h-5 w-5" />,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
      href: "/admin/events",
    },
    {
      label: "Media Items",
      value: totals?.totalMedia ?? 0,
      icon: <Images className="h-5 w-5" />,
      color: "text-fuchsia-600 dark:text-fuchsia-400",
      bgColor: "bg-fuchsia-500/10",
      href: "/admin/media",
    },
    {
      label: "Subscribers",
      value: totals?.totalSubscribers ?? 0,
      icon: <Mail className="h-5 w-5" />,
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-500/10",
      href: "/admin/connections",
    },
    {
      label: "Inbox Messages",
      value: totals?.totalMessages ?? 0,
      icon: <MessageSquare className="h-5 w-5" />,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      href: "/admin/connections",
    },
    {
      label: "Active Sources",
      value: totals?.totalSources ?? 0,
      icon: <Rss className="h-5 w-5" />,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
      href: "/admin/automation",
    },
    {
      label: "Site Visits",
      value: (totals?.totalVisits ?? 0).toLocaleString(),
      icon: <Users className="h-5 w-5" />,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      href: "/admin/stats/visits",
    },
    {
      label: "Article Views",
      value: (totals?.totalArticleViews ?? 0).toLocaleString(),
      icon: <Eye className="h-5 w-5" />,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
      href: "/admin/stats/views",
    },
  ];

  const topViews = useMemo(
    () => Math.max(1, ...(data?.popularArticles || []).map((a) => a.views || 0)),
    [data?.popularArticles],
  );

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-3 text-muted-foreground">Loading full dashboard data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-serif mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s the full snapshot of your website.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block">
            <div className="p-6 rounded-xl border border-border/40 bg-card hover:shadow-md transition-shadow h-full">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <div className={stat.color}>{stat.icon}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Recent Articles</h2>
            <Link href="/admin/articles" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.recentArticles || []).map((article) => (
              <div key={article.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{article.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {article.category}
                    </span>
                    <span className="text-xs text-muted-foreground">{article.date}</span>
                  </div>
                </div>
                <Link href={`/admin/articles/new?edit=${article.id}`} className="text-xs text-primary hover:underline whitespace-nowrap">
                  Edit
                </Link>
              </div>
            ))}
            {(data?.recentArticles || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No articles yet</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Popular Articles</h2>
            <Link href="/admin/stats/views" className="text-sm text-primary hover:underline">Open details</Link>
          </div>
          <div className="space-y-3">
            {(data?.popularArticles || []).map((article) => (
              <div key={article.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm gap-3">
                  <p className="truncate font-medium">{article.title}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{article.views} views</span>
                </div>
                <div className="h-2 rounded bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.max(8, (article.views / topViews) * 100)}%` }} />
                </div>
              </div>
            ))}
            {(data?.popularArticles || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No view data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
