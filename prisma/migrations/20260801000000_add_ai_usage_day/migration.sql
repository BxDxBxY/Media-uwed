-- Per-day counter of AI provider requests, so the free-tier quota (50 requests/day on
-- OpenRouter without purchased credit) is budgeted instead of being hit as 429s.
CREATE TABLE IF NOT EXISTS "ai_usage_days" (
    "day" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_days_pkey" PRIMARY KEY ("day")
);
