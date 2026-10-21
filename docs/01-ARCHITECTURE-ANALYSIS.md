# 📐 Project Architecture Analysis

> **Date:** 2026-05-13  
> **Project:** Media-uwed – University Media Platform  
> **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Prisma ORM + PostgreSQL + Tailwind CSS v4
>
> ✅ **Structurally still accurate — counts and status re-verified 2026-07-31.** Corrections are marked **`⚠️ CORRECTION (2026-07-31)`**. Current project status lives in [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md).

---

## 1. High-Level Overview

Media-uwed is a **production-style university media/news platform** — an end-to-end editorial system with:
- Public multilingual website (EN/RU/UZ)
- Authenticated admin control panel
- Automated content pipeline (RSS → AI processing → human review → publish)
- Integration management (AI providers, Telegram bot)
- Embedded admin AI assistant

---

## 2. Directory Structure

```
Media-uwed/
├── app/                        # Next.js App Router pages & API
│   ├── admin/                  # Admin panel routes
│   │   ├── login/              # Admin login page
│   │   ├── (protected)/        # Admin dashboard & CRUD pages
│   │   └── layout.tsx
│   ├── api/                    # All API route handlers
│   │   ├── admin/              # Admin REST API
│   │   ├── articles/           # Public article queries
│   │   ├── cron/               # Automation pipeline (pull/process/publish)
│   │   └── frontend/           # Public API endpoints
│   ├── article/, news/, events/, media/, about/, contact/
│   ├── privacy-policy/, terms-of-use/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Homepage
├── components/                 # Shared React components (13 files)
├── lib/                        # Domain services & utilities (24 files)
├── prisma/                     # Database layer
│   ├── schema.prisma           # Full schema (17 models, 19 tables)
│   ├── generated/              # Generated Prisma client
│   ├── migrations/             # 11 SQL migration files
│   └── scripts/
├── docs/                       # This documentation set
├── scripts/                    # create-admin.ts + scripts/setup/ (PowerShell helpers)
├── public/
└── seed-db.js, .env, next.config.ts, prisma.config.ts
```

> ⚠️ **CORRECTION (2026-07-31):** the tree above was rendered inside an unterminated code fence, which broke the rest of this document (sections 5–7 appeared out of order and section 6 was orphaned at the end of the file). Fixed. `app/admin/` also now contains `signup/`, `forgot-password/`, `reset-password/` and `(protected)/approvals/`.

---

## 3. Data Model (Prisma Schema)

> ⚠️ **CORRECTION (2026-07-31):** the database now has **19 tables / 17 Prisma models / 11 migrations** (was documented as 20 tables / 15+ models / 10 migrations). `admin_broadcast_logs` was dropped by migration `20260718222543_add_provider_base_url`. `admin_users` also gained `approved`, `resetToken`, `resetTokenExpires`, `isSuperAdmin`, and `integration_configs` gained `providerBaseUrl` — **the four `admin_users` columns have no migration and exist only via `db push`** (audit C3).

The database has **19 tables** covering:

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `articles` | Published content | title, titleRu, titleUz, summary, content, image, slug, author, views |
| `categories` | Article taxonomy | name (unique), many-to-many with articles |
| `articles_raw` | Ingested RSS items | sourceId, guid, url, title, description |
| `articles_processed` | AI-processed queue | headlineEn/Ru/Uz, summaryEn/Ru/Uz, contentEn/Ru/Uz, categories, status |
| `sources` | RSS feed sources | name, feedUrl, category, enabled |
| `events` | Campus events | title, date, time, location, attendees |
| `media` | Images/videos | type, title, url, thumbnail, duration, category |
| `site_settings` | Global config | siteName, description, meta, language, theme |
| `about_content` | About page | title, content, multi-lang fields |
| `contact_messages` | Contact form | name, email, subject, message, readAt, archivedAt |
| `subscribers` | Newsletter | email (unique) |
| `site_visits` | Visit tracking | timestamp, visitorIdentifier |
| `article_views` | View tracking | articleId, timestamp, visitorIdentifier |
| `integration_configs` | AI/Telegram config | type, provider, providerBaseUrl, keys (encrypted), translation policy, toggles |
| `admin_users` | Admin auth | username, email, passwordHash, role, approved, isSuperAdmin, resetToken, resetTokenExpires |
| `admin_api_keys` | API credentials | name, keyHash, createdById |
| `automation_configs` | Pipeline config | keywords, AI instructions, pull/processing/translation flags |

**Multi-language support:** Core content models have optional `*Ru` and `*Uz` suffix fields alongside the default English field.

---

## 4. Authentication System

### Admin Auth
- **Custom session-based auth** (no NextAuth.js despite env vars)
- `lib/admin-auth.ts`: HMAC-SHA256 signed session tokens
- Sessions stored in HTTP-only cookies with 12-hour TTL
- Password hashing: scrypt with random salt
- Login: username/email + password → session token, plus an `approved` gate (403 if pending)
- Protected routes check `requireAdmin()` middleware
- Self-registration (`/admin/signup`) creates pending accounts; super-admins approve them at `/admin/approvals`; password reset via `resetToken`

> ⚠️ **CORRECTION (2026-07-31):** there is **no Next.js `middleware.ts`** in this project — `requireAdmin()` is called explicitly inside each handler, and it is only wired into `/api/admin/**`. `/api/frontend/**` mutations and `/api/cron/**` are **unauthenticated** (audit C1, C4). The approval gate is also bypassable through password reset (audit C2).

### API Key Auth
- `AdminApiKey` model for programmatic access
- Key prefixes + SHA-256 hashes stored
- Revocation support

---

## 5. Content Pipeline (Automation)

```
RSS Feeds → [POST /api/cron/pull]   → articles_raw
                  ↓
          [POST /api/cron/process]  → articles_processed (AI translation + categorization)
                  ↓
          Admin Review UI           → approve/edit/reject
                  ↓
          [POST /api/cron/publish]  → articles + Telegram notification
```

### Step Details:
1. **Pull:** Fetches enabled RSS sources via `lib/rss.ts`, deduplicates by `(sourceId, guid)`, saves to `ArticleRaw`
2. **Process:** Runs through `lib/ai.ts` pipeline:
   - Language detection (Cyrillic/Latin heuristic)
   - Paraphrasing/basic cleanup
   - Translation chain: OpenRouter → LibreTranslate → MyMemory → source fallback
   - Categorization via keyword scoring
   - Respects integration config flags (summarization, categorization, translation policy)
3. **Publish:** Moves approved items to `Article`, creates category links, optionally sends to Telegram

> ⚠️ **CORRECTION (2026-07-31):** "AI processing" is largely a misnomer. In `lib/ai.ts` the **only** LLM-backed step is translation. "Paraphrase" is a table of regex swaps, "summarize" is *first 8 sentences hard-truncated at 900 characters*, and "categorize" is weighted keyword regexes. Publish selects `status = "ready"` (not `"approved"` — no such status exists). See audit **H1**.

---

## 6. Integration System

### AI Integration
- Configurable provider/model/base URL (default: OpenRouter + GPT-4o-mini)
- Encrypted API key storage (AES-256-GCM)
- Fallback chain for translation
- Togglable features: summarization, categorization, translation policy (full/summary_only/disabled)

### Telegram Integration
- Bot token + channel ID stored encrypted
- `sendOnPublish` toggle for auto-publishing
- Rich message formatting with inline keyboard
- Photo support with text fallback
- Retry policy with exponential backoff

### Security Model
- Secrets encrypted via `lib/security.ts` before DB storage
- Only metadata/fingerprints returned to UI
- Dedicated secret rotation endpoint
- `fingerprintSecret()` for UI-level secret presence detection

> ⚠️ **CORRECTION (2026-07-31):** as configured today the `ai` integration is `enabled=true` **with no stored API key** and no `OPENROUTER_API_KEY` in `.env`, so every translation silently degrades to the free public endpoints or to untranslated source text. The `telegram` integration is disabled with no token and an empty channel id.

---

## 7. Frontend Architecture

### Public Site
- **Multi-language:** EN/RU/UZ with localStorage persistence
- **Dynamic homepage:** Breaking news ticker, featured articles, category blocks, media grid
- **Pages:** News listing, article detail, events, media gallery, about, contact, privacy, terms
- **Context-driven:** `GlobalContext` fetches all data from `/api/frontend/*` endpoints
- **Dark mode:** next-themes + Tailwind CSS v4 dark mode

### Admin Panel
- Dashboard with statistics cards
- Article/Event/Media CRUD
- Automation control center
- Integrations management (AI + Telegram)
- Inbox with broadcast capability
- Analytics (visits, article views)
- Settings management
- Embedded AI assistant

---

## 8. Technology Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16.1.6 (App Router) |
| **Frontend** | React 19.2.3, Tailwind CSS v4, Framer Motion |
| **Language** | TypeScript 5.x |
| **ORM** | Prisma 7.4.2 |
| **Database** | PostgreSQL (via PrismaPg adapter) |
| **Icons** | Lucide React |
| **Notifications** | Sonner |
| **HTTP** | Axios |
| **RSS** | rss-parser + Cheerio |
| **State** | React Context |
| **Auth** | Custom HMAC session tokens |
| **Crypto** | Node.js crypto (AES-256-GCM, scrypt) |
| **Email** | Resend HTTP API (`lib/mailer.ts`) |
| **CI/Deploy** | ⚠️ none — no `.github/`, no `vercel.json`, no Dockerfile, no tests (a `vercel-build` npm script exists, that is all) |

---

## 9. Configuration (.env)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Falls back for session/encryption secrets |
| `NEXTAUTH_URL` | Site URL |
| `ADMIN_USERNAME` | Default admin username |
| `ADMIN_PASSWORD` | Default admin password |
| `ADMIN_SECRET_ENCRYPTION_KEY` | For production-grade secret encryption |
| `OPENROUTER_API_KEY` | Fallback AI API key |
| `ADMIN_SESSION_SECRET` | Session signing key |
| `ADMIN_EMAIL` | Email for `npm run admin:create` |
| `AUTOMATION_CRON_SECRET` | Required header for `/api/cron/automation` (**fails open if unset**) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Outbound email (password reset, broadcasts) |
| `APP_URL` / `NEXT_PUBLIC_SITE_URL` | Public base URL for Telegram links, sitemap, OpenRouter referer |
| `OPENROUTER_TRANSLATE_MODEL` / `OPENROUTER_ASSISTANT_MODEL` | Model overrides |
| `DEMO_ADMIN_PASSWORD` | Password used by `POST /api/frontend/seed` (defaults to `Admin123!`) |

> ⚠️ **CORRECTION (2026-07-31):** the current `.env` only sets `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Everything else is unset, which means: weak derived crypto keys (audit H5), no LLM translation (H1), no outbound email, and an open `/api/cron/automation` (C4). Note `ADMIN_PASSWORD="admin"` is shorter than the 8-character minimum enforced by `scripts/create-admin.ts`, so `npm run admin:create` throws as-is.

---

## 10. Current Issues / Observations

*Status re-checked 2026-07-31. Full current issue list: [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md).*

1. ✅ **FIXED** — ~~`seed-db.js` uses `@prisma/client` import~~ — it now imports `./prisma/generated/prisma/client` with the `PrismaPg` adapter.
2. ✅ Still true — `lib/prisma.ts` correctly imports from `../prisma/generated/prisma/client` (though ~30 lines of commented-out SQLite adapter code remain).
3. ❌ **NOT DONE** — `prisma/dev.db` and `prisma/dev.db.bak` still present, plus a stray `prisma/migrations - Copy/` directory.
4. ⏳ **PARTIALLY DONE** — root-level backup/diagnostic files (`api_error.json`, `backup.json`, `client_keys.txt`, `diag_output.txt`, `*_log.txt`, `package.json.bak`, `test-pipeline.js`, `_prisma_test/`) are deleted in the working tree but **the deletions are not committed yet**.
5. 🔴 **NEW** — see audit C1–C5: unauthenticated content CRUD, self-approval privilege escalation, missing `AdminUser` migration, open cron endpoints, broken production build.

---

## 11. API Surface Summary

### Public Endpoints
- `GET /api/health` — DB health check
- `GET /api/frontend/articles` — Paginated articles
- `GET /api/frontend/categories` — List categories
- `GET /api/frontend/events` — All events
- `GET /api/frontend/media` — All media
- `POST /api/frontend/subscribers` — Subscribe
- `POST /api/frontend/visits` — Record visit
- `POST /api/frontend/contact` — Contact form

### Admin Endpoints
- `POST /api/admin/auth/login` + `/logout` — Auth
- `GET /api/admin/dashboard` — Dashboard stats
- Full CRUD for sources, articles, events, media, subscribers, messages
- `GET/PUT /api/admin/integrations` + `/secret` + `/test-message`
- `GET/POST /api/admin/assistant` — AI assistant
- `PUT /api/admin/security/password` — Change password
- `GET/POST /api/admin/security/api-keys` — Key management

### Automation Endpoints
- `POST /api/cron/pull` — Ingest RSS
- `POST /api/cron/process` — AI process
- `POST /api/cron/publish` — Publish
- `GET/PUT /api/admin/automation/settings` — Pipeline config
- `GET /api/admin/automation/raw` + `/review` — Queue views
- `POST /api/cron/automation` — Scheduler entry point (respects `fetchPeriodMinutes`)

> 🔴 **CORRECTION (2026-07-31) — the "Public Endpoints" list above is incomplete and dangerously so.** These are also public (no auth):
>
> - `POST /api/frontend/articles`, `PUT|DELETE /api/frontend/articles/[id]`
> - `POST /api/frontend/events`, `PUT|DELETE /api/frontend/events/[id]`
> - `POST /api/frontend/media`, `PUT|DELETE /api/frontend/media/[id]`
> - `POST /api/frontend/seed`
> - `POST /api/cron/pull`, `POST /api/cron/process`, `POST /api/cron/publish`, `POST /api/cron/automation`
>
> The admin UI drives content CRUD through those `frontend` routes (`lib/context.tsx:256-381`), which is why they are unguarded. See audit **C1** / **C4**.
>
> Also public by design: `POST /api/admin/auth/login|logout|signup|forgot-password|reset-password`, `GET /api/articles`, `GET /api/frontend/about|static-pages`, `POST /api/frontend/articles/view`.

### Route counts (2026-07-31)
60 route files total — 40 under `/api/admin`, 14 under `/api/frontend`, 4 under `/api/cron`, plus `/api/articles` and `/api/health`.
