"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type VisitsDetail = {
  totalVisits: number;
  uniqueVisitors: number;
  daily: { date: string; count: number }[];
  countries: { country: string; visits: number }[];
  countryDaily?: { country: string; daily: { date: string; count: number }[] }[];
  latestRecordedAt: string | null;
  windowDays: number;
};

type Marker = { x: number; y: number };

const COUNTRY_MARKERS: Record<string, Marker> = {
  US: { x: 18, y: 24 },
  CA: { x: 18, y: 16 },
  MX: { x: 19, y: 31 },
  BR: { x: 30, y: 43 },
  AR: { x: 30, y: 53 },
  GB: { x: 46, y: 20 },
  FR: { x: 47, y: 24 },
  DE: { x: 50, y: 22 },
  ES: { x: 45, y: 28 },
  RU: { x: 64, y: 17 },
  TR: { x: 54, y: 27 },
  UZ: { x: 61, y: 27 },
  KZ: { x: 61, y: 22 },
  IN: { x: 65, y: 35 },
  CN: { x: 71, y: 28 },
  SG: { x: 73, y: 41 },
  AU: { x: 82, y: 50 },
  UA: { x: 54, y: 22 },
  IR: { x: 57, y: 29 },
};

const CONTINENT_PATHS = [
  "M5 12 L24 10 L31 16 L30 31 L23 34 L17 30 L12 27 L8 22 Z",
  "M23 34 L30 36 L33 48 L30 57 L24 53 L22 43 Z",
  "M38 14 L52 12 L58 18 L58 27 L52 31 L42 30 L38 24 Z",
  "M46 31 L53 34 L56 45 L52 55 L46 49 L44 39 Z",
  "M52 12 L82 11 L92 18 L91 30 L83 37 L69 38 L58 33 L57 26 Z",
  "M68 38 L78 39 L86 45 L87 55 L78 58 L69 52 L65 45 Z",
  "M79 51 L90 50 L95 55 L93 59 L82 59 L78 55 Z",
];

function countryName(code: string) {
  if (code === "ZZ") return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function getMarkerPosition(code: string, index: number): Marker {
  if (COUNTRY_MARKERS[code]) return COUNTRY_MARKERS[code];
  return { x: 8 + (index % 10) * 8.5, y: 46 + Math.floor(index / 10) * 4 };
}

export default function VisitsDetailPage() {
  const [data, setData] = useState<VisitsDetail | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/admin/stats/visits-detail")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const maxCountry = useMemo(() => Math.max(1, ...(data?.countries || []).map((c) => c.visits)), [data]);

  const selectedSeries = useMemo(() => {
    if (!data) return [] as { date: string; count: number }[];
    if (selectedCountry === "ALL") return data.daily || [];
    const perCountry = data.countryDaily?.find((x) => x.country === selectedCountry);
    return perCountry?.daily || [];
  }, [data, selectedCountry]);

  const maxSeries = useMemo(() => Math.max(1, ...selectedSeries.map((d) => d.count)), [selectedSeries]);
  const selectedCountryVisits = useMemo(() => {
    if (!data || selectedCountry === "ALL") return data?.totalVisits || 0;
    return data.countries.find((c) => c.country === selectedCountry)?.visits || 0;
  }, [data, selectedCountry]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Site Visits Details</h1>
          <p className="text-sm text-muted-foreground">Interactive geo view + per-country trend for the last 30 days.</p>
        </div>
        <Link href="/admin" className="text-sm text-primary hover:underline">Back to dashboard</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Total Visits (30 days)</p><p className="text-2xl font-bold">{data?.totalVisits?.toLocaleString() || "0"}</p></div>
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Unique Visitors (30 days)</p><p className="text-2xl font-bold">{data?.uniqueVisitors?.toLocaleString() || "0"}</p></div>
        <div className="rounded-xl border border-border/40 bg-card p-4"><p className="text-xs text-muted-foreground">Latest Record</p><p className="text-sm font-medium">{data?.latestRecordedAt ? new Date(data.latestRecordedAt).toLocaleString() : "N/A"}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">World visits map</h2>
            <button
              onClick={() => setSelectedCountry("ALL")}
              className={`text-xs rounded-md border px-2 py-1 ${selectedCountry === "ALL" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            >
              Show all countries
            </button>
          </div>
          <div className="relative rounded-lg border border-border/40 bg-background p-3">
            <svg viewBox="0 0 100 60" className="w-full h-auto" role="img" aria-label="World visits map">
              <rect x="0" y="0" width="100" height="60" rx="2" fill="hsl(var(--muted) / 0.15)" />
              {CONTINENT_PATHS.map((path) => (
                <path key={path} d={path} fill="hsl(var(--muted) / 0.5)" stroke="hsl(var(--border) / 0.9)" strokeWidth="0.3" />
              ))}

              {(data?.countries || []).slice(0, 40).map((entry, index) => {
                const pos = getMarkerPosition(entry.country, index);
                const intensity = 0.3 + (entry.visits / maxCountry) * 0.7;
                const active = selectedCountry === entry.country;
                return (
                  <g
                    key={entry.country}
                    onMouseEnter={() => setHoveredCountry(entry.country)}
                    onMouseLeave={() => setHoveredCountry((prev) => (prev === entry.country ? null : prev))}
                    onClick={() => setSelectedCountry(entry.country)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={active ? 2.4 : 1.8}
                      fill={`hsl(var(--primary) / ${intensity})`}
                      stroke={active ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.7)"}
                      strokeWidth={active ? "0.7" : "0.4"}
                    />
                    <text x={pos.x + 2.2} y={pos.y + 0.2} fontSize="1.9" fill="hsl(var(--foreground))" style={{ fontWeight: 700 }}>
                      {entry.country}
                    </text>
                    <title>{`${countryName(entry.country)} (${entry.country}): ${entry.visits} visits`}</title>
                  </g>
                );
              })}
            </svg>

            {hoveredCountry && (
              <div className="absolute left-3 top-3 rounded-md border border-border bg-card px-2 py-1 text-xs shadow-sm">
                <span className="font-semibold">{countryName(hoveredCountry)}</span> ({hoveredCountry})
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Hover to see country names and click a country to update the trend chart.</p>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
          <h2 className="font-semibold">{selectedCountry === "ALL" ? "All countries" : `${countryName(selectedCountry)} (${selectedCountry})`} trend</h2>
          <p className="text-xs text-muted-foreground">Visits: {selectedCountryVisits.toLocaleString()} over last {data?.windowDays || 30} days.</p>
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[980px] flex items-end gap-2 h-64 px-2">
              {selectedSeries.map((item) => {
                const height = Math.max(6, Math.round((item.count / maxSeries) * 220));
                return (
                  <div key={`${selectedCountry}-${item.date}`} className="flex-1 min-w-6 flex flex-col items-center justify-end gap-1">
                    <span className="text-[10px] font-semibold text-foreground/80">{item.count}</span>
                    <div className="w-full rounded-t-md border border-primary/30 bg-gradient-to-t from-primary to-primary/40 transition-all duration-500" style={{ height }} title={`${item.date}: ${item.count}`} />
                    <span className="text-[10px] text-muted-foreground">{item.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
