"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ViewsDetail = {
  totalArticleViews: number;
  daily: { date: string; count: number }[];
  topArticles: { id: string; title: string; slug: string; views: number }[];
  latestRecordedAt: string | null;
};

export default function ArticleViewsDetailPage() {
  const [data, setData] = useState<ViewsDetail | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats/views-detail")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const max = useMemo(() => Math.max(1, ...(data?.daily || []).map((d) => d.count)), [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Article Views Details</h1>
          <p className="text-sm text-muted-foreground">View trend and top-performing content.</p>
        </div>
        <Link href="/admin" className="text-sm text-primary hover:underline">Back to dashboard</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Total Article Views</p><p className="text-2xl font-bold">{data?.totalArticleViews?.toLocaleString() || "0"}</p></div>
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Latest Record</p><p className="text-sm font-medium">{data?.latestRecordedAt ? new Date(data.latestRecordedAt).toLocaleString() : "N/A"}</p></div>
      </div>

      <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
        <h2 className="font-semibold">Last 14 days article views graph</h2>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {(data?.daily || []).map((item) => (
            <div key={item.date} className="space-y-2">
              <div className="h-28 rounded bg-muted flex items-end">
                <div className="w-full bg-orange-500 rounded" style={{ height: `${Math.max(6, (item.count / max) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">{item.date.slice(5)}</p>
              <p className="text-xs font-semibold text-center">{item.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-card p-6 space-y-3">
        <h2 className="font-semibold">Popular articles (Top 10)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/50">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Slug</th>
                <th className="py-2 pr-4">Views</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topArticles || []).map((article) => (
                <tr key={article.id} className="border-b border-border/30">
                  <td className="py-2 pr-4 font-medium">{article.title}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{article.slug}</td>
                  <td className="py-2 pr-4">{article.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
