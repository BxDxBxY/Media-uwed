# CLAUDE.md — start here

Context for whoever (or whatever) picks this project up next. Written 2026-10-21, after the
session that produced the 22 commits on `fix/production-hardening`. It says what the project
is, where the work stopped, how to run it, and what is still open. Everything it claims was
verified by running it; where it was not, it says so.

---

## 1. What this is

A university media platform: a public trilingual news site (EN/RU/UZ) plus an authenticated
admin panel, with an automated editorial pipeline between them —
**RSS ingest → topical triage → AI editorial pass → human review → publish → Telegram**.

Next.js 16 (App Router) · TypeScript · Prisma 7 · PostgreSQL · Tailwind 4 · OpenRouter free tier.

The long-form overview is [README.md](README.md). The documentation index is
[docs/README.md](docs/README.md).

---

## 2. Where the work stopped

| | |
|---|---|
| Branch | **`master`** — everything below is on it |
| Pull request | [#12](https://github.com/BxDxBxY/Media-uwed/pull/12), **merged 2026-10-21** as `be08fd9` (23 commits, CI green) |
| Last substantive commit | `dac02c5`, 2026-09-02 — "Audit every feature against the running site, and fix what it found" |
| Working tree | clean |

`fix/production-hardening` was where all of this was written; it is now fully contained in
`master` and kept only as history. **Work from `master`.**

State of the product as of the last run against a live server:

- All of the audit's blocking defects are fixed and verified — authorization on every
  mutation, migrations that reproduce the schema from empty, rate limiting, real secrets,
  server-rendered articles with metadata, a production build that succeeds.
- The pipeline works end to end on live feeds: **20 articles processed in 75 seconds**, all
  through the model, zero heuristic fallbacks. Before that it was capped at ~4 per cron run.
- The site held **32 articles, 27 of them in all three languages**, sitemap listing 38 URLs.
- **106 offline assertions** pass (`npm run check`), plus `check:routes` (37, needs a running
  server) and `check:publish` (22, needs a database).
- Every one of the 15 admin screens and 6 public pages returned 200 in the 2026-09-02 audit.

What has *not* happened: the app has never been deployed to a real host with a real domain,
and `APP_URL` is still unset.

---

## 3. Read the docs in this order

1. **[docs/08-AI-FREE-TIER-2026-08-01.md](docs/08-AI-FREE-TIER-2026-08-01.md)** — authoritative
   for the content pipeline and the public pages. §4 is **the current open list**. §2.21 and
   §2.22 are the two full audits against the running site.
2. **[docs/07-HARDENING-2026-07-31.md](docs/07-HARDENING-2026-07-31.md)** — authoritative for
   security, auth and the build. §6 is what still needs a human.
3. **[docs/06-AUDIT-2026-07-31.md](docs/06-AUDIT-2026-07-31.md)** — the starting state, kept
   unedited, for *why* any of this was needed.
4. `01`–`05` are older and partly corrected in place; [docs/README.md](docs/README.md) grades
   each one and says which parts were materially wrong.

The git log is the other half of the record: every commit message explains the defect, the
mechanism and how the fix was verified. `git log --format='%h %s%n%b'` is worth reading.

---

## 4. Running it locally

```bash
cp .env.example .env     # then fill in DATABASE_URL and the two secrets
npm install
npm run db:migrate:dev   # applies prisma/migrations to an empty database
npm run admin:create     # upserts a super admin from ADMIN_* in .env
npm run seed:sources     # default RSS sources, idempotent
npm run seed:demo        # starter Media/About/Events content, idempotent
npm run dev              # http://localhost:3000, admin at /admin
```

PostgreSQL setup on Windows is in [SETUP_DATABASE.md](SETUP_DATABASE.md); if the backend is
broken, [FIX_BACKEND.md](FIX_BACKEND.md) has a two-script recovery path via `scripts/setup/`.

The required environment variables, and what breaks when each is missing, are documented
inline in [.env.example](.env.example). `DATABASE_URL`, `ADMIN_SESSION_SECRET` and
`ADMIN_SECRET_ENCRYPTION_KEY` are the three that matter;
**changing `ADMIN_SECRET_ENCRYPTION_KEY` makes already-stored integration secrets
undecryptable** — they have to be re-entered in Admin → Automation → Integrations.

### Checks

| Command | What it covers | Needs |
|---|---|---|
| `npm run check` | typecheck + lint + the four offline suites below — **106 assertions** | nothing |
| `npm run check:ai` | 27 — editorial pass, fallback chain, JSON-mode self-healing, request caps | nothing |
| `npm run check:rss` | 24 — feed ingestion, one per real-world feed shape | nothing |
| `npm run check:triage` | 14 — triage batches its requests and fails open | nothing |
| `npm run check:security` | 41 — secret encryption, password hashing, session tokens | nothing |
| `npm run check:publish` | 22 — the publish step, incl. no Telegram send when the integration is off | a database |
| `npm run check:routes` | 37 — every mutation, admin and cron route refuses anonymous callers | a running server |
| `npm run check:models` | compares free models on a real queued article — **spends one provider request per model** | a provider key |

Run `npm run check` before every commit. CI (`.github/workflows/ci.yml`) runs all of it.

---

## 5. The code, in the places that matter

| Path | What lives there |
|---|---|
| `lib/pipeline/` | pull → triage → process → publish, the core loop |
| `lib/ai.ts` | the provider call: model choice, fallback chain, JSON mode, deadlines, daily budget |
| `lib/admin-auth.ts` | custom session auth (NextAuth is **not** used, despite the legacy env vars) |
| `lib/secret-storage.ts` | encryption of integration secrets at rest |
| `lib/security.ts`, `lib/rate-limit.ts`, `lib/cron-auth.ts` | the primitives `check:security` covers |
| `app/api/cron/*` | `pull`, `process`, `automation` — the scheduled entry points |
| `app/admin/(protected)/automation/page.tsx` | the operator's screen, ~1700 lines (backlog item M4) |
| `scripts/*.mts` | every `check:*` and `seed:*` script |
| `.github/workflows/scheduler.yml` | the 30-minute cadence, because Vercel Hobby only allows a daily cron |

---

## 6. Operating the pipeline

- Model: `minimax/minimax-m3:free`, chosen **by measurement** (8.2s, all three languages,
  no verbatim reuse). Candidates must advertise `response_format`; the previous default did
  not and silently fell back to the weak heuristic path.
- Free tier: 50 requests/day per account, 20/minute. `AI_DAILY_REQUEST_LIMIT` defaults to 40
  and is metered in the database. $10 of credit, once, raises the cap to 1000/day.
- Processing runs a bounded worker pool (`AI_PROCESS_CONCURRENCY`, default 4, max 8) under an
  `AbortController` deadline (`AI_REQUEST_TIMEOUT_MS`, default 90s) — axios's `timeout` is an
  *inactivity* timeout and never fired.
- What gets picked up is the **editorial brief in Admin → Automation**, judged by the model in
  batches of 40 headlines. A source too thin to rewrite is skipped, never padded out.
- Articles land in `pending_review`, not published. Uzbek on free models is readable but has
  real errors ("moscva vaqti"), so every article wants an editor.

---

## 7. What is still open

The authoritative list is [docs/08](docs/08-AI-FREE-TIER-2026-08-01.md) §4. Condensed:

**Blocks a public launch**

1. **Nothing is deployed.** The code is on `master` and the build succeeds, but no host, no
   domain, no managed database — see 2 and 3.
2. **`APP_URL` / `NEXT_PUBLIC_SITE_URL` are unset** — canonical links, Open Graph, the
   sitemap, Telegram post links and password-reset emails all point at `localhost`.
3. **`DATABASE_URL` must be a managed Postgres** reachable from the deployment platform. A
   local `@localhost:5432` value cannot work in a build container; the build now fails with
   that explanation rather than a bare `P1001`.
4. **The 30-minute cadence needs two GitHub Actions secrets**, `APP_URL` and
   `AUTOMATION_CRON_SECRET`. Without them the pipeline runs once a day.

**Code backlog**

5. The listing pages (`/`, `/news`, `/events`, `/media`) still render **client-side**. Their
   per-route metadata is correct; the markup is not server-rendered. Next SEO step.
6. Metadata is one set per route, **not per language** — fixing it properly means
   language-prefixed routes (`docs/05` §3).
7. **Everything behind a route is untested except publishing.** `check:routes` covers
   authorization only; `check:publish` covers the publish step. The rest of the business
   logic has no tests.
8. `/news` search is `contains`. Fine at a few hundred articles; measure before indexing.
9. `app/admin/(protected)/automation/page.tsx` is ~1700 lines (M4).

**Content and environment**

10. **`uwed.uz` has no RSS feed** (404 on `/rss` and `/feed`), so the university's own news has
    to be entered by hand until one exists.
11. **The repository must stay on an NTFS volume.** On exFAT both bundlers break — see
    `docs/07` §C5. A stale copy still exists on the exFAT `D:` drive.

---

## 8. Things that cost time, so you do not pay twice

- **`GET /api/frontend/articles/[id]` returns 405 by design.** There is no GET handler; the
  route exists for `PUT`/`DELETE`, and the editor loads bodies via `?slug=…&full=1`.
- **Cyrillic "corruption" in shell tests is Git Bash**, not the code — it re-encodes request
  bodies before they leave the shell. Re-run with UTF-8 end to end.
- **A model returning 404 with a data-policy message** is OpenRouter → Settings → Privacy;
  there are separate toggles for free and paid models.
- **`npm run build` needs NTFS.** `npm run dev` does not care.
- **`check:publish` refuses to run** while the Telegram integration has `sendOnPublish`
  enabled, so a test article cannot reach the real channel. Leave that guard alone.

---

## 9. Conventions for this repository

- **Never overwrite a dated audit.** Add `docs/NN-AUDIT-YYYY-MM-DD.md` and update
  `docs/README.md`.
- **When an older doc turns out to be wrong**, correct it in place with a
  `⚠️ CORRECTION (YYYY-MM-DD)` block — the delta is the useful part.
- **State how a claim was verified**, with the command and its result. "Build works" with no
  evidence is what produced the inaccuracies corrected on 2026-07-31.
- **Commit messages explain the defect and its mechanism**, not the diff, and end with the
  verification that was actually run. Match the existing log.
- `.env` is gitignored and must stay that way. Scratch files from manual pipeline runs
  (`batch.log`, `*.tmp.mts`) are ignored too — do not `git add -A` them back in.
