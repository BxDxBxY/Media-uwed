import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { decryptSecret } from "@/lib/security";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const body = await request.json().catch(() => ({}));
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : "✅ Telegram integration test from admin panel";

    const config = await prisma.integrationConfig.findUnique({
      where: { integrationType: "telegram" },
    });

    if (!config || !config.enabled) {
      return NextResponse.json({ error: "Telegram integration is disabled" }, { status: 400 });
    }

    const botToken = decryptSecret(config.providerApiKeyEncrypted);
    if (!botToken || !config.channelId) {
      return NextResponse.json(
        { error: "Telegram provider key and channel ID are required" },
        { status: 400 },
      );
    }

    await sendTelegramMessage({
      botToken,
      chatId: config.channelId,
      text: message,
      retries: config.retryLimit,
    });

    return NextResponse.json({ ok: true, message: "Test message sent" });
  } catch (error) {
    logger.error("Failed to send Telegram test message", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test message" },
      { status: 500 },
    );
  }
}
