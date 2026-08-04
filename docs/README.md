# 📚 Media-uwed Documentation Index

**Start here: [08-AI-FREE-TIER-2026-08-01.md](08-AI-FREE-TIER-2026-08-01.md)** for the AI pipeline as it runs today, and [07-HARDENING-2026-07-31.md](07-HARDENING-2026-07-31.md) for everything else — what was fixed, how it was verified, and §6 "what still needs a human". Read [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md) alongside them for *why* those things needed fixing.

---

## Current state in one paragraph (2026-08-01)

The audit's blocking defects are fixed and verified: content CRUD and the pipeline endpoints require authorization, the self-approval escalation path is closed, migrations reproduce the schema on a clean database, rate limiting exists, secrets are real, articles are server-rendered with full metadata, and the production build succeeds. The pipeline was proven end-to-end against a stub AI provider: one model call per article producing EN/RU/UZ output awaiting human review. The AI path now targets OpenRouter's **free tier** — free-model defaults, a fallback chain, and a metered daily request budget (50 requests/day on an account with no credit, so roughly 40 articles/day) — see `08`. The exFAT build blocker is resolved by working from `C:\Dev\Media\Media-uwed` on NTFS; a copy still exists on the exFAT `D:` volume, where `npm run build` cannot work. What remains is configuration, not code — the AI provider key, `APP_URL`, email credentials, the cron secret in the host environment. There is still no test suite beyond `npm run check:ai` (27 assertions) and `npm run check:models`.

---

## Documents

| # | Document | Date | Status |
|---|---|---|---|
| 08 | [08-AI-FREE-TIER-2026-08-01.md](08-AI-FREE-TIER-2026-08-01.md) | 2026-08-01 | ✅ **Authoritative for the AI pipeline.** Free-tier limits, model defaults and fallback chain, daily request budget, and §4 what still needs a human |
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
| [../README.md](../README.md) | — | Product/architecture overview. ⚠️ Overstates the AI pipeline (only translation uses an LLM) and the secret-handling guarantees (no `ADMIN_SECRET_ENCRYPTION_KEY` is set) |
| [../docs_audit.md](../docs_audit.md) | 2026-03-13 | First audit — performance / SEO / security / UX. Its top findings (client-only rendering, over-fetching, SEO gaps) are **still open** |
| [../docs_admin_panel_fixes.md](../docs_admin_panel_fixes.md) | — | Changelog of admin/news panel fixes |
| [../SETUP_DATABASE.md](../SETUP_DATABASE.md) | — | PostgreSQL setup on Windows (pgAdmin / CLI / password reset) |
| [../FIX_BACKEND.md](../FIX_BACKEND.md) | — | Two-script recovery path via `scripts/setup/` |

---

## Conventions for future updates

- **Never overwrite a dated audit.** Add a new `NN-AUDIT-YYYY-MM-DD.md` and update this index.
- **When an older doc turns out to be wrong**, correct it in place with a `⚠️ CORRECTION (YYYY-MM-DD)` block rather than silently rewriting it — the delta is the useful part.
- **Log completed work** in [05-RECOMMENDATIONS.md](05-RECOMMENDATIONS.md) §8 so the next session does not re-audit solved problems.
- **State how a claim was verified.** "Build works" without a command and its output is what produced the inaccuracies corrected on 2026-07-31.
