# 🚀 Recommendations & Improvement Plan

> **Date:** 2026-05-13 · **Status review:** 2026-07-31  
> **Project:** Media-uwed
>
> ⚠️ **This backlog was written before the real blockers were known.** Its "Critical Fixes" section contained only two cosmetic items. The genuine blockers (unauthenticated content CRUD, privilege escalation, migration drift, broken build) are in [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md) — **work §8 of that document first**, then return here.

---

## 0. 🔴 Real Critical Fixes (added 2026-07-31)

| # | Fix | Audit ref |
|---|---|---|
| 1 | Authorize every non-GET handler under `app/api/frontend/**`; delete or gate `POST /api/frontend/seed`. Note the admin UI calls these routes (`lib/context.tsx:256-381`), so the data layer changes too. | C1 |
| 2 | Remove `approved: true` from `auth/reset-password` (line 38); gate/throttle public signup; stop deriving "dev mode" from the `Host` header in `auth/forgot-password`. | C2 |
| 3 | Generate and commit the missing `AdminUser` migration (`approved`, `resetToken`, `resetTokenExpires`, `isSuperAdmin`); dry-run `migrate deploy` on a scratch DB. | C3 |
| 4 | Require a shared secret on `cron/pull`, `cron/process`, `cron/publish`; make `cron/automation` **fail closed** when `AUTOMATION_CRON_SECRET` is unset. | C4 |
| 5 | Fix the `build` script for Windows (`cross-env`) and prove `next build` on Linux CI. | C5 |
| 6 | Commit the work — it currently sits on a **detached HEAD** at `origin/pr/11` with ~40 uncommitted files, including entire features. | §1 |

---

## 1. Original "Critical Fixes" — status

### ✅ DONE — Fix seed-db.js Import Path
~~The seed script uses `require("@prisma/client")` but the project has a custom Prisma output path.~~

**Verified 2026-07-31:** already fixed — `seed-db.js` imports `./prisma/generated/prisma/client` and builds its own `PrismaPg` adapter. Nothing to do.

### ✅ DONE — Clean Up Database Files
~~`prisma/dev.db`, `prisma/dev.db.bak` and a stray `prisma/migrations - Copy/` directory.~~

**Verified 2026-08-01:** `prisma/` now contains only `generated`, `migrations`, `schema.prisma`, `scripts`. The dead UI components (`hero-section.tsx`, `news-grid.tsx`, `comments-section.tsx`) and `lib/mock-data.ts` are gone too.

**Still open from this item:** `SiteSettings.enableComments` / `moderateComments` remain exposed in Settings and still do nothing — there is no comment model. Either implement comments or remove the toggles.

---

## 2. Performance Optimizations

> **Status 2026-07-31:** API caching ✅ done (public read endpoints send `s-maxage`/`stale-while-revalidate` and cap `limit` at 100; `swr` is a dependency). Performance indexes ✅ partly done (migration `20260315110000_add_performance_indexes`; `Article.createdAt`, `Source(enabled, createdAt)`, `ContactMessage(archivedAt, createdAt)` exist). Bundle/code-splitting and the SWR-per-route refactor ❌ not started — the global-context over-fetch (audit H7) is the dominant cost and remains unaddressed.

### Database Indexes
- ✅ **Done 2026-08-01** (migration `20260801120000_add_article_relevance`): composite index `(enabled, lastFetchedAt)` on `Source`, and `status` on `ArticleProcessed`. The same migration adds `(relevance, createdAt)` on `ArticleRaw` for the triage queue query.
- ❌ Open: full-text search index on `Article.title` / `Article.summary`. `/news` search is still `contains`, which will not scale past a few thousand articles.

### API Caching
- Add `stale-while-revalidate` headers on public endpoints
- Cache category lists (infrequently changed)
- Implement SWR-based caching for frontend data fetching

### Bundle Optimization
- Code-split admin panel (lazy load admin routes)
- Optimize image loading with next/image priority hints
- Tree-shake unused icon imports from lucide-react

---

## 3. Feature Improvements

### Content Pipeline
- **Background job queue:** Replace synchronous cron endpoints with a proper job queue (Bull/BullMQ with Redis)
- **Scheduling:** Add cron-based scheduling for automated pipeline runs
- **Bulk operations:** Batch approvals/rejections in review queue
- **Version history:** Track article edit history

### Admin Panel
- **Bulk import:** CSV/JSON article import
- **Media upload:** Add file upload support (not just URL-based)
- **Rich text editor:** Replace textarea with WYSIWYG for article content
- **Notifications:** Real-time notifications for new messages/reviews
- **Data export:** Export articles/events as CSV/PDF

### Multi-language
- **AI translation quality:** Add human review step for translations
- **Language detection:** Improve detection with ML-based approach
- **i18n routing:** Add language prefix to URLs (`/en/news`, `/ru/news`)

---

## 4. Infrastructure & DevOps

### Monitoring
- Add structured logging with request IDs
- Implement health check with detailed metrics
- Add performance monitoring (request duration, DB query times)
- Set up error tracking (Sentry)

### Deployment
- Add Dockerfile for containerized deployment
- Create docker-compose.yml with PostgreSQL + app
- Add CI/CD pipeline (GitHub Actions)
- Implement blue/green deployment strategy

### Database
- Set up automated backups
- Add connection pooling (PgBouncer)
- Implement read replicas for public endpoints
- Add database migration testing in CI

---

## 5. Security Hardening

### Short-term
- Add rate limiting on login and API endpoints
- Implement session revocation on password change
- Add CSRF tokens for admin state-changing operations
- Set strict `ADMIN_SECRET_ENCRYPTION_KEY` in production

### Long-term
- Move encryption keys to cloud KMS/HSM
- Add audit logging for all admin actions
- Implement 2FA for admin accounts
- Add IP whitelisting for admin panel
- Regular security dependency audits

---

## 6. Code Quality

### Testing
- Add unit tests for `lib/` modules (especially ai.ts, security.ts, admin-auth.ts)
- Add API integration tests (using Vitest or Jest)
- Add E2E tests with Playwright for critical flows
- Set up test coverage reporting

### TypeScript
- Remove `any` casts (currently suppressed with `eslint warn`)
- Add proper type guards for API responses
- Use Prisma generated types more consistently
- Add strict null checks

### Documentation
- Add JSDoc comments to public APIs
- Document environment variables comprehensively
- Add API reference documentation
- Create developer onboarding guide

---

## 7. Quick Wins (Implement in < 1 day)

*Status column added 2026-07-31.*

| Priority | Task | Effort | Impact | Status |
|----------|------|--------|--------|--------|
| 🔴 High | Fix seed-db.js import path | 5 min | High | ✅ done |
| 🔴 High | Remove old SQLite files | 2 min | Low | ✅ done (verified 2026-08-01) |
| 🟡 Medium | Add rate limiting to login | 30 min | High | ✅ done 2026-07-31 (`lib/rate-limit.ts`, 10/min on auth) |
| 🟡 Medium | Implement SWR caching | 1 hour | Medium | ⏳ dependency added, not used for page data |
| 🟢 Low | Add request IDs to logs | 30 min | Medium | ❌ open |
| 🟢 Low | Add health endpoint details | 15 min | Low | ✅ done (`/api/health` returns queue counts) |

### New quick wins (2026-07-31)

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 🔴 High | Delete `approved: true` from `auth/reset-password:38` | 1 min | Closes privilege escalation (C2) |
| 🔴 High | Add `requireAdmin` to `frontend` mutation handlers | ~1 h | Closes public CRUD (C1) |
| 🔴 High | `cron` secret, fail-closed | 30 min | Closes C4 |
| 🔴 High | `cross-env` in the `build` script | 5 min | Unblocks local builds (C5, partially) |
| 🟡 Medium | Remove `keyPrefix` from the AI log line (`lib/ai.ts:109`) | 2 min | Stops leaking key material (H3) |
| 🟡 Medium | Drop `"policy"`/`"sorry"` from the refusal filter (`lib/ai.ts:148-166`) | 5 min | Stops discarding valid translations (H2) |
| 🟡 Medium | Fix `newInserted` counter (`app/api/cron/pull/route.ts:110`) | 10 min | Correct pipeline metrics (M2) |
| 🟢 Low | Escape the `'` in `app/admin/forgot-password/page.tsx:54` | 1 min | Clears the only ESLint error |
| 🟢 Low | Delete dead components + `lib/mock-data.ts` + commented SQLite blocks | 20 min | Less confusion (M1, M3) |

---

## 8. Progress log

Append an entry here whenever a batch of the above is completed, so the next session can start from facts rather than re-auditing.

| Date | What changed | Verified how |
|---|---|---|
| 2026-03-13 | `docs_audit.md` — first audit (performance / SEO / security / UX) | manual review |
| 2026-05-13 | `docs/01`–`05` written | manual review |
| 2026-07-31 | Full re-audit → `docs/06-AUDIT-2026-07-31.md`; docs `01`–`05` corrected against reality (false "no public write endpoints" claim, table/model/migration counts, publish status value, build status, scrambled section order in `01`) | `tsc`, `eslint`, `next build` ×2, `prisma migrate status`/`diff`, live `curl` probes, direct SQL against `media_uwed` |
| 2026-07-31 | **Hardening: §0 critical fixes C1–C5, all of H1–H8, and M1–M11 except M4** → `docs/07-HARDENING-2026-07-31.md`. Auth on content + pipeline endpoints, escalation closed, missing migrations written, rate limiting, real secrets, LLM editorial pass, SSR/SEO for articles, assistant memory moved out of the inbox table, SSRF guard, dead code removed, CI + cron added | `tsc` clean, `eslint` 0 errors, production build on NTFS, HTTP probes for every changed endpoint, full attack-chain replay, end-to-end `runProcess()` against a stub provider, migrations replayed on a scratch database |
| 2026-08-01 | **Content pipeline rebuilt for the free tier** → `docs/08-AI-FREE-TIER-2026-08-01.md`. Scraper rewritten (it returned **0 characters for every source**, so the model was inventing articles from headlines); RSS ingestion rewritten around what feeds actually send, including full-text fields, entity decoding, image type-checking and XML repair; thin sources refuse to be padded out; model chosen by measurement; fallback chain; daily request budget metered in a new table; sources replaced with Uzbekistan/regional feeds | `npm run check` (typecheck, lint 0 errors, `check:ai` 27/27, `check:rss` 24/24), production build, migrations applied with no drift, live pipeline run on real feeds, live budget-exhaustion run against a stub provider |
| 2026-08-01 | **Editorial brief replaces keyword derivation; About page stops publishing fiction.** `deriveTermsFromInstructions` deleted — it filtered nothing in Cyrillic and inverted negations; topical triage now batches 40 headlines per request and fails open. About defaults no longer assert a founding year, a US phone number or a masthead of film characters; its config moved from `contact_messages` into `page_configs`. Empty sections seeded, homepage sections hidden when empty, missing indexes added | `check:triage` 14/14, live triage run (50 headlines → 1 request, 28 rejected with reasons), pages fetched from a running server to confirm the fabricated names are gone, `migrate status` clean at 16 migrations |
| 2026-08-01 | **Deployment fixed and two review defects closed** (PR #12). Vercel rejected the deploy twice: Hobby allows one cron run per day, and the build itself needed database access — `prisma migrate deploy` chained with `&&`, plus a prerendered `/sitemap.xml` querying Prisma. Sitemap is now dynamic and fails soft; `vercel-build` validates configuration and explains what to fix; a GitHub Actions workflow carries the 30-minute cadence. Also: `/api/cron/automation` exported only POST while Vercel Cron sends GET, the approvals migration locked out every existing admin, and the last super-admin could demote themselves | Vercel check green on `9056188`; `next build` verified to complete with an unresolvable `DATABASE_URL`; GET/POST probed against a running server (401 without the secret, 200 with it); lockout reproduced against the live database and the backfill confirmed to restore access; `npm run check` passing |
