import type { IntegrationConfig } from "../prisma/generated/prisma/client";

export type IntegrationType = "ai" | "telegram";

export type IntegrationConfigPayload = {
  integrationType: IntegrationType;
  enabled: boolean;
  provider?: string;
  providerModel?: string;
  channelId?: string;
  sendOnPublish?: boolean;
  aiSummarization?: boolean;
  aiCategorization?: boolean;
  translationPolicy?: "full" | "summary_only" | "disabled";
  retryLimit?: number;
  editorialPrompt?: string;
};

export type IntegrationSecretPayload = {
  integrationType: IntegrationType;
  providerApiKey?: string;
  webhookToken?: string;
};

export const DEFAULT_AI_CONFIG: Omit<IntegrationConfigPayload, "integrationType"> = {
  enabled: true,
  provider: "openrouter",
  providerModel: "openai/gpt-4o-mini",
  aiSummarization: true,
  aiCategorization: true,
  translationPolicy: "full",
  retryLimit: 3,
};

export const DEFAULT_TELEGRAM_CONFIG: Omit<IntegrationConfigPayload, "integrationType"> = {
  enabled: false,
  provider: "telegram-bot-api",
  channelId: "",
  sendOnPublish: false,
  retryLimit: 3,
};

export function normalizeIntegrationPayload(input: unknown): IntegrationConfigPayload | null {
  const body = (input ?? {}) as Record<string, unknown>;
  if (body.integrationType !== "ai" && body.integrationType !== "telegram") {
    return null;
  }

  const translationPolicy =
    body.translationPolicy === "summary_only" || body.translationPolicy === "disabled"
      ? body.translationPolicy
      : "full";

  return {
    integrationType: body.integrationType,
    enabled: Boolean(body.enabled),
    provider: typeof body.provider === "string" ? body.provider.trim() : undefined,
    providerModel: typeof body.providerModel === "string" ? body.providerModel.trim() : undefined,
    channelId: typeof body.channelId === "string" ? body.channelId.trim() : undefined,
    sendOnPublish: Boolean(body.sendOnPublish),
    aiSummarization: body.aiSummarization === undefined ? true : Boolean(body.aiSummarization),
    aiCategorization: body.aiCategorization === undefined ? true : Boolean(body.aiCategorization),
    translationPolicy,
    retryLimit: typeof body.retryLimit === "number" ? Math.max(0, Math.min(10, body.retryLimit)) : 3,
    editorialPrompt: typeof body.editorialPrompt === "string" ? body.editorialPrompt.trim() : undefined,
  };
}

export function normalizeSecretPayload(input: unknown): IntegrationSecretPayload | null {
  const body = (input ?? {}) as Record<string, unknown>;
  if (body.integrationType !== "ai" && body.integrationType !== "telegram") return null;

  return {
    integrationType: body.integrationType,
    providerApiKey:
      typeof body.providerApiKey === "string" && body.providerApiKey.trim()
        ? body.providerApiKey.trim()
        : undefined,
    webhookToken:
      typeof body.webhookToken === "string" && body.webhookToken.trim() ? body.webhookToken.trim() : undefined,
  };
}

export function formatIntegrationForClient(config: IntegrationConfig) {
  return {
    integrationType: config.integrationType,
    enabled: config.enabled,
    provider: config.provider || "",
    providerModel: config.providerModel || "",
    channelId: config.channelId || "",
    sendOnPublish: config.sendOnPublish,
    aiSummarization: config.aiSummarization,
    aiCategorization: config.aiCategorization,
    translationPolicy: config.translationPolicy,
    retryLimit: config.retryLimit,
    editorialPrompt: config.editorialPrompt || "",
    hasProviderApiKey: Boolean(config.providerApiKeyEncrypted),
    hasWebhookToken: Boolean(config.webhookTokenEncrypted),
    secretFingerprint: config.providerApiKeyHash || null,
    updatedAt: config.updatedAt,
  };
}
