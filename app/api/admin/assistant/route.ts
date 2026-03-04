import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const buildGuidance = (message: string, stats: { raw: number; review: number; ready: number }) => {
  const q = message.toLowerCase();

  if (q.includes("process") || q.includes("translate")) {
    return `Use Process to convert raw RSS items into 3-language drafts. Current queue: ${stats.raw} raw, ${stats.review} in review, ${stats.ready} ready.`;
  }

  if (q.includes("publish")) {
    return `Publishing pushes only approved items. You currently have ${stats.ready} item(s) marked ready.`;
  }

  if (q.includes("source") || q.includes("rss")) {
    return "Use Feed Management on the right side: add feed URL, toggle active state, and sync to ingest fresh items.";
  }

  if (q.includes("filter") || q.includes("requirement") || q.includes("keyword")) {
    return "Set include/exclude keywords and AI instructions in Automation Requirements. Raw tab and processing both respect these filters now.";
  }

  if (q.includes("performance") || q.includes("speed") || q.includes("efficiency")) {
    return "For efficiency: keep include keywords specific, disable unused pipelines, process selected batches, and archive irrelevant review items quickly.";
  }

  return `I can help with Automation workflow, sources, processing, translations, publishing, and moderation. Live counts: raw ${stats.raw}, review ${stats.review}, ready ${stats.ready}.`;
};

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { message } = await request.json();
    const userMessage = String(message || "").trim();

    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const [rawCount, reviewCount, readyCount] = await Promise.all([
      prisma.articleRaw.count({ where: { processed: { is: null } } }),
      prisma.articleProcessed.count({ where: { status: "pending_review" } }),
      prisma.articleProcessed.count({ where: { status: "ready" } }),
    ]);

    const reply = buildGuidance(userMessage, {
      raw: rawCount,
      review: reviewCount,
      ready: readyCount,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Admin assistant error:", error);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
