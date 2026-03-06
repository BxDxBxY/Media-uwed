import type { IntegrationConfig } from "../prisma/generated/prisma/client";

export type IntegrationType = "ai" | "telegram";

export type IntegrationConfigPayload = {
  integrationType: IntegrationType;
  enabled: boolean;
  provider?: string;
  providerApiKey?: string;
  channelId?: string;
  webhookToken?: string;
  aiSummarization?: boolean;
  aiCategorization?: boolean;
  translationPolicy?: "full" | "summary_only" | "disabled";
  retryLimit?: number;
};

export const DEFAULT_AI_CONFIG: Omit<IntegrationConfigPayload, "integrationType"> = {
  enabled: true,
  provider: "openrouter",
  providerApiKey: "",
  aiSummarization: true,
  aiCategorization: true,
  translationPolicy: "full",
  retryLimit: 3,
};

export const DEFAULT_TELEGRAM_CONFIG: Omit<IntegrationConfigPayload, "integrationType"> = {
  enabled: false,
  provider: "telegram-bot-api",
  providerApiKey: "",
  channelId: "",
  webhookToken: "",
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
    providerApiKey: typeof body.providerApiKey === "string" ? body.providerApiKey.trim() : undefined,
    channelId: typeof body.channelId === "string" ? body.channelId.trim() : undefined,
    webhookToken: typeof body.webhookToken === "string" ? body.webhookToken.trim() : undefined,
    aiSummarization: body.aiSummarization === undefined ? true : Boolean(body.aiSummarization),
    aiCategorization: body.aiCategorization === undefined ? true : Boolean(body.aiCategorization),
    translationPolicy,
    retryLimit: typeof body.retryLimit === "number" ? Math.max(0, Math.min(10, body.retryLimit)) : 3,
  };
}

export function formatIntegrationForClient(config: IntegrationConfig) {
  return {
    integrationType: config.integrationType,
    enabled: config.enabled,
    provider: config.provider || "",
    providerApiKey: config.providerApiKey || "",
    channelId: config.channelId || "",
    webhookToken: config.webhookToken || "",
    aiSummarization: config.aiSummarization,
    aiCategorization: config.aiCategorization,
    translationPolicy: config.translationPolicy,
    retryLimit: config.retryLimit,
    updatedAt: config.updatedAt,
  };
}
