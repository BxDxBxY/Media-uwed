CREATE TABLE "integration_configs" (
  "id" TEXT NOT NULL,
  "integrationType" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "provider" TEXT,
  "providerApiKey" TEXT,
  "channelId" TEXT,
  "webhookToken" TEXT,
  "aiSummarization" BOOLEAN NOT NULL DEFAULT true,
  "aiCategorization" BOOLEAN NOT NULL DEFAULT true,
  "translationPolicy" TEXT NOT NULL DEFAULT 'full',
  "retryLimit" INTEGER NOT NULL DEFAULT 3,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_configs_integrationType_key" ON "integration_configs"("integrationType");
