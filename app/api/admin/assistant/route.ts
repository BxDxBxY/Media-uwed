import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import axios from "axios";

const ASSISTANT_SUBJECT = "__assistant_memory__";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_ASSISTANT_MODEL || "gemini-2.0-flash";

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

const callGemini = async (prompt: string): Promise<string | null> => {
  if (!GEMINI_API_KEY) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await axios.post(
      url,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 900,
          topP: 0.9,
        },
      },
      { timeout: 30000 },
    );

    const text =
      res.data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p?.text || "")
        .join("\n")
        .trim() || null;

    return text;
  } catch (error) {
    console.error("Gemini assistant error:", error);
    return null;
  }
};

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 40), 100);

    const memory = await prisma.contactMessage.findMany({
      where: { subject: ASSISTANT_SUBJECT },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    const messages = memory.map((item) => ({
      id: item.id,
      role: item.email === "assistant@system.local" ? "assistant" : "user",
      text: item.message,
      createdAt: item.createdAt,
    }));

    return NextResponse.json({
      messages,
      model: GEMINI_API_KEY ? GEMINI_MODEL : "local-fallback",
    });
  } catch (error) {
    console.error("Failed to fetch assistant memory", error);
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

    const [rawCount, reviewCount, readyCount, eventsCount, articlesCount, mediaCount, settings, recentMemory] =
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
      ]);

    await prisma.contactMessage.create({
      data: {
        name: "Admin User",
        email: "user@system.local",
        subject: ASSISTANT_SUBJECT,
        message: userMessage,
      },
    });

    const history = recentMemory
      .reverse()
      .map((item) => `${item.email === "assistant@system.local" ? "Assistant" : "User"}: ${item.message}`)
      .join("\n");

    const prompt = [
      "You are a real AI assistant embedded in an admin panel for a university media platform.",
      "You must answer any platform-related question: website strategy, content quality, SEO, performance, UX, automation operations, events, settings, governance, and troubleshooting.",
      "Do not say you can only help with automation. Be practical and specific.",
      "When the user asks for recommendations, provide concise action steps.",
      "When asked for status, use the live metrics below.",
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
      "",
      "Recent conversation:",
      history || "(no history)",
      "",
      "Answer in the same language as the user message when possible.",
      "If requirements are about which news should be fetched/processed, mention that admin requirements should be used during pull/process so irrelevant raw items are not shown.",
      "",
      `User message: ${userMessage}`,
    ].join("\n");

    const aiReply = await callGemini(prompt);
    const usedFallback = !aiReply;
    const reply =
      aiReply ||
      fallbackReply(userMessage, {
        raw: rawCount,
        review: reviewCount,
        ready: readyCount,
        events: eventsCount,
        articles: articlesCount,
        media: mediaCount,
      });

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
      model: GEMINI_API_KEY ? GEMINI_MODEL : "local-fallback",
      usedFallback,
      fallbackReason: usedFallback
        ? GEMINI_API_KEY
          ? "Gemini request failed. Check logs/API quota."
          : "GEMINI_API_KEY is not configured."
        : null,
    });
  } catch (error) {
    console.error("Admin assistant error:", error);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
