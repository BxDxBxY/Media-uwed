ALTER TABLE "integration_configs"
  RENAME COLUMN "providerApiKey" TO "providerApiKeyEncrypted";

ALTER TABLE "integration_configs"
  RENAME COLUMN "webhookToken" TO "webhookTokenEncrypted";

ALTER TABLE "integration_configs"
  ADD COLUMN "providerApiKeyHash" TEXT,
  ADD COLUMN "sendOnPublish" BOOLEAN NOT NULL DEFAULT false;
