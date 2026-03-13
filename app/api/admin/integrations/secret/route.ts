import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { fingerprintSecret, encryptSecret } from "@/lib/security";
import { normalizeSecretPayload } from "@/lib/integrations";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const payload = normalizeSecretPayload(await request.json());
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!payload.providerApiKey && !payload.webhookToken) {
      return NextResponse.json({ error: "No secret values provided" }, { status: 400 });
    }

    await prisma.integrationConfig.upsert({
      where: { integrationType: payload.integrationType },
      update: {
        ...(payload.providerApiKey
          ? {
              providerApiKeyEncrypted: encryptSecret(payload.providerApiKey),
              providerApiKeyHash: fingerprintSecret(payload.providerApiKey),
            }
          : {}),
        ...(payload.webhookToken
          ? { webhookTokenEncrypted: encryptSecret(payload.webhookToken) }
          : {}),
      },
      create: {
        integrationType: payload.integrationType,
        enabled: false,
        provider: payload.integrationType === "telegram" ? "telegram-bot-api" : "openrouter",
        ...(payload.providerApiKey
          ? {
              providerApiKeyEncrypted: encryptSecret(payload.providerApiKey),
              providerApiKeyHash: fingerprintSecret(payload.providerApiKey),
            }
          : {}),
        ...(payload.webhookToken ? { webhookTokenEncrypted: encryptSecret(payload.webhookToken) } : {}),
      },
    });

    logger.info("Integration secrets rotated", { integrationType: payload.integrationType });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to save integration secrets", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to save integration secrets" }, { status: 500 });
  }
}
