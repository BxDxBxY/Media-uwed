-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "category" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "articles_raw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "publishedAt" DATETIME,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "articles_raw_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "articles_processed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rawId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'ready',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "articles_processed_rawId_fkey" FOREIGN KEY ("rawId") REFERENCES "articles_raw" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_feedUrl_key" ON "sources"("feedUrl");

-- CreateIndex
CREATE INDEX "articles_raw_sourceId_idx" ON "articles_raw"("sourceId");

-- CreateIndex
CREATE INDEX "articles_raw_publishedAt_idx" ON "articles_raw"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "articles_raw_sourceId_guid_key" ON "articles_raw"("sourceId", "guid");

-- CreateIndex
CREATE UNIQUE INDEX "articles_raw_url_key" ON "articles_raw"("url");

-- CreateIndex
CREATE UNIQUE INDEX "articles_processed_rawId_key" ON "articles_processed"("rawId");

-- CreateIndex
CREATE INDEX "articles_processed_status_idx" ON "articles_processed"("status");

-- CreateIndex
CREATE INDEX "articles_processed_createdAt_idx" ON "articles_processed"("createdAt");
