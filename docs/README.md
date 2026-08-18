# 📚 Media-uwed Documentation Index

**Start here: [08-AI-FREE-TIER-2026-08-01.md](08-AI-FREE-TIER-2026-08-01.md)** for the content pipeline and the public pages as they work today, and [07-HARDENING-2026-07-31.md](07-HARDENING-2026-07-31.md) for the security and build work — what was fixed, how it was verified, and §6 "what still needs a human". Read [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md) alongside them for *why* those things needed fixing.

---

## Current state in one paragraph (2026-08-01)

The audit's blocking defects are fixed and verified: content CRUD and the pipeline endpoints require authorization, the self-approval escalation path is closed, migrations reproduce the schema on a clean database, rate limiting exists, secrets are real, articles are server-rendered with full metadata, and the production build succeeds. The content pipeline has since been rebuilt around what sources actually send: the scraper no longer needs `<p>` tags (it was returning **zero** characters for every source, so the model was inventing articles from headlines), feeds that carry full text are used directly, malformed XML is repaired, and a source too thin to rewrite is skipped rather than padded out. Topical selection is now the admin's editorial brief judged by the model, batched at 40 headlines per request; the keyword-derivation it replaced did nothing at all in Cyrillic and inverted negations. Everything is metered against the free tier's 50 requests/day (~40 articles). The About page no longer publishes fabricated staff and a false founding year, and empty sections have starter content. The public pages now each carry their own metadata (all six previously shared one title and a canonical pointing at `/`), the news archive is localized, and the admin panel surfaces what a pipeline run actually did — feed failures, off-brief rejections, the model-versus-heuristics split and the remaining daily budget — with triage verdicts visible and reversible. Test coverage is 106 offline assertions — `check:ai` (27), `check:rss` (24), `check:triage` (14), `check:security` (41) — covering the pipeline and the encryption/auth primitives; nothing yet drives an HTTP route end to end. `APP_URL` is still unset, and the repository must stay on NTFS.

---

## Documents

| # | Document | Date | Status |
|---|---|---|---|
| 08 | [08-AI-FREE-TIER-2026-08-01.md](08-AI-FREE-TIER-2026-08-01.md) | 2026-08-01 | ✅ **Authoritative for the content pipeline and public pages.** Free-tier limits, model choice by measurement, RSS/scraper rewrite, topical triage from the admin's brief, the About-page fixes, and §4 the current open list |
| 07 | [07-HARDENING-2026-07-31.md](07-HARDENING-2026-07-31.md) | 2026-07-31 | ✅ **Authoritative for everything else.** What was fixed for C1–C5/H1–H8/M*, how each was verified, new files, and §6 the remaining human tasks. AI-model details superseded by `08` |
| 06 | [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md) | 2026-07-31 | ✅ Full audit — the starting state, kept unedited. Findings resolved in `07`; §9 lists what older docs got wrong |
| 01 | [01-ARCHITECTURE-ANALYSIS.md](01-ARCHITECTURE-ANALYSIS.md) | 2026-05-13 | ✅ Accurate after 2026-07-31 corrections (counts, auth model, API surface, section order fixed) |
| 02 | [02-SETUP-GUIDE.md](02-SETUP-GUIDE.md) | 2026-05-13 | ⚠️ Local setup works; deployment/build sections corrected 2026-07-31 (§8.1 + §10 known build failures) |
| 03 | [03-DATA-FLOW-ANALYSIS.md](03-DATA-FLOW-ANALYSIS.md) | 2026-05-13 | ✅ Flows accurate after corrections (publish status, open cron endpoints, admin-writes-through-public-API) |
| 04 | [04-SECURITY-ANALYSIS.md](04-SECURITY-ANALYSIS.md) | 2026-05-13 | 🚩 **Was materially wrong** — claimed "no public write endpoints". Corrected inline 2026-07-31; read `06` alongside it |
| 05 | [05-RECOMMENDATIONS.md](05-RECOMMENDATIONS.md) | 2026-05-13 | ⚠️ Backlog still useful; real blockers added as §0, per-item status added, progress log in §8 |

## Related documents outside `docs/`

| File | Date | Purpose |
|---|---|---|
| [../README.md](../README.md) | 2026-08-01 | Product/architecture overview. Status block rewritten 2026-08-01: the earlier warnings no longer apply — the pipeline does a full editorial pass rather than translation alone, and `ADMIN_SECRET_ENCRYPTION_KEY` is set |
| [../docs_audit.md](../docs_audit.md) | 2026-03-13 | First audit — performance / SEO / security / UX. SEO is largely closed (article SSR in `07` §H6, per-route metadata in `08` §2.16); **client-only listing pages and the global-context over-fetch remain open** |
| [../docs_admin_panel_fixes.md](../docs_admin_panel_fixes.md) | — | Changelog of admin/news panel fixes |
| [../SETUP_DATABASE.md](../SETUP_DATABASE.md) | — | PostgreSQL setup on Windows (pgAdmin / CLI / password reset) |
| [../FIX_BACKEND.md](../FIX_BACKEND.md) | — | Two-script recovery path via `scripts/setup/` |

---

## Scripts worth knowing about

| Command | What it does |
|---|---|
| `npm run check` | Everything offline: typecheck, lint, and the four check scripts below |
| `npm run check:ai` | 27 assertions on the editorial pass — fallback chain, JSON-mode self-healing, request caps |
| `npm run check:rss` | 24 assertions on feed ingestion, one per real-world feed shape |
| `npm run check:triage` | 14 assertions that topical triage batches its requests and fails open |
| `npm run check:security` | 41 assertions on secret encryption, password hashing and session tokens |
| `npm run check:models` | Compares models on a real queued article and prints Uzbek samples. **Spends one provider request per model.** |
| `npm run seed:sources` | Installs the default RSS source list, idempotently |
| `npm run seed:demo` | Starter content for Media, About and Events, idempotently |

## Conventions for future updates

- **Never overwrite a dated audit.** Add a new `NN-AUDIT-YYYY-MM-DD.md` and update this index.
- **When an older doc turns out to be wrong**, correct it in place with a `⚠️ CORRECTION (YYYY-MM-DD)` block rather than silently rewriting it — the delta is the useful part.
- **Log completed work** in [05-RECOMMENDATIONS.md](05-RECOMMENDATIONS.md) §8 so the next session does not re-audit solved problems.
- **State how a claim was verified.** "Build works" without a command and its output is what produced the inaccuracies corrected on 2026-07-31.
