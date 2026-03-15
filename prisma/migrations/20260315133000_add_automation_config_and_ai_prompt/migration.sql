ALTER TABLE "integration_configs"
  ADD COLUMN IF NOT EXISTS "providerModel" TEXT,
  ADD COLUMN IF NOT EXISTS "editorialPrompt" TEXT;

CREATE TABLE IF NOT EXISTS "automation_configs" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "includeKeywords" TEXT,
  "excludeKeywords" TEXT,
  "aiInstructions" TEXT,
  "aiStrictMode" BOOLEAN NOT NULL DEFAULT false,
  "automatedPull" BOOLEAN NOT NULL DEFAULT true,
  "processing" BOOLEAN NOT NULL DEFAULT true,
  "translation" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "automation_configs_pkey" PRIMARY KEY ("id")
);
