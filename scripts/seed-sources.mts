/**
 * Installs the default RSS source list — `npm run seed:sources`.
 *
 * Idempotent: matches on `feedUrl`, updates what changed, and never deletes a source the
 * editors added by hand. Sources that should no longer run are disabled rather than
 * removed, so their already-ingested articles keep their foreign key and can be
 * re-enabled from Admin → Automation with one click.
 *
 * Every feed below was probed on 2026-08-01 and the notes record what it actually
 * returns, because that determines how much work the pipeline has to do per article:
 * a feed carrying `content:encoded` needs no scraping at all, while a headline-only feed
 * needs a successful scrape or the article is skipped as unrewritable.
 */
import { prisma } from "@/lib/prisma";

type SeedSource = {
  name: string;
  feedUrl: string;
  category: string;
  enabled: boolean;
  /** What the feed actually returned when probed, and why it is in or out. */
  note: string;
};

const SOURCES: SeedSource[] = [
  {
    name: "UzA — O'zbekiston Milliy axborot agentligi (RU)",
    feedUrl: "https://uza.uz/ru/rss",
    category: "Uzbekistan",
    enabled: true,
    note: "20 items, 17 with a real teaser, 7 carrying full article text, all 20 with images.",
  },
  {
    name: "UzA — O'zbekiston Milliy axborot agentligi (UZ)",
    feedUrl: "https://uza.uz/uz/rss",
    category: "Uzbekistan",
    enabled: true,
    note: "Uzbek-language twin of the above; 8 items carried full text.",
  },
  {
    name: "UzDaily (EN)",
    feedUrl: "https://www.uzdaily.uz/en/rss",
    category: "Economy",
    enabled: true,
    note: "English-language business and economy; 20/20 teasers and images.",
  },
  {
    name: "Spot.uz — business (RU)",
    feedUrl: "https://www.spot.uz/ru/rss/",
    category: "Economy",
    enabled: true,
    note: "Business and technology in Uzbekistan; 20/20 teasers and images.",
  },
  {
    name: "Gazeta.uz (RU)",
    feedUrl: "https://www.gazeta.uz/ru/rss/",
    category: "Uzbekistan",
    enabled: true,
    note: "Teaser only, entities inside CDATA, image in a typeless enclosure. Body scrapes cleanly.",
  },
  {
    name: "Gazeta.uz (UZ)",
    feedUrl: "https://www.gazeta.uz/uz/rss/",
    category: "Uzbekistan",
    enabled: true,
    note: "Uzbek-language twin; 20/20 teasers and images.",
  },
  {
    name: "Times of Central Asia (EN)",
    feedUrl: "https://timesca.com/feed/",
    category: "World",
    enabled: true,
    note: "Regional diplomacy in English; all 10 items ship full text via content:encoded.",
  },
  {
    name: "Kun.uz (UZ)",
    feedUrl: "https://kun.uz/news/rss",
    category: "Uzbekistan",
    enabled: true,
    note: "15 items with teasers, no images. The /ru twin emits invalid XML and is repaired on parse.",
  },

  // Disabled: kept so their existing articles stay linked and an editor can re-enable them.
  {
    name: "RIA Novosti (RU)",
    feedUrl: "https://ria.ru/export/rss2/archive/index.xml",
    category: "World News",
    enabled: false,
    note: "Headline-only feed about Russian domestic politics — off-topic for a university masthead.",
  },
  {
    name: "TASS - World (RU)",
    feedUrl: "https://tass.ru/rss/v2.xml",
    category: "World News",
    enabled: false,
    note: "One-sentence teasers and article pages that return a 1.5 KB bot-block shell, so bodies cannot be scraped.",
  },
  {
    name: "Reuters - Science",
    feedUrl: "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
    category: "Science",
    enabled: false,
    note: "HTTP 404 — the feed no longer exists.",
  },
];

let created = 0;
let updated = 0;

for (const source of SOURCES) {
  const existing = await prisma.source.findUnique({ where: { feedUrl: source.feedUrl } });

  if (existing) {
    await prisma.source.update({
      where: { feedUrl: source.feedUrl },
      data: { name: source.name, category: source.category, enabled: source.enabled },
    });
    updated++;
  } else {
    await prisma.source.create({
      data: {
        name: source.name,
        feedUrl: source.feedUrl,
        category: source.category,
        enabled: source.enabled,
      },
    });
    created++;
  }

  console.log(`${source.enabled ? "on " : "off"}  ${source.name}\n     ${source.note}`);
}

const total = await prisma.source.count();
const active = await prisma.source.count({ where: { enabled: true } });
console.log(`\n${created} created, ${updated} updated. ${active} enabled of ${total} total.`);

await prisma.$disconnect();
