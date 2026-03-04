import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import axios from "axios";

const ASSISTANT_SUBJECT = "__assistant_memory__";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";

const fallbackReply = (
  message: string,
  stats: { raw: number; review: number; ready: number; events: number; articles: number; media: number },
) => {
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
  return `I can help with the whole website: automation, events, media, articles, settings, and publishing workflow. Current queue: raw ${stats.raw}, review ${stats.review}, ready ${stats.ready}.`;
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
          temperature: 0.4,
          maxOutputTokens: 500,
        },
      },
      { timeout: 20000 },
    );

    const text =
      res.data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("\n").trim() ||
      null;

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
          take: 12,
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

    const prompt = `You are an admin assistant for a university media portal CMS.\nRespond clearly, practically, and specifically to the admin question.\n\nSite context:\n- Site name: ${settings?.siteName || "University Media Portal"}\n- Description: ${settings?.siteDescription || "N/A"}\n- Default language: ${settings?.defaultLanguage || "en"}\n- Raw queue: ${rawCount}\n- Pending review: ${reviewCount}\n- Ready to publish: ${readyCount}\n- Events: ${eventsCount}\n- Articles: ${articlesCount}\n- Media: ${mediaCount}\n\nRecent chat memory:\n${history || "(no history)"}\n\nAdmin question:\n${userMessage}`;

    const aiReply = await callGemini(prompt);
    const reply = aiReply || fallbackReply(userMessage, {
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
    });
  } catch (error) {
    console.error("Admin assistant error:", error);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
