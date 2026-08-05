-- Topical triage of queued articles against the admin's editorial brief.
-- Persisted so a rejected headline is judged once rather than on every pipeline run:
-- on OpenRouter's free tier the daily request budget is the scarce resource.
ALTER TABLE "articles_raw" ADD COLUMN IF NOT EXISTS "relevance" TEXT;
ALTER TABLE "articles_raw" ADD COLUMN IF NOT EXISTS "relevanceReason" TEXT;
ALTER TABLE "articles_raw" ADD COLUMN IF NOT EXISTS "relevanceCheckedAt" TIMESTAMP(3);

-- Lets the processing step select un-judged and relevant items without a table scan.
CREATE INDEX IF NOT EXISTS "articles_raw_relevance_createdAt_idx"
  ON "articles_raw" ("relevance", "createdAt");

-- From 05-RECOMMENDATIONS.md §2: both were listed as missing.
CREATE INDEX IF NOT EXISTS "sources_enabled_lastFetchedAt_idx"
  ON "sources" ("enabled", "lastFetchedAt");
CREATE INDEX IF NOT EXISTS "articles_processed_status_idx"
  ON "articles_processed" ("status");
