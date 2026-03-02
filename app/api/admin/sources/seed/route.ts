import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const SAMPLE_SOURCES = [
  {
    name: "K1News (RU)",
    feedUrl: "http://k1news.ru/rss-yandex.php",
    category: "General News",
  },
  {
    name: "TASS - World (RU)",
    feedUrl: "https://tass.ru/rss/v2.xml",
    category: "World News",
  },
  {
    name: "RIA Novosti (RU)",
    feedUrl: "https://ria.ru/export/rss2/archive/index.xml",
    category: "Top Stories",
  },
  {
    name: "Gazeta.uz (UZ/RU)",
    feedUrl: "https://www.gazeta.uz/ru/rss/",
    category: "Local News",
  },
  {
    name: "Reuters - Science",
    feedUrl:
      "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
    category: "Science",
  },
];

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    // Check if sources already exist
    const existingCount = await prisma.source.count();

    if (existingCount > 0) {
      return NextResponse.json({
        seeded: 0,
        message: "Sources already exist. Skipping seed.",
        existingCount,
      });
    }

    // Seed sources
    let seededCount = 0;
    for (const s of SAMPLE_SOURCES) {
      try {
        await prisma.source.upsert({
          where: { feedUrl: s.feedUrl },
          update: {},
          create: s,
        });
        seededCount++;
      } catch (e) {
        console.error(`Failed to seed ${s.name}:`, e);
      }
    }

    const allSources = await prisma.source.findMany();

    return NextResponse.json({
      seeded: seededCount,
      sources: allSources,
      message: `Successfully seeded ${seededCount} RSS sources`,
    });
  } catch (error) {
    console.error("Error seeding sources:", error);
    return NextResponse.json(
      {
        error: "Failed to seed sources",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
