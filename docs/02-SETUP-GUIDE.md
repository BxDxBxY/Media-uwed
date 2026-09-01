# 🔧 Complete Setup & Deployment Guide

> **Date:** 2026-05-13 · **Re-verified:** 2026-07-31  
> **Environment:** Windows (PowerShell), Node 22.22.0, PostgreSQL 16
>
> ⚠️ The local-development path in this guide still works. The **deployment** claims do not — `npm run build` is broken on Windows and the production build fails with both bundlers. See §10 and [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md) **C5**.
>
> 🔴 **Do not expose this application to the internet in its current state** — unauthenticated content CRUD and a self-approval path to admin exist (audit **C1**, **C2**).

---

## 1. Prerequisites

- **Node.js** >= 20 (v22.22.0 detected ✓)
- **npm** >= 10 (v10.9.4 detected ✓)
- **PostgreSQL** 16 installed and running
- Git (for version control)

---

## 2. Environment Configuration

Create/update `.env` in project root:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/media_uwed?schema=public"

# NextAuth
NEXTAUTH_SECRET="development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Admin credentials
ADMIN_USERNAME="admin"
ADMIN_EMAIL="admin@university.edu"
ADMIN_PASSWORD="admin"
```

**Current status:** ✅ `.env` is already configured with these values (2026-07-31: confirmed — exactly these six keys, nothing else).

> ⚠️ **CORRECTION (2026-07-31):** this minimal `.env` is fine for a first run but leaves the app materially degraded and insecure:
> - No `ADMIN_SESSION_SECRET` / `ADMIN_SECRET_ENCRYPTION_KEY` → session HMAC **and** integration-secret encryption both derive from the literal `"development-secret-change-in-production"` (audit H5).
> - No `OPENROUTER_API_KEY` and no key stored in the AI integration → translations fall back to free public endpoints (audit H1).
> - No `RESEND_API_KEY` / `RESEND_FROM_EMAIL` → password-reset emails cannot be sent; the reset link is only printed to the server console.
> - No `AUTOMATION_CRON_SECRET` → `/api/cron/automation` accepts anonymous calls (audit C4).
> - `ADMIN_PASSWORD="admin"` is < 8 chars, so `npm run admin:create` **throws**. Set a longer password before running it.
>
> For production also set `APP_URL` / `NEXT_PUBLIC_SITE_URL` (Telegram links and `sitemap.ts` depend on them). Full variable list: [01-ARCHITECTURE-ANALYSIS.md](01-ARCHITECTURE-ANALYSIS.md) §9.

---

## 3. Database Setup

### Step 3.1: Verify PostgreSQL is Running

```powershell
# Service check
Get-Service postgresql-x64-16

# Connection check - PostgreSQL 16 is installed at C:\Program Files\PostgreSQL\16
C:\Program Files\PostgreSQL\16\bin\pg_isready -h localhost
```

**Status:** ✅ PostgreSQL is running and accepting connections.

### Step 3.2: Create Database

```powershell
# Check if database exists
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\16\bin\psql' -U postgres -h localhost -l

# Create database (if needed)
& 'C:\Program Files\PostgreSQL\16\bin\psql' -U postgres -h localhost -c "CREATE DATABASE media_uwed;"
```

**Status:** ✅ Database `media_uwed` exists with **19 tables** (2026-07-31; the guide previously said 20 — `admin_broadcast_logs` was dropped by migration 11).

### Step 3.3: Fix PostgreSQL Password (if auth fails)

If `password authentication failed` occurs, run as **Administrator**:

```powershell
.\fix-postgres.ps1
```

This script temporarily enables trust auth, resets the password to `postgres`, creates the database, then restores secure auth.

---

## 4. Prisma Generation & Migrations

### Step 4.1: Generate Prisma Client

```powershell
# Generate client from schema
npm run db:generate
# or
npx prisma generate
```

The client is generated at `prisma/generated/prisma/` (custom output path defined by the `generator client` block in `prisma/schema.prisma`; `prisma.config.ts` supplies the schema path and datasource URL).

### Step 4.2: Run Migrations

```powershell
# Apply all pending migrations
npx prisma migrate deploy
```

This applies **11** migration files to create the **19** tables.

> 🔴 **CORRECTION (2026-07-31) — a fresh `migrate deploy` produces a schema the code cannot use.** `prisma/schema.prisma` declares `AdminUser.approved`, `resetToken`, `resetTokenExpires`, `isSuperAdmin`, but **no migration creates those columns** (they were applied locally with `prisma db push`). On a clean database, login / the `(protected)` layout / signup / approvals / password reset all fail with "column does not exist".
>
> Before deploying anywhere, generate and commit the missing migration:
>
> ```powershell
> npx prisma migrate dev --create-only -n add_admin_approval_and_reset
> # review the generated SQL, then:
> npx prisma migrate deploy
> ```
>
> **Detecting this class of drift** (verified on 2026-07-31, Prisma 7.4):
>
> - `npx prisma migrate status` → reports **"Database schema is up to date!"** and is therefore *useless* for this — it only compares applied migrations against the migrations folder, never against `schema.prisma`.
> - `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` → reports **"No difference detected"**, because the local DB was brought in line with `db push`. Useful to check *your DB vs schema*, not *migrations vs schema*.
> - `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma` is the check you actually want, but it needs a shadow database. In Prisma 7 the `--shadow-database-url` flag is **rejected as unknown** even though the error message suggests it — set `datasource.shadowDatabaseUrl` in `prisma.config.ts` instead.
> - Quickest reliable check, no shadow DB needed:
>
>   ```bash
>   grep -rl "approved\|isSuperAdmin\|resetToken" prisma/migrations/   # empty output = the columns are missing
>   ```
>
> See audit **C3**.

### Step 4.3: Verify Database Schema

```powershell
# List all tables
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\16\bin\psql' -U postgres -h localhost -d media_uwed -c '\dt'
```

Expected output shows 19 tables including `articles`, `events`, `categories`, `sources`, `articles_raw`, `articles_processed`, `admin_users`, `integration_configs`, etc. (plus `_ArticleToCategory` and `_prisma_migrations`).

---

## 5. Seed Database

```powershell
# Seed with sample data
node seed-db.js
```

This creates:
- 5 sample articles (various categories)
- 4 sample events

> ✅ **UPDATE (2026-07-31):** the import problem described here is **already fixed** — `seed-db.js` imports `./prisma/generated/prisma/client` and constructs `PrismaPg` itself. No action needed.
>
> Note there are three separate seeding paths, which is worth consolidating: `node seed-db.js` (content), `POST /api/admin/sources/seed` (RSS sources, admin-only), and `POST /api/frontend/seed` (content **+ an admin user with password `Admin123!`** — unauthenticated, see audit C1; do not leave it deployed).

---

## 6. Run the Development Server

```powershell
npm run dev
```

The server starts at **http://localhost:3000**

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate:dev` | Create dev migration |
| `npm run db:migrate:prod` | Deploy migrations |
| `npm run admin:create` | Create admin user (CLI) |

---

## 7. Verify the Setup

### Health Check
Navigate to: **http://localhost:3000/api/health**

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "counts": { ... },
  "timestamp": "2026-05-13T..."
}
```

### Homepage
- **http://localhost:3000** — Public homepage with sample data

### Admin Panel
- **http://localhost:3000/admin/login** — Login page
- Credentials: username `admin`, password: `admin` (set in .env)
- Dashboard with statistics and management tools

> ⚠️ **CORRECTION (2026-07-31):** those credentials are **unverified**. The `.env` values are only used by `npm run admin:create` / `seed-db.js` at creation time; the existing `admin_users` row (`admin` / `admin@university.edu`, `approved=true`, `isSuperAdmin=true`) stores a scrypt hash whose plaintext was not re-checked in this audit. If login fails, set `ADMIN_PASSWORD` to something ≥ 8 characters and re-run `npm run admin:create` — it upserts by email and will reset the hash.

---

## 8. Complete Setup Checklist

*Re-verified 2026-07-31.*

| Item | Status |
|------|--------|
| Node.js >= 20 | ✅ v22.22.0 |
| npm | ✅ v10.9.4 |
| PostgreSQL 16 service running | ✅ RUNNING |
| Database `media_uwed` exists | ✅ |
| All 19 tables created | ✅ |
| Prisma client generated | ✅ |
| Seed data loaded | ✅ 7 articles, 4 events, 4 sources, 236 raw items |
| Dev server starts | ✅ `npx next dev --webpack` |
| Health endpoint responds | ✅ `{"status":"healthy","database":"connected"}` |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint .` | ⚠️ 1 error, 112 warnings |
| Admin login works | ❔ not re-verified — see the credential note in §7 |
| **Production build** | ❌ **fails** — see §10 "Build Errors" |
| Tests / CI | ❌ none exist |
| Migrations cover the schema | ❌ `AdminUser` columns missing — audit C3 |

---

## 8.1 Deployment readiness (added 2026-07-31)

| Requirement | Status |
|---|---|
| `npm run build` succeeds | ❌ broken on Windows (POSIX env-var syntax in the script) |
| `next build` succeeds | ❌ fails with both `--webpack` and Turbopack on Windows — **not yet tested on Linux** |
| Migrations reproduce the schema | ❌ audit C3 |
| Content endpoints authorized | ❌ audit C1 |
| Admin registration gated | ❌ audit C2 |
| Cron endpoints authorized | ❌ audit C4 |
| Strong secrets configured | ❌ audit H5 |
| Scheduler wired | ❌ `lastScheduledRunAt` is `NULL`; no `vercel.json` cron and no external trigger |
| Per-article SEO metadata | ❌ audit H6 |

**Conclusion: not deployable yet.** Work the phased list in [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md) §8.

---

## 9. Troubleshooting

### PostgreSQL Connection Issues
```powershell
# Check PostgreSQL service
Get-Service postgresql-x64-16

# Test connection
& 'C:\Program Files\PostgreSQL\16\bin\pg_isready' -h localhost

# Check user authentication
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\16\bin\psql' -U postgres -h localhost -d postgres -c 'SELECT 1;'
```

### Prisma Client Issues
```powershell
# Regenerate client
npx prisma generate

# Reset database (CAUTION: loses all data)
npx prisma migrate reset --force
```

### Build Errors

Generic cache/dependency reset:

```powershell
# Clean Next.js cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Clean npm cache
npm cache clean --force

# Reinstall dependencies
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

#### 🔴 Known build failures (2026-07-31) — none of these are fixed by the reset above

**1. `npm run build` dies instantly**

```
'DATABASE_URL' is not recognized as an internal or external command
```

The script is `DATABASE_URL=${DATABASE_URL:-...} prisma generate && next build --webpack` — POSIX-only syntax. Workaround until the script is fixed with `cross-env`:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/media_uwed?schema=public"
npx prisma generate
npx next build --webpack
```

**2. `next build --webpack` fails**

```
Error: EISDIR: illegal operation on a directory, readlink 'D:\...\app\api\admin\<varies>\route.ts'
```

The path named in the error changes between runs (`admin/about`, `admin/auth/reset-password`, …), which points to a filesystem/worker race, not a source defect. Reproduced on a clean `.next`. Unresolved.

**3. `next build` (Turbopack) fails**

```
failed to write .next\server\chunks\[externals]_node:buffer_00e2e67a._.js.map
Caused by: The filename, directory name, or volume label syntax is incorrect. (os error 123)
```

Windows forbids `:` in filenames and the chunk name contains `node:buffer`. This is why `--webpack` was pinned in the npm script.

**Net effect:** no production artifact can be built on this Windows machine, so `npm start` is unusable locally. `npx next dev --webpack` is unaffected and works. **Next action:** run `next build` on a Linux runner (CI or WSL) to establish whether this is purely a Windows problem. See audit **C5**.
