import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import axios from "axios";
import { decryptSecret } from "@/lib/security";
import { logger } from "@/lib/logger";

const ASSISTANT_SUBJECT = "__assistant_memory__";
const OPENROUTER_MODEL = process.env.OPENROUTER_ASSISTANT_MODEL || "openai/gpt-5.2";
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE || "University Media Admin";

type AssistantStats = {
  raw: number;
  review: number;
  ready: number;
  events: number;
  articles: number;
  media: number;
};

const fallbackReply = (message: string, stats: AssistantStats) => {
  const q = message.toLowerCase();
  if (q.includes("automation") || q.includes("process") || q.includes("translate")) {
    return `Automation status: ${stats.raw} raw, ${stats.review} pending review, ${stats.ready} ready to publish.`;
  }
  if (q.includes("event")) {
    return `Website currently has ${stats.events} events. You can manage titles, date/time, and photos from Admin > Events.`;
  }
  if (q.includes("website") || q.includes("overall") || q.includes("performance")) {
    return `Website overview: ${stats.articles} published articles, ${stats.media} media items, ${stats.events} events, and ${stats.raw} raw queue items waiting automation.`;
  }
  return `I can help with the whole platform (articles, events, media, automation, settings, and workflows). Current queue: raw ${stats.raw}, review ${stats.review}, ready ${stats.ready}.`;
};

const commandReply = (message: string, stats: AssistantStats) => {
  const cmd = message.trim().toLowerCase();
  if (cmd === "/help") {
    return [
      "Available commands:",
      "• /help — show assistant commands",
      "• /tools — list admin tools and capabilities",
      "• /pages — list manageable/public pages",
      "• /status — current platform queue/status snapshot",
      "You can also ask free-form questions about the whole website.",
    ].join("\n");
  }
  if (cmd === "/tools") {
    return [
      "Admin tools:",
      "• Automation: pull/process/translate/publish",
      "• Review queue: edit translations, categories, image and approve",
      "• Sources: add/enable/disable/delete RSS feeds",
      "• Events, Media, Articles management",
      "• Legal pages (privacy/terms) editor",
      "• Outreach/subscribers management",
      "• Integrations: AI + Telegram secure configuration",
    ].join("\n");
  }
  if (cmd === "/pages") {
    return [
      "Core pages:",
      "• Public: /, /news, /article/[slug], /events, /media, /privacy-policy, /terms-of-use",
      "• Admin: /admin, /admin/automation, /admin/articles, /admin/events, /admin/media, /admin/connections, /admin/privacy-policy, /admin/terms-of-use",
    ].join("\n");
  }
  if (cmd === "/status") {
    return `Status: raw=${stats.raw}, pending_review=${stats.review}, ready=${stats.ready}, published_articles=${stats.articles}, events=${stats.events}, media=${stats.media}.`;
  }
  return null;
};

const callOpenRouter = async (prompt: string, apiKey: string | null, model: string): Promise<string | null> => {
  if (!apiKey) return null;
  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        temperature: 0.35,
      },
      {
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-OpenRouter-Title": OPENROUTER_TITLE,
        },
      },
    );

    return res.data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    logger.error("OpenRouter assistant error", { status: status || "n/a" });
    return null;
  }
};

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 40), 100);

    const [memory, aiIntegration] = await Promise.all([
      prisma.contactMessage.findMany({
        where: { subject: ASSISTANT_SUBJECT },
        orderBy: { createdAt: "asc" },
        take: limit,
      }),
      prisma.integrationConfig.findUnique({ where: { integrationType: "ai" } }),
    ]);

    const messages = memory.map((item) => ({
      id: item.id,
      role: item.email === "assistant@system.local" ? "assistant" : "user",
      text: item.message,
      createdAt: item.createdAt,
    }));

    const configuredKey = decryptSecret(aiIntegration?.providerApiKeyEncrypted);
    const activeModel = configuredKey ? aiIntegration?.provider || OPENROUTER_MODEL : "local-fallback";

    return NextResponse.json({ messages, model: activeModel });
  } catch (error) {
    logger.error("Failed to fetch assistant memory", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to fetch assistant memory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { message } = await request.json();
    const userMessage = String(message || "").trim();

    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const [rawCount, reviewCount, readyCount, eventsCount, articlesCount, mediaCount, settings, recentMemory, aiIntegration, telegramIntegration] =
      await Promise.all([
        prisma.articleRaw.count({ where: { processed: { is: null } } }),
        prisma.articleProcessed.count({ where: { status: "pending_review" } }),
        prisma.articleProcessed.count({ where: { status: "ready" } }),
        prisma.event.count(),
        prisma.article.count(),
        prisma.media.count(),
        prisma.siteSettings.findUnique({ where: { id: "default" } }),
        prisma.contactMessage.findMany({
          where: { subject: ASSISTANT_SUBJECT },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.integrationConfig.findUnique({ where: { integrationType: "ai" } }),
        prisma.integrationConfig.findUnique({ where: { integrationType: "telegram" } }),
      ]);

    const stats = {
      raw: rawCount,
      review: reviewCount,
      ready: readyCount,
      events: eventsCount,
      articles: articlesCount,
      media: mediaCount,
    };

    const directCommand = commandReply(userMessage, stats);

    await prisma.contactMessage.create({
      data: {
        name: "Admin User",
        email: "user@system.local",
        subject: ASSISTANT_SUBJECT,
        message: userMessage,
      },
    });

    if (directCommand) {
      await prisma.contactMessage.create({
        data: {
          name: "Admin Assistant",
          email: "assistant@system.local",
          subject: ASSISTANT_SUBJECT,
          message: directCommand,
        },
      });

      return NextResponse.json({
        reply: directCommand,
        model: "command-router",
        usedFallback: false,
        fallbackReason: null,
      });
    }

    const history = recentMemory
      .reverse()
      .map((item) => `${item.email === "assistant@system.local" ? "Assistant" : "User"}: ${item.message}`)
      .join("\n");

    const aiKeyFromConfig = decryptSecret(aiIntegration?.providerApiKeyEncrypted);
    const assistantModel = aiIntegration?.provider || OPENROUTER_MODEL;

    const prompt = [
      "You are a senior AI operations copilot embedded in an admin panel for a university media platform.",
      "You must answer any platform-related question: strategy, editorial quality, SEO, performance, UX, data workflows, automation, events, settings, governance, integrations, and troubleshooting.",
      "Give practical action plans with priorities and tradeoffs when users ask for implementation guidance.",
      "If a question touches security, include secure-by-default recommendations.",
      "Be clear, concise, and concrete.",
      "",
      "Platform stack context:",
      "- Framework: Next.js App Router + TypeScript",
      "- ORM/DB: Prisma + PostgreSQL",
      "- Automation: RSS ingest -> AI process -> human review -> publish",
      "- Integrations: AI provider and Telegram connector with encrypted secret storage",
      "",
      "Live platform context:",
      `- Site name: ${settings?.siteName || "University Media Portal"}`,
      `- Site description: ${settings?.siteDescription || "N/A"}`,
      `- Default language: ${settings?.defaultLanguage || "en"}`,
      `- Automation raw queue: ${rawCount}`,
      `- Pending review: ${reviewCount}`,
      `- Ready to publish: ${readyCount}`,
      `- Published articles: ${articlesCount}`,
      `- Events: ${eventsCount}`,
      `- Media assets: ${mediaCount}`,
      `- AI integration enabled: ${Boolean(aiIntegration?.enabled)}`,
      `- Telegram integration enabled: ${Boolean(telegramIntegration?.enabled)}`,
      `- Telegram sendOnPublish: ${Boolean(telegramIntegration?.sendOnPublish)}`,
      "",
      "Recent conversation:",
      history || "(no history)",
      "",
      "Answer in the same language as the user message when possible.",
      "User message:",
      userMessage,
    ].join("\n");

    const openRouterReply = await callOpenRouter(prompt, aiKeyFromConfig || process.env.OPENROUTER_API_KEY || null, assistantModel);

    const usedFallback = !openRouterReply;
    const reply = openRouterReply || fallbackReply(userMessage, stats);

    await prisma.contactMessage.create({
      data: {
        name: "Admin Assistant",
        email: "assistant@system.local",
        subject: ASSISTANT_SUBJECT,
        message: reply,
      },
    });

    return NextResponse.json({
      reply,
      model: openRouterReply ? assistantModel : "local-fallback",
      usedFallback,
      fallbackReason: usedFallback
        ? aiKeyFromConfig || process.env.OPENROUTER_API_KEY
          ? "Configured AI provider request failed. Falling back to local assistant mode."
          : "No AI provider API key configured in integrations or environment."
        : null,
    });
  } catch (error) {
    logger.error("Admin assistant error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
