import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import axios from "axios";
import { decryptSecret } from "@/lib/security";
import { logger } from "@/lib/logger";
import { runPublish } from "@/lib/pipeline/publish";
import {
  consumePendingToolAction,
  findPendingToolAction,
  getRecentAssistantMessages,
  queueToolAction,
  saveAssistantMessage,
  type PendingToolAction,
  type ToolActionType,
} from "@/lib/assistant-memory";

const OPENROUTER_MODEL = process.env.OPENROUTER_ASSISTANT_MODEL || "openai/gpt-4o-mini";
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE || "University Media Admin";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

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
      "• /tool publish <review_item_id> — queue publish action (requires /confirm <token>)",
      "• /tool delete <article_id_or_slug> — queue delete action (requires /confirm <token>)",
      "• /confirm <token> — confirm a pending tool action",
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
      "• Assistant safe actions: publish/delete with confirmation token",
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

function normalizeModel(input: string | null | undefined): string {
  const candidate = String(input || "").trim();
  if (!candidate) return OPENROUTER_MODEL;
  if (!/^[a-z0-9._/-]+$/i.test(candidate)) return OPENROUTER_MODEL;
  return candidate;
}

function sanitizeMessages(messages: Array<{ role: string; content: string }>) {
  return messages
    .filter((m) => ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content.trim() }))
    .filter((m) => m.content.length > 0)
    .slice(-20);
}

const callOpenRouter = async (
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  apiKey: string | null,
  model: string,
  providerBaseUrl?: string,
): Promise<string | null> => {
  const sanitized = sanitizeMessages(messages);
  const baseUrl = (providerBaseUrl || "").trim() || "https://openrouter.ai/api/v1";
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1") || url.includes("192.168.") || url.includes("::1");
  const safeKey = (apiKey || "").trim() || (isLocal ? "local-model" : "");
  if (!safeKey || sanitized.length === 0) return null;

  try {
    logger.info("Assistant AI request", {
      endpoint: url,
      model,
      messageCount: sanitized.length,
      hasApiKey: Boolean(safeKey),
    });

    const res = await axios.post(
      url,
      {
        model,
        messages: sanitized,
        temperature: 0.2,
      },
      {
        timeout: 30_000,
        headers: {
          Authorization: `Bearer ${safeKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-OpenRouter-Title": OPENROUTER_TITLE,
        },
      },
    );

    return res.data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error("OpenRouter assistant error", {
        status: error.response?.status || "n/a",
        body: error.response?.data || null,
        message: error.message,
        endpoint: OPENROUTER_ENDPOINT,
      });
    } else {
      logger.error("OpenRouter assistant unknown error", { error: String(error) });
    }
    return null;
  }
};

function parseToolAction(message: string): { type: ToolActionType; target: string } | null {
  const normalized = message.trim();
  const publishMatch = normalized.match(/^\/tool\s+publish\s+(.+)$/i);
  if (publishMatch) return { type: "publish", target: publishMatch[1].trim() };

  const deleteMatch = normalized.match(/^\/tool\s+delete\s+(.+)$/i);
  if (deleteMatch) return { type: "delete", target: deleteMatch[1].trim() };

  return null;
}

function parseConfirmToken(message: string): string | null {
  const match = message.trim().match(/^\/confirm\s+([a-z0-9]{6,16})$/i);
  return match ? match[1].toLowerCase() : null;
}

async function executeToolAction(action: PendingToolAction) {
  if (action.type === "delete") {
    const article = await prisma.article.findFirst({
      where: {
        OR: [{ id: action.target }, { slug: action.target }],
      },
    });

    if (!article) return `Delete failed: article '${action.target}' not found.`;

    await prisma.article.delete({ where: { id: article.id } });
    return `✅ Deleted article '${article.title}' (${article.id}).`;
  }

  const processed = await prisma.articleProcessed.findFirst({
    where: {
      OR: [{ id: action.target }, { rawId: action.target }],
    },
  });

  if (!processed) return `Publish failed: review item '${action.target}' not found.`;

  logger.info("Assistant tool publish execute", { processedId: processed.id });

  try {
    const data = await runPublish({ processedIds: [processed.id] });
    return `✅ Publish completed for '${processed.id}'. Result: published=${data?.publishedCount ?? 0}, telegram=${data?.telegramSentCount ?? 0}.`;
  } catch (error) {
    return `Publish failed for '${processed.id}': ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 40), 100);

    const [memory, aiIntegration] = await Promise.all([
      prisma.assistantMemory.findMany({
        where: { kind: "message" },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.integrationConfig.findUnique({ where: { integrationType: "ai" } }),
    ]);

    // Newest-first from the DB (so `take` keeps the most recent), oldest-first for the UI.
    const messages = memory.reverse().map((item) => ({
      id: item.id,
      role: item.role === "assistant" ? "assistant" : "user",
      text: item.content,
      createdAt: item.createdAt,
    }));

    const configuredKey = decryptSecret(aiIntegration?.providerApiKeyEncrypted);
    const activeModel = configuredKey ? normalizeModel(aiIntegration?.providerModel) : "local-fallback";

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
        getRecentAssistantMessages(20),
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

    await saveAssistantMessage("user", userMessage);

    const toolAction = parseToolAction(userMessage);
    if (toolAction) {
      const token = await queueToolAction(toolAction.type, toolAction.target);
      const reply = `Pending '${toolAction.type}' action for '${toolAction.target}'. Confirm with: /confirm ${token}`;
      await saveAssistantMessage("assistant", reply);
      return NextResponse.json({ reply, model: "tool-router", usedFallback: false, fallbackReason: null });
    }

    const confirmToken = parseConfirmToken(userMessage);
    if (confirmToken) {
      const pending = await findPendingToolAction(confirmToken);
      if (!pending) {
        const reply = "No pending action found for this token (expired, unknown, or already used).";
        await saveAssistantMessage("assistant", reply);
        return NextResponse.json({ reply, model: "tool-router", usedFallback: false, fallbackReason: null });
      }

      // Burn the token *before* executing, so a replayed /confirm cannot run a
      // destructive action twice.
      const claimed = await consumePendingToolAction(confirmToken);
      if (!claimed) {
        const reply = "That confirmation token has already been used.";
        await saveAssistantMessage("assistant", reply);
        return NextResponse.json({ reply, model: "tool-router", usedFallback: false, fallbackReason: null });
      }

      const result = await executeToolAction(pending);
      await saveAssistantMessage("assistant", result);
      return NextResponse.json({ reply: result, model: "tool-router", usedFallback: false, fallbackReason: null });
    }

    const directCommand = commandReply(userMessage, stats);
    if (directCommand) {
      await saveAssistantMessage("assistant", directCommand);
      return NextResponse.json({
        reply: directCommand,
        model: "command-router",
        usedFallback: false,
        fallbackReason: null,
      });
    }

    // Already oldest-first from getRecentAssistantMessages().
    const history = recentMemory
      .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.content}`)
      .join("\n");

    const aiKeyFromConfig = decryptSecret(aiIntegration?.providerApiKeyEncrypted);
    const assistantModel = normalizeModel(aiIntegration?.providerModel || OPENROUTER_MODEL);

    const systemPrompt = [
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
    ].join("\n");

    const openRouterReply = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      aiKeyFromConfig || process.env.OPENROUTER_API_KEY || null,
      assistantModel,
      (aiIntegration as any)?.providerBaseUrl || undefined,
    );

    const usedFallback = !openRouterReply;
    const reply = openRouterReply || fallbackReply(userMessage, stats);

    await saveAssistantMessage("assistant", reply);

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
