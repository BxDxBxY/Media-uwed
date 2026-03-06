import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  DEFAULT_AI_CONFIG,
  DEFAULT_TELEGRAM_CONFIG,
  formatIntegrationForClient,
  normalizeIntegrationPayload,
} from "@/lib/integrations";
import { storeSecret } from "@/lib/secret-storage";
import { validateEnv } from "@/lib/env";

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
        provider: "placeholder-in-memory",
        productionReady: false,
      },
    });
  } catch (error) {
    console.error("Failed to load integrations", error);
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

    if (payload.providerApiKey) {
      await storeSecret(`${payload.integrationType.toUpperCase()}_PROVIDER_KEY`, payload.providerApiKey);
    }

    const config = await prisma.integrationConfig.upsert({
      where: { integrationType: payload.integrationType },
      update: {
        enabled: payload.enabled,
        provider: payload.provider || null,
        providerApiKey: payload.providerApiKey || null,
        channelId: payload.channelId || null,
        webhookToken: payload.webhookToken || null,
        aiSummarization: payload.aiSummarization ?? true,
        aiCategorization: payload.aiCategorization ?? true,
        translationPolicy: payload.translationPolicy ?? "full",
        retryLimit: payload.retryLimit ?? 3,
      },
      create: {
        integrationType: payload.integrationType,
        enabled: payload.enabled,
        provider: payload.provider || null,
        providerApiKey: payload.providerApiKey || null,
        channelId: payload.channelId || null,
        webhookToken: payload.webhookToken || null,
        aiSummarization: payload.aiSummarization ?? true,
        aiCategorization: payload.aiCategorization ?? true,
        translationPolicy: payload.translationPolicy ?? "full",
        retryLimit: payload.retryLimit ?? 3,
      },
    });

    return NextResponse.json({ config: formatIntegrationForClient(config) });
  } catch (error) {
    console.error("Failed to save integration config", error);
    return NextResponse.json({ error: "Failed to save integration config" }, { status: 500 });
  }
}
