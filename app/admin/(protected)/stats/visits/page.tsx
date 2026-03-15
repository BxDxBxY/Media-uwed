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

const GEO_COORDS: Record<string, { x: number; y: number }> = {
  US: { x: 22, y: 38 },
  CA: { x: 20, y: 28 },
  BR: { x: 33, y: 63 },
  GB: { x: 49, y: 29 },
  FR: { x: 51, y: 34 },
  DE: { x: 53, y: 32 },
  ES: { x: 48, y: 38 },
  RU: { x: 66, y: 25 },
  TR: { x: 57, y: 39 },
  UZ: { x: 64, y: 36 },
  KZ: { x: 64, y: 30 },
  IN: { x: 71, y: 46 },
  CN: { x: 76, y: 37 },
  SG: { x: 81, y: 60 },
  AU: { x: 85, y: 76 },
  LV: { x: 56, y: 26 },
};

function countryName(code: string) {
  if (code === "ZZ") return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function getMarkerPosition(code: string, index: number) {
  if (GEO_COORDS[code]) return GEO_COORDS[code];
  const row = Math.floor(index / 6);
  const col = index % 6;
  return { x: 10 + col * 14, y: 72 + row * 8 };
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
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[720px] grid grid-cols-10 gap-3">
            {(data?.daily || []).map((item) => (
              <div key={item.date} className="space-y-2">
                <div className="h-28 rounded bg-muted/60 relative overflow-hidden border border-border/30">
                  <div className="absolute bottom-0 left-0 right-0 bg-primary/80" style={{ height: `${Math.max(8, (item.count / maxDaily) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">{item.date.slice(5)}</p>
                <p className="text-xs text-center font-semibold">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
          <h2 className="font-semibold">World map by country visits</h2>
          <div className="relative rounded-lg border border-border/40 bg-muted/20 p-4">
            <svg viewBox="0 0 100 55" className="w-full h-auto" role="img" aria-label="World visits map">
              <rect x="0" y="0" width="100" height="55" fill="hsl(var(--muted) / 0.25)" />
              {[
                { x: 14, y: 20, w: 20, h: 11 },
                { x: 24, y: 36, w: 12, h: 14 },
                { x: 42, y: 20, w: 22, h: 10 },
                { x: 50, y: 31, w: 12, h: 15 },
                { x: 64, y: 18, w: 24, h: 14 },
                { x: 70, y: 34, w: 18, h: 12 },
                { x: 80, y: 44, w: 12, h: 8 },
              ].map((shape, idx) => (
                <rect key={idx} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx="2" fill="hsl(var(--border) / 0.7)" />
              ))}

              {(data?.countries || []).slice(0, 24).map((entry, index) => {
                const pos = getMarkerPosition(entry.country, index);
                const intensity = 0.3 + (entry.visits / maxCountry) * 0.7;
                return (
                  <g key={entry.country}>
                    <circle cx={pos.x} cy={pos.y} r={1.8 + (entry.visits / maxCountry) * 2.2} fill={`hsl(var(--primary) / ${intensity})`} stroke="hsl(var(--primary))" strokeWidth="0.3" />
                  </g>
                );
              })}
            </svg>
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
