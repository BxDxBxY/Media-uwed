# University Media Portal

A Next.js-based media portal with automated news ingestion from RSS feeds.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

```bash
# Run Prisma migrations to create SQLite database
npm run db:migrate
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the portal.

## Admin Login (Demo)

After seeding, you can log in at `/admin/login` with:

- **Username:** `admin`
- **Email:** `admin@uwed.local`
- **Password:** `Admin123!` (or value of `DEMO_ADMIN_PASSWORD` env var)

### Create the demo admin user

Run the frontend seed endpoint once (with dev server running):

```bash
curl -X POST http://localhost:3000/api/frontend/seed
```

If you want a custom password, set `DEMO_ADMIN_PASSWORD` before running the seed route.

## News Ingestion Backend

This project includes an automated news-ingestion pipeline that pulls articles from RSS feeds (BBC, CNN, Reuters, etc.) and processes them for display.

### Database Schema

- **Source**: RSS feed sources (name, feedUrl, category, enabled)
- **ArticleRaw**: Raw RSS items (deduped by guid + url)
- **ArticleProcessed**: Cleaned articles ready for frontend

### Setup & Usage

#### 1. Seed RSS Sources

```bash
# Using npm script (requires dev server running)
npm run db:seed

# Or using curl
curl -X POST http://localhost:3000/api/admin/sources/seed
```

This seeds 5 sample sources: BBC News, CNN, Reuters, TechCrunch, and The Guardian.

#### 2. Pull News from RSS Feeds

```bash
# Using npm script
npm run pull

# Or using curl
curl -X POST http://localhost:3000/api/cron/pull
```

Fetches all enabled RSS feeds and stores raw articles in the database (with deduplication).

#### 3. Process Articles

```bash
# Using npm script
npm run process

# Or using curl
curl -X POST http://localhost:3000/api/cron/process
```

Processes raw articles into clean, frontend-ready format (headline + summary).

#### 4. View Articles

```bash
# Get articles with pagination
curl "http://localhost:3000/api/articles?page=1&limit=20"
```

### API Endpoints

| Endpoint                        | Method | Description                            |
| ------------------------------- | ------ | -------------------------------------- |
| `/api/admin/sources/seed`       | POST   | Seed sample RSS sources                |
| `/api/cron/pull`                | POST   | Fetch RSS feeds and store raw articles |
| `/api/cron/process`             | POST   | Process raw articles for frontend      |
| `/api/articles?page=1&limit=20` | GET    | Get processed articles (paginated)     |
| `/api/health`                   | GET    | Health check + database stats          |

### Complete Workflow

```bash
# 1. Start dev server
npm run dev

# 2. In another terminal, run the pipeline:
npm run db:seed    # Seed sources (once)
npm run pull       # Pull news from RSS feeds
npm run process    # Process articles

# 3. View articles
curl http://localhost:3000/api/articles
```

### Features

- ✅ SQLite database with Prisma ORM
- ✅ RSS feed parsing with 15s timeout
- ✅ Deduplication by guid + url
- ✅ Concurrency control (5 feeds at a time)
- ✅ Source attribution + original URLs
- ✅ Pagination support
- ✅ Error handling & logging
- ✅ Clean summaries (240-400 chars)

### Scheduling (Production)

For production, schedule the pull and process endpoints using:

- **Vercel Cron Jobs**: Add to `vercel.json`
- **GitHub Actions**: Create workflow files
- **External Cron**: Use services like cron-job.org

Example cron schedule:

```
*/30 * * * *  # Pull every 30 minutes
*/15 * * * *  # Process every 15 minutes
```

## Frontend

The frontend is built with Next.js App Router, React 19, and Tailwind CSS v4.

- **Public Pages**: News, Events, Media, About
- **Admin Panel**: Articles, Events, Automation, Settings
- **Features**: Dark mode, multilingual (EN/UZ/RU), responsive design

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite + Prisma ORM
- **RSS Parsing**: rss-parser
- **Styling**: Tailwind CSS v4
- **UI**: Framer Motion, Lucide Icons, Sonner (toasts)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
