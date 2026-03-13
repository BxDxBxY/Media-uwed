"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type VisitsDetail = {
  totalVisits: number;
  uniqueVisitors: number;
  daily: { date: string; count: number }[];
  latestRecordedAt: string | null;
};

export default function VisitsDetailPage() {
  const [data, setData] = useState<VisitsDetail | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats/visits-detail")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const max = useMemo(() => Math.max(1, ...(data?.daily || []).map((d) => d.count)), [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Site Visits Details</h1>
          <p className="text-sm text-muted-foreground">Daily visit trend and unique-visitor snapshot.</p>
        </div>
        <Link href="/admin" className="text-sm text-primary hover:underline">Back to dashboard</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Total Visits</p><p className="text-2xl font-bold">{data?.totalVisits?.toLocaleString() || "0"}</p></div>
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Unique Visitors (recent window)</p><p className="text-2xl font-bold">{data?.uniqueVisitors?.toLocaleString() || "0"}</p></div>
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Latest Record</p><p className="text-sm font-medium">{data?.latestRecordedAt ? new Date(data.latestRecordedAt).toLocaleString() : "N/A"}</p></div>
      </div>

      <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
        <h2 className="font-semibold">Last 14 days visits graph</h2>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {(data?.daily || []).map((item) => (
            <div key={item.date} className="space-y-2">
              <div className="h-28 rounded bg-muted flex items-end">
                <div className="w-full bg-primary rounded" style={{ height: `${Math.max(6, (item.count / max) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">{item.date.slice(5)}</p>
              <p className="text-xs font-semibold text-center">{item.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
