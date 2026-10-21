# 🔄 Data Flow & Pipeline Analysis

> **Date:** 2026-05-13  
> **Project:** Media-uwed
>
> ✅ **Flows are still accurate — re-verified 2026-07-31**, with the corrections marked **`⚠️ CORRECTION (2026-07-31)`** below (publish status value, who may call the pipeline, and what the "AI" step really does). Current status: [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md).
>
> 🔧 **Fixed 2026-07-31:** this file previously rendered badly out of order — the §2 diagram was missing its closing fence, which swallowed §4's heading, and §3 plus the "Language Detection" notes were stranded at the end of the file inside §6. Sections now read §1 → §6 in order; no content was removed.

---

## 1. Content Pipeline Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   RSS Sources   │ ──→ │   Pull (Cron)   │ ──→ │  Process (AI)   │ ──→ │ Publish (Cron)  │
│  (external)     │     │  /api/cron/pull │     │ /api/cron/proc  │     │ /api/cron/publ  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │                       │
         │                      ▼                       ▼                       ▼
         │              ┌──────────────┐       ┌─────────────────┐      ┌──────────┐
         │              │ ArticleRaw   │       │ArticleProcessed │      │ Article  │
         │              │ (raw RSS)    │       │ (3-lang queue)  │      │(published)│
         │              └──────────────┘       └─────────────────┘      └──────────┘
         │                      │                       │                       │
         │                      │              ┌────────┴────────┐              │
         │                      │              │  Admin Review   │              │
         │                      │              │  (UI approval)  │              │
         │                      │              └─────────────────┘              │
         │                                                                      │
         │              ┌──────────────────────────────────────────────────────┘
         │              │
         ▼              ▼
   ┌──────────┐  ┌────────────┐
   │ Sources  │  │ Categories │
   └──────────┘  └────────────┘
```

### Pipeline Execution

Each pipeline step is a `POST` endpoint designed to be called by cron jobs or manually triggered:

> 🔴 **CORRECTION (2026-07-31):** "designed to be called by cron jobs" currently means **callable by anyone** — `pull`, `process` and `publish` have no authentication, and `automation` fails open when `AUTOMATION_CRON_SECRET` is unset. Anonymous callers can burn AI credits, publish content and fire Telegram broadcasts. See audit **C4**.
>
> Also: no scheduler is actually wired. `automation_configs.lastScheduledRunAt` is `NULL` and there is no `vercel.json` / CI cron, so the pipeline only ever runs when someone clicks in the admin UI. Last real source fetch was **2026-07-22**.

#### Pull
1. Fetch all enabled `Source` entries from DB
2. For each source, call `fetchRSSFeed(feedUrl)`
3. Normalize items via `NormalizedRSSItem` interface
4. Deduplicate using `(sourceId, guid)` unique constraint
5. Bulk upsert into `ArticleRaw` table
6. Update `Source.lastFetchedAt` timestamp

#### Process
1. Fetch unprocessed `ArticleRaw` entries (where `processed` is null)
2. Apply keyword filters from `AutomationConfig`
3. Detect source language via character analysis
4. Run AI processing: paraphrase → categorize → translate (3 languages)
5. Save as `ArticleProcessed` with status `pending_review`

#### Publish
1. Fetch `ArticleProcessed` with `status = "ready"` (or `ready`/`pending_review` when explicit `processedIds` are passed), max 20 per call
2. Create `Article` record with all language variants
3. Link categories (many-to-many)
4. Mark as published
5. Optionally send Telegram notification

> ⚠️ **CORRECTION (2026-07-31):** the trigger status is **`"ready"`**, not `"approved"` — no `approved` status exists anywhere in the codebase. Valid `ArticleProcessed.status` values in use: `pending_review` (default), `ready`, `published`.
>
> ⚠️ **CORRECTION (2026-07-31) — step 4 of Process:** the "AI" stage is mostly heuristic. Only translation calls an LLM; paraphrasing is regex substitution and summarization is "first 8 sentences, truncated at 900 characters" (`lib/ai.ts:312-318`). See audit **H1**.


---

## 2. Translation Fallback Chain

```
                    ┌──────────────────┐
                    │  OpenRouter AI   │ ← Primary (requires API key)
                    │  (GPT-4o-mini)   │
                    └────────┬─────────┘
                             │ fails
                             ▼
                    ┌──────────────────┐
                    │  LibreTranslate  │ ← Free public API
                    └────────┬─────────┘
                             │ fails
                             ▼
                    ┌──────────────────┐
                    │  MyMemory        │ ← Free API
                    └────────┬─────────┘
                             │ fails
                             ▼
                    ┌──────────────────┐
                    │ Source text      │ ← Best-effort fallback
                    │ (no translation) │
                    └──────────────────┘
```

> ⚠️ **CORRECTION (2026-07-31):** step 1 of this chain is inactive. The `ai` integration is enabled but stores **no** API key, and `OPENROUTER_API_KEY` is unset, so `translateWithOpenRouterChunk` returns `null` immediately and every translation starts at LibreTranslate. `libretranslate.de` is a public instance that rate-limits and may reject anonymous traffic, so in practice most text lands on MyMemory or on the untranslated source. See audit **H1**.
>
> A second failure mode sits between steps 1 and 2: `isRefusalLike` ([lib/ai.ts:148-166](../lib/ai.ts)) discards any LLM output containing `policy`, `sorry`, `cannot provide`, … — so even with a working key, ordinary news copy about *policy* is thrown away and silently downgraded to a free translator. See audit **H2**.

### Language Detection
- Cyrillic ratio > 25% → Russian
- Uzbek-specific tokens (ʻʼ’ʻ, oʻz, ham, uchun, va) → Uzbek
- Default → English

---

## 3. Authentication Flow

```
Client                    Server                    Database
  │                         │                         │
  │  POST /auth/login       │                         │
  │  {identity, password}   │                         │
  │────────────────────────→│                         │
  │                         │──── findFirst ─────────→│
  │                         │←──── user data ────────│
  │                         │                         │
  │                         │── verifyPassword() ────│
  │                         │   (scrypt comparison)  │
  │                         │                         │
  │                         │── createSessionToken() │
  │                         │   (HMAC-SHA256)        │
  │                         │                         │
  │←── Set-Cookie ─────────│                         │
  │    admin_session=token  │                         │
```

### Protected Route Check
```
Request → getAdminSessionFromRequest()
  → parse cookie → split payload.signature
  → HMAC verify with secret → check exp timestamp
  → 401 if invalid/expired → else proceed
```

> ⚠️ **CORRECTION (2026-07-31):** the login diagram is missing the approval gate and the registration/reset paths added since. Actual flow:
>
> ```
> POST /api/admin/auth/signup          → creates AdminUser{approved:false, role:"admin"}   [PUBLIC]
> POST /api/admin/auth/login           → 403 while approved=false, else session cookie
> POST /api/admin/auth/forgot-password → writes resetToken(+1h expiry), emails/logs link   [PUBLIC]
> POST /api/admin/auth/reset-password  → sets passwordHash AND approved=true  ← 🔴 C2
> POST /api/admin/users {action}       → super-admin only: approve / toggle_super
> ```
>
> Because reset-password flips `approved` to `true`, the approval gate is bypassable end-to-end by a self-registered user. `requireAdmin()` only checks `role === "admin"`, and signup hardcodes that role. See audit **C2**.
>
> Two further gaps in the "Protected Route Check": there is **no rate limiting** anywhere (audit H4), and there is **no `middleware.ts`** — protection is per-route (`requireAdmin` in `/api/admin/*` handlers, a `getAdminSessionFromCookies()` + `redirect()` in `app/admin/(protected)/layout.tsx`). Any new route is therefore unprotected by default, which is exactly how audit **C1** and **C4** arose.

---

## 4. Secret Encryption Flow

```
Admin UI                    Server                      Database
  │                         │                            │
  │ POST /integrations/     │                            │
  │ secret                  │                            │
  │ { type, apiKey }        │                            │
  │────────────────────────→│                            │
  │                         │── encryptSecret() ───────│
  │                         │   AES-256-GCM             │
  │                         │   (random IV + auth tag)  │
  │                         │                            │
  │                         │── fingerprintSecret() ───│
  │                         │   SHA-256(apiKey).slice(16)│
  │                         │                            │
  │                         │── upsert IntegrationConfig│
  │                         │   encryptedKey + hash     │
  │                         │──────────────────────────→│
  │                         │←── success ──────────────│
  │←── { ok: true } ───────│                            │
```

### Key Derivation Priority
1. `ADMIN_SECRET_ENCRYPTION_KEY` (production-grade)
2. `ADMIN_SESSION_SECRET` (fallback)
3. `NEXTAUTH_SECRET` (second fallback)
4. Hardcoded dev fallback (⚠️ non-production)

---

## 5. Frontend Data Flow

```
RootLayout (server)
    │
    ▼
Providers (client)
  ├── ThemeProvider (next-themes)
  └── GlobalProvider (React Context)
        │
        ├── On mount: fetch /api/frontend/*
        │     articles, events, media, about
        │
        ├── On admin route: also fetch
        │     /api/admin/subscribers, messages, stats, sources
        │
        └── After mutations: refreshData()
              re-fetches all relevant endpoints

Pages use: useGlobalContext()
  → articles[], events[], media[], language, etc.
  → CRUD methods: addArticle(), deleteEvent(), etc.
```

### Data Loading Strategy
1. `GlobalProvider` fetches public data on mount
2. On admin routes, also fetches admin data
3. Dedicated API calls for category-specific content (homepage)
4. `refreshData()` called after every mutation
5. Optimistic UI updates for subscriber deletions

> ⚠️ **CORRECTION (2026-07-31) — two consequences of this design that the diagram hides:**
>
> 1. **Over-fetching.** `lib/context.tsx:175` requests `limit=100&full=1` — i.e. **full article bodies** — plus events, media and about on mount, and re-fetches on every pathname change; on admin routes it adds subscribers, messages, stats and sources. This is the same root cause raised in `docs_audit.md` (2026-03-13) and it is **still open** (audit H7).
> 2. **The admin panel mutates through public endpoints.** `addArticle`/`updateArticle`/`deleteArticle` and the event/media equivalents (`lib/context.tsx:256-381`) call `/api/frontend/*`, which have **no authorization**. Any fix to audit **C1** must also update this data layer — that coupling is why the hole exists.
>
> Additionally, every public page (`/`, `/news`, `/article/[slug]`, `/events/[id]`, `/media`, `/about`, `/contact`) is a client component, so none of this data is server-rendered → no per-article metadata for crawlers (audit H6).

---

## 6. Admin Panel Navigation Flow

```
/admin/login (unauthenticated)
    │
    ▼
/admin (protected)
    │
    ├── Dashboard (stats, recent articles, popular)
    ├── Articles (list, create, edit)
    ├── Events (list, create, edit)
    ├── Media (gallery management)
    ├── Automation (RSS sources, raw items, review queue)
    ├── Connections (subscribers, messages, broadcast)
    ├── Settings (site config, integrations, security)
    ├── About / Privacy / Terms (static pages)
    └── Stats (visits, article views)
```

### Protected Layout
The `(protected)` route group wraps all admin pages with:
- Session validation
- Admin sidebar navigation
- Admin header layout
- Logout functionality

> ⚠️ **CORRECTION (2026-07-31):** the navigation tree above is missing `/admin/approvals` (super-admin only, added since), and the public auth pages `/admin/signup`, `/admin/forgot-password`, `/admin/reset-password` — the login page links to the first two ([app/admin/login/page.tsx:100-103](../app/admin/login/page.tsx)). The layout also performs an extra `adminUser.findUnique` per request to resolve `isSuperAdmin` for menu rendering.
