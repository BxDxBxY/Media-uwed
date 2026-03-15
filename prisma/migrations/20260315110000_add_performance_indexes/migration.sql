-- Performance indexes for high-traffic read/query paths
CREATE INDEX IF NOT EXISTS "articles_createdAt_idx" ON "articles"("createdAt");
CREATE INDEX IF NOT EXISTS "site_visits_timestamp_idx" ON "site_visits"("timestamp");

CREATE INDEX IF NOT EXISTS "article_views_articleId_idx" ON "article_views"("articleId");
CREATE INDEX IF NOT EXISTS "article_views_timestamp_idx" ON "article_views"("timestamp");

CREATE INDEX IF NOT EXISTS "events_createdAt_idx" ON "events"("createdAt");
CREATE INDEX IF NOT EXISTS "media_createdAt_idx" ON "media"("createdAt");
CREATE INDEX IF NOT EXISTS "subscribers_createdAt_idx" ON "subscribers"("createdAt");

CREATE INDEX IF NOT EXISTS "contact_messages_archivedAt_createdAt_idx" ON "contact_messages"("archivedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "contact_messages_subject_idx" ON "contact_messages"("subject");

CREATE INDEX IF NOT EXISTS "sources_enabled_createdAt_idx" ON "sources"("enabled", "createdAt");
