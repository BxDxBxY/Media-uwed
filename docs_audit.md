# Project Audit: Performance, SEO, Security, and UX Risks

Date: 2026-03-13
Scope: Public website + shared data layer + exposed API routes.

## Executive Summary

The project currently centralizes most data loading in a client-side global context and re-fetches broad datasets on route changes. This architecture is likely the root cause of perceived heaviness with 240+ news items and will continue to degrade as content grows.

Top priorities:
1. Move public pages to server-rendered, route-scoped data fetching with pagination.
2. Reduce payload size (do not ship full article bodies for list pages).
3. Lock down admin GET endpoints that are currently public.
4. Add baseline SEO primitives (real metadata, sitemap, robots, canonical, structured data).

---

## Severity Matrix

### HIGH

1. **Over-fetching all datasets on every route change (public + admin) from one global provider**
   - Impact: slow initial load, duplicate network work, poor Core Web Vitals, scalability issues.
   - Evidence: `GlobalProvider.refreshData()` fetches 8 endpoints in parallel, including admin resources, and is called in `useEffect` on pathname changes.

2. **Unpaginated article API returns full article records including `content`**
   - Impact: payload size explodes as articles grow; list/home pages pull unnecessary heavy fields.
   - Evidence: `/api/frontend/articles` uses `findMany` without `take/skip` and no field `select` to trim response.

3. **Admin data exposure via unprotected GET endpoints**
   - Impact: sensitive operational data can be queried without admin auth.
   - Evidence: `GET /api/admin/subscribers`, `GET /api/admin/stats`, and `GET /api/admin/sources` do not enforce `requireAdmin`.

### MEDIUM

4. **Client-only rendering for key content pages (home/news/article)**
   - Impact: weaker SEO indexing and slower first meaningful content versus SSR/SSG.
   - Evidence: `"use client"` at top of major public pages and data flow through client context.

5. **No meaningful default metadata and missing SEO infrastructure**
   - Impact: poor snippet quality in search results, weak crawl directives.
   - Evidence: app metadata is still Create Next App defaults; no built-in sitemap/robots files observed.

6. **Image optimization bypassed (`<img>` instead of `next/image`)**
   - Impact: larger image transfer, reduced LCP performance.

### LOW

7. **Global reload pattern likely increases server load and cache misses**
   - Impact: higher infra cost and reduced resilience under traffic spikes.

8. **Potential UX friction on slow networks due to repeated loading states**
   - Impact: perceived instability and lower user trust.

---

## Optimization Threats and Fixes

### 1) Data Loading Architecture (High)

**Threat:** all pages depend on `GlobalProvider` and load broad datasets every route transition.

**Fix direction:**
- Keep global context for UI state only (language/theme/search), not all content data.
- Fetch page-specific data at route level:
  - Home: featured + small blocks only.
  - News list: paginated API (`page`, `limit`, filters).
  - Article page: single article by slug.
- Prefer SSR/ISR for public content and cache via Next.js `revalidate`.

### 2) Payload Bloat (High)

**Threat:** list endpoints ship full records, including full `content` fields.

**Fix direction:**
- Create lightweight DTO for list views:
  - `id, slug, title*, summary*, image, date, author, categories`.
- Return full `content` only from article detail endpoint.
- Add pagination defaults (e.g., 12-24 items/page).

### 3) Database and API Efficiency (Medium)

**Threat:** no pagination/cursor strategy means linear payload growth.

**Fix direction:**
- Add cursor or offset pagination with total count.
- Add indexes in Prisma for common filters/sorts:
  - `Article(createdAt)`, `Article(slug)`, maybe `Article(category)`.
- Add cache-control for public GET responses.

---

## SEO Threats and Fixes

### 1) Rendering strategy (Medium)
- Move from client-only news/article rendering to server-rendered pages.
- Generate per-article metadata (`title`, `description`, OpenGraph/Twitter, canonical).

### 2) Crawlability basics (Medium)
- Add `app/sitemap.ts` and `app/robots.ts`.
- Ensure canonical URLs and language alternates if multilingual pages are separate URLs.

### 3) Structured data (Medium)
- Add JSON-LD for `NewsArticle` on article pages.
- Add Organization schema on home/layout.

> Note: “1st on Google” cannot be guaranteed by technical changes alone. Technical SEO removes blockers; ranking still depends on authority, content quality, backlinks, freshness, and competition.

---

## Security Threats and Fixes

### HIGH: Missing auth on admin GET routes
- Protect all admin routes (GET/POST/PATCH/DELETE consistently) with `requireAdmin`.
- Specifically prioritize:
  - `/api/admin/subscribers`
  - `/api/admin/stats`
  - `/api/admin/sources` (GET currently open)

### MEDIUM: Overexposed data surface
- Split public/admin models and responses.
- Ensure admin-only telemetry is never requested by public sessions.

### MEDIUM: Operational hardening
- Add rate limiting for public write endpoints (contact/subscriber/view counters).
- Add security headers (CSP, X-Frame-Options, Referrer-Policy) via middleware/next config.

---

## User-Orientedness (UX/Product)

### Risks
- Slow initial load harms retention.
- Heavy content pages increase bounce, especially mobile.
- Repeated loaders on navigation reduce confidence.

### Recommendations
- Fast path homepage: render immediately with limited, curated content.
- Add skeletons only for local components, not full-page waiting.
- Preload only above-the-fold images and lazy-load the rest.
- Keep filters/search server-backed for large archives.

---

## Suggested Implementation Order (Practical Roadmap)

### Phase 1 (Immediate, 1-2 days)
1. Secure admin GET endpoints with `requireAdmin`.
2. Add paginated article list API with lightweight fields.
3. Stop fetching admin resources in public context.

### Phase 2 (Short-term, 3-5 days)
1. Convert `/`, `/news`, `/article/[slug]` to server data fetching.
2. Replace `<img>` with `next/image` on major templates.
3. Add metadata, sitemap, robots, canonical tags.

### Phase 3 (Ongoing)
1. Add structured data (NewsArticle).
2. Add response caching and monitoring (Web Vitals + API timings).
3. Improve content strategy + internal linking for ranking gains.

---

## Final Note

Your intuition is correct: the current loading model is the main performance bottleneck and it also limits SEO potential. If you want, next step I can implement Phase 1 directly and then move page-by-page through Phase 2 for a measurable speed and indexing improvement.
