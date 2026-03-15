"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type VisitsDetail = {
  totalVisits: number;
  uniqueVisitors: number;
  daily: { date: string; count: number }[];
  countries: { country: string; visits: number }[];
  latestRecordedAt: string | null;
  windowDays: number;
};

function countryName(code: string) {
  if (code === "ZZ") return "Unknown";
  return code;
}

export default function VisitsDetailPage() {
  const [data, setData] = useState<VisitsDetail | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats/visits-detail")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const maxDaily = useMemo(() => Math.max(1, ...(data?.daily || []).map((d) => d.count)), [data]);
  const maxCountry = useMemo(() => Math.max(1, ...(data?.countries || []).map((c) => c.visits)), [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Site Visits Details</h1>
          <p className="text-sm text-muted-foreground">Last 30 days trend, geography and unique visitors.</p>
        </div>
        <Link href="/admin" className="text-sm text-primary hover:underline">Back to dashboard</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Total Visits (30 days)</p><p className="text-2xl font-bold">{data?.totalVisits?.toLocaleString() || "0"}</p></div>
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Unique Visitors (30 days)</p><p className="text-2xl font-bold">{data?.uniqueVisitors?.toLocaleString() || "0"}</p></div>
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Latest Record</p><p className="text-sm font-medium">{data?.latestRecordedAt ? new Date(data.latestRecordedAt).toLocaleString() : "N/A"}</p></div>
      </div>

      <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
        <h2 className="font-semibold">Last {data?.windowDays || 30} days visits chart</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-10 gap-3">
          {(data?.daily || []).map((item) => (
            <div key={item.date} className="space-y-2">
              <div className="h-24 rounded bg-muted/60 relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary/70"
                  style={{ height: `${Math.max(6, (item.count / maxDaily) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">{item.date.slice(5)}</p>
              <p className="text-xs text-center font-semibold">{item.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
          <h2 className="font-semibold">Visits by country (map view)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(data?.countries || []).slice(0, 12).map((entry) => (
              <div
                key={entry.country}
                className="rounded-lg border border-border/40 p-3"
                style={{ backgroundColor: `hsl(var(--primary) / ${0.15 + (entry.visits / maxCountry) * 0.55})` }}
              >
                <p className="text-xs text-muted-foreground">{countryName(entry.country)}</p>
                <p className="font-bold">{entry.visits}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
          <h2 className="font-semibold">Country list</h2>
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            {(data?.countries || []).map((entry) => (
              <div key={entry.country} className="flex items-center justify-between rounded-md border border-border/40 p-2 text-sm">
                <span>{countryName(entry.country)}</span>
                <span className="font-semibold">{entry.visits}</span>
              </div>
            ))}
            {(data?.countries || []).length === 0 && <p className="text-sm text-muted-foreground">No country data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
