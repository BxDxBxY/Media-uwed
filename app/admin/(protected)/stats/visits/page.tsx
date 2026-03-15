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

const GEO_COORDS: Record<string, { x: number; y: number; w: number; h: number }> = {
  US: { x: 10, y: 24, w: 8, h: 5 },
  CA: { x: 10, y: 18, w: 8, h: 5 },
  MX: { x: 12, y: 30, w: 6, h: 4 },
  BR: { x: 24, y: 38, w: 8, h: 8 },
  AR: { x: 26, y: 49, w: 6, h: 7 },
  GB: { x: 46, y: 20, w: 4, h: 4 },
  FR: { x: 48, y: 24, w: 5, h: 4 },
  DE: { x: 53, y: 23, w: 5, h: 4 },
  ES: { x: 46, y: 28, w: 5, h: 4 },
  RU: { x: 60, y: 16, w: 20, h: 8 },
  TR: { x: 56, y: 28, w: 6, h: 4 },
  UZ: { x: 64, y: 26, w: 6, h: 4 },
  KZ: { x: 66, y: 21, w: 10, h: 4 },
  IN: { x: 66, y: 34, w: 7, h: 7 },
  CN: { x: 74, y: 28, w: 10, h: 7 },
  SG: { x: 76, y: 40, w: 4, h: 4 },
  AU: { x: 82, y: 48, w: 10, h: 8 },
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
  const row = Math.floor(index / 7);
  const col = index % 7;
  return { x: 6 + col * 12.5, y: 52 + row * 6, w: 8, h: 4 };
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
          <div className="min-w-[980px] flex items-end gap-2 h-64 px-2">
            {(data?.daily || []).map((item) => {
              const height = Math.max(6, Math.round((item.count / maxDaily) * 220));
              return (
                <div key={item.date} className="flex-1 min-w-6 flex flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-semibold text-foreground/80">{item.count}</span>
                  <div
                    className="w-full rounded-t-md border border-primary/30 bg-gradient-to-t from-primary to-primary/40 transition-all duration-500"
                    style={{ height }}
                    title={`${item.date}: ${item.count}`}
                  />
                  <span className="text-[10px] text-muted-foreground">{item.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
          <h2 className="font-semibold">World map by country visits</h2>
          <div className="relative rounded-lg border border-border/40 bg-background p-3">
            <svg viewBox="0 0 100 60" className="w-full h-auto" role="img" aria-label="World visits map">
              <rect x="0" y="0" width="100" height="60" rx="2" fill="hsl(var(--muted) / 0.2)" />
              <path d="M9 19h18l3 3v7l-5 3H12l-3-4z" fill="hsl(var(--border) / 0.6)" />
              <path d="M24 34h10l3 4v11l-3 3h-9l-2-3z" fill="hsl(var(--border) / 0.6)" />
              <path d="M41 20h19l3 4v6l-2 3H44l-3-3z" fill="hsl(var(--border) / 0.6)" />
              <path d="M51 34h10l2 3v11l-3 3h-8l-2-2z" fill="hsl(var(--border) / 0.6)" />
              <path d="M62 18h22l2 3v11l-3 4H66l-4-4z" fill="hsl(var(--border) / 0.6)" />
              <path d="M69 36h16l2 3v9l-3 2H72l-3-3z" fill="hsl(var(--border) / 0.6)" />
              <path d="M80 49h10l2 2v5l-2 2h-8l-2-2z" fill="hsl(var(--border) / 0.6)" />

              {(data?.countries || []).slice(0, 24).map((entry, index) => {
                const pos = getMarkerPosition(entry.country, index);
                const intensity = 0.2 + (entry.visits / maxCountry) * 0.8;
                return (
                  <g key={entry.country}>
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={pos.w}
                      height={pos.h}
                      rx="1"
                      fill={`hsl(var(--primary) / ${intensity})`}
                      stroke="hsl(var(--primary) / 0.95)"
                      strokeWidth="0.35"
                    />
                    <text x={pos.x + pos.w / 2} y={pos.y + pos.h / 2 + 0.6} textAnchor="middle" fontSize="1.6" fill="hsl(var(--primary-foreground))" style={{ fontWeight: 700 }}>
                      {entry.country}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
          <h2 className="font-semibold">Country list</h2>
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            {(data?.countries || []).map((entry) => {
              const progress = Math.max(4, (entry.visits / maxCountry) * 100);
              return (
                <div key={entry.country} className="rounded-md border border-border/40 p-2 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span>{countryName(entry.country)}</span>
                    <span className="font-semibold">{entry.visits}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
            {(data?.countries || []).length === 0 && <p className="text-sm text-muted-foreground">No country data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
