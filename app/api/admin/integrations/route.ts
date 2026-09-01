import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  DEFAULT_AI_CONFIG,
  DEFAULT_TELEGRAM_CONFIG,
  formatIntegrationForClient,
  normalizeIntegrationPayload,
} from "@/lib/integrations";
import { validateEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

async function ensureDefaults() {
  await prisma.integrationConfig.upsert({
    where: { integrationType: "ai" },
    update: {},
    create: {
      integrationType: "ai",
      ...DEFAULT_AI_CONFIG,
    },
  });

  await prisma.integrationConfig.upsert({
    where: { integrationType: "telegram" },
    update: {},
    create: {
      integrationType: "telegram",
      ...DEFAULT_TELEGRAM_CONFIG,
    },
  });
}

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    await ensureDefaults();

    const configs = await prisma.integrationConfig.findMany({
      where: { integrationType: { in: ["ai", "telegram"] } },
      orderBy: { integrationType: "asc" },
    });

    return NextResponse.json({
      configs: configs.map(formatIntegrationForClient),
      envValidation: validateEnv(["DATABASE_URL"]),
      secretStorage: {
        provider: "encrypted-database-placeholder",
        productionReady: Boolean(process.env.ADMIN_SECRET_ENCRYPTION_KEY),
      },
    });
  } catch (error) {
    logger.error("Failed to load integrations", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to load integrations" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const payload = normalizeIntegrationPayload(await request.json());
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const config = await prisma.integrationConfig.upsert({
      where: { integrationType: payload.integrationType },
      update: {
        enabled: payload.enabled,
        provider: payload.provider || null,
        providerModel: payload.providerModel || null,
        providerBaseUrl: payload.providerBaseUrl || null,
        channelId: payload.channelId || null,
        sendOnPublish: payload.sendOnPublish ?? false,
        aiSummarization: payload.aiSummarization ?? true,
        aiCategorization: payload.aiCategorization ?? true,
        translationPolicy: payload.translationPolicy ?? "full",
        editorialPrompt: payload.editorialPrompt || null,
        retryLimit: payload.retryLimit ?? 3,
      },
      create: {
        integrationType: payload.integrationType,
        enabled: payload.enabled,
        provider: payload.provider || null,
        providerModel: payload.providerModel || null,
        providerBaseUrl: payload.providerBaseUrl || null,
        channelId: payload.channelId || null,
        sendOnPublish: payload.sendOnPublish ?? false,
        aiSummarization: payload.aiSummarization ?? true,
        aiCategorization: payload.aiCategorization ?? true,
        translationPolicy: payload.translationPolicy ?? "full",
        editorialPrompt: payload.editorialPrompt || null,
        retryLimit: payload.retryLimit ?? 3,
      },
    });

    logger.info("Integration config updated", {
      integrationType: payload.integrationType,
      enabled: payload.enabled,
    });

    return NextResponse.json({ config: formatIntegrationForClient(config) });
  } catch (error) {
    logger.error("Failed to save integration config", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to save integration config" }, { status: 500 });
  }
}
