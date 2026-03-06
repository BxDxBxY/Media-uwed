# University Media Platform

A production-style university media/news platform built with **Next.js + TypeScript + Prisma + PostgreSQL**.

This project includes:
- a public multilingual website,
- an authenticated admin control panel,
- an automated content pipeline (RSS ingest → AI processing → human review → publish),
- integration management for AI providers and Telegram,
- and an embedded admin AI assistant.

---

## 1) What this project is

This platform is designed to help a university media team:
- ingest external news feeds,
- rewrite/translate/categorize content with AI,
- review and curate drafts in admin,
- publish clean articles to the public site,
- and distribute selected published items to Telegram.

It is not just a blog UI — it is an **end-to-end editorial system** with automation + manual governance.

---

## 2) Core capabilities

## Public-facing
- News feed and article detail pages (`/news`, `/article/[slug]`).
- Events and media sections.
- Static/legal pages (about, privacy policy, terms).
- Multi-language content fields (EN/RU/UZ) in core models.

## Admin-facing
- Admin login/session auth.
- Automation dashboard:
  - pull from RSS,
  - process through AI,
  - review queue edits,
  - publish approved items.
- Source/feed management.
- Events/media/article management.
- Site settings management.
- API key + password management.
- Integrations panel (AI + Telegram).
- Embedded AI admin assistant for operational guidance.

---

## 3) Architecture overview

## Application layer
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **API pattern:** route handlers under `app/api/*`
- **UI:** React + Tailwind CSS + Lucide + Sonner

## Data layer
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Schema:** `prisma/schema.prisma`
- **Migrations:** `prisma/migrations/*`
- **Generated client:** `prisma/generated/prisma/*`

## Service layer (selected)
- `lib/rss.ts` — RSS fetching/parsing.
- `lib/scraper.ts` — article body extraction.
- `lib/ai.ts` — AI translation/paraphrase/categorization pipeline.
- `lib/telegram.ts` — Telegram send abstraction with retry policy.
- `lib/security.ts` — symmetric encryption/decryption utilities for stored integration secrets.
- `lib/integrations.ts` — integration payload normalization/defaults.
- `lib/env.ts` — env validation helper.
- `lib/logger.ts` — structured logging helper.

---

## 4) End-to-end content workflow

1. **Ingest** (`POST /api/cron/pull`)
   - Fetch enabled RSS sources.
   - Save deduplicated items into `ArticleRaw`.

2. **AI process** (`POST /api/cron/process`)
   - Optional filtering by admin requirements.
   - Language detection + paraphrase/translation.
   - AI task policy driven by integration config:
     - summarization on/off,
     - categorization on/off,
     - translation policy (`full`, `summary_only`, `disabled`).
   - Save into `ArticleProcessed` (pending review).

3. **Human review** (admin automation UI)
   - Adjust text/categories/status.

4. **Publish** (`POST /api/cron/publish`)
   - Move approved items to `Article`.
   - Persist category links.
   - Mark processed item as published.
   - If Telegram integration is enabled and `sendOnPublish=true`, send the selected/published article summary to Telegram.

---

## 5) Integrations and security model

## Integration model
`IntegrationConfig` stores per-integration operational config:
- integration type (`ai`, `telegram`),
- enabled flag,
- provider/model metadata,
- channel id,
- AI task toggles,
- translation policy,
- retry limit,
- publish-to-telegram toggle.

## Secret handling
Sensitive values are **not returned in plaintext** to the admin client:
- provider key and webhook token are encrypted server-side (`AES-256-GCM`) before persistence,
- only metadata/fingerprints are returned to UI,
- secret rotation uses dedicated endpoint (`POST /api/admin/integrations/secret`),
- plaintext secret values are never re-hydrated into browser state.

### Important production recommendation
Set:
- `ADMIN_SECRET_ENCRYPTION_KEY` (required for strong secret-at-rest guarantees),
- `OPENROUTER_API_KEY` only if you want environment-level fallback.

Without `ADMIN_SECRET_ENCRYPTION_KEY`, the app falls back to a weaker dev-oriented key derivation path and should be considered non-production.

---

## 6) AI behavior and fallback strategy

The AI path supports configurable runtime behavior:
- **Primary provider key** from admin integration secret storage,
- **Fallback** to environment `OPENROUTER_API_KEY` if configured key is missing/failing,
- translation fallback chain inside `lib/ai.ts`:
  1. OpenRouter model,
  2. LibreTranslate,
  3. MyMemory,
  4. source text fallback.

Admin assistant also uses the same idea:
- prefers configured AI integration key/model,
- falls back to env key,
- then falls back to deterministic local response mode.

---

## 7) Admin assistant scope

The assistant has platform-aware context:
- queue and publication metrics,
- site metadata/settings,
- integration state (AI/Telegram enabled status),
- recent memory stored in DB.

It can answer:
- operations/process questions,
- content workflow questions,
- platform architecture/security guidance,
- and command shortcuts (`/help`, `/tools`, `/pages`, `/status`).

---

## 8) Project structure (high-level)

- `app/` — App Router pages and API routes.
- `components/` — UI components (admin + public).
- `lib/` — reusable domain services/utilities.
- `prisma/` — schema, migrations, generated client.
- `scripts/` — utility scripts (admin creation/migration helpers).

---

## 9) API overview (selected)

## Automation
- `POST /api/cron/pull`
- `POST /api/cron/process`
- `POST /api/cron/publish`

## Integrations
- `GET /api/admin/integrations`
- `PUT /api/admin/integrations`
- `POST /api/admin/integrations/secret`
- `POST /api/admin/integrations/test-message`

## Assistant
- `GET /api/admin/assistant`
- `POST /api/admin/assistant`

---

## 10) Data model overview (selected)

- `Source` — RSS providers.
- `ArticleRaw` — ingested raw feed items.
- `ArticleProcessed` — AI-processed review queue.
- `Article` — published content.
- `Category` — taxonomy.
- `IntegrationConfig` — integration operational configuration + encrypted secret metadata.
- `AdminUser`, `AdminApiKey` — auth/credential management.
- `SiteSettings` — global configuration.

---

## 11) Operational notes for maintainers

- Keep `DATABASE_URL` pointed to PostgreSQL instance.
- Run Prisma migration deploy in production before app startup.
- Rotate AI/Telegram keys through integration secret endpoint/UI.
- Keep `ADMIN_SECRET_ENCRYPTION_KEY` in a real secret manager.
- For deeper hardening, move encryption key material into KMS/HSM and add envelope encryption.

---

## 12) Development quick start

```bash
npm install
DATABASE_URL='postgresql://USER:PASS@HOST:5432/DB' npx prisma migrate deploy
npm run dev
```

Open:
- Public: `http://localhost:3000`
- Admin: `http://localhost:3000/admin/login`

---

## 13) Tech stack summary

- Next.js 16 (App Router)
- React 19
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS v4
- Axios, Cheerio, RSS Parser
- Sonner, Lucide, Framer Motion

---

## 14) Long-term roadmap suggestions

- Move from app-level encryption key to cloud KMS-backed envelope encryption.
- Add integration audit logs (who rotated which secret and when).
- Add background job queue for publish + Telegram dispatch retries.
- Add per-provider AI routing (OpenRouter / local LLM / vendor models).
- Add observability pipeline (request IDs, traces, dashboards, SLO alerts).
