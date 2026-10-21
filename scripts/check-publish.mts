/**
 * Behaviour checks for the publish step — `npm run check:publish`.
 *
 * Publishing is the one action with consequences outside the database: it puts an article on
 * the public site and, when the Telegram integration is on, broadcasts it to the
 * university's channel. Nothing tested it.
 *
 * Needs a database (it creates a throwaway source, queue item and review item, publishes
 * them, asserts, and deletes everything it made in a `finally`). It is therefore not part of
 * `npm run check`.
 *
 * **Safety rule this script enforces on itself:** if the Telegram integration is enabled
 * with `sendOnPublish`, it refuses to run rather than risk posting a test article to a real
 * channel. A test that can spam a public channel is not worth having.
 */
import { prisma } from "@/lib/prisma";
import { runPublish } from "@/lib/pipeline/publish";

const MARKER = "zzz-publish-check";

const checks: Array<[string, boolean, string]> = [];
const check = (name: string, ok: boolean, detail = "") => checks.push([name, ok, detail]);

// --- refuse to run if a real broadcast could happen ----------------------------------
const telegram = await prisma.integrationConfig.findUnique({ where: { integrationType: "telegram" } });
if (telegram?.enabled && telegram?.sendOnPublish) {
  console.error(
    "Refusing to run: the Telegram integration is enabled with sendOnPublish, so publishing a\n" +
      "test article would post it to the configured channel. Disable sendOnPublish first.",
  );
  await prisma.$disconnect();
  process.exit(2);
}

let sourceId: string | null = null;

try {
  // --- arrange: a queue item ready for review, in all three languages ---------------
  const source = await prisma.source.create({
    data: { name: `${MARKER} source`, feedUrl: `https://example.invalid/${MARKER}.xml`, category: "Economy", enabled: false },
  });
  sourceId = source.id;

  const raw = await prisma.articleRaw.create({
    data: {
      sourceId: source.id,
      guid: `${MARKER}-guid`,
      url: "https://example.invalid/article?utm_source=tracking#fragment",
      title: "Source headline",
      description: "Source teaser",
      author: "Source Author",
      imageUrl: "https://example.invalid/photo.jpg",
    },
  });

  const processed = await prisma.articleProcessed.create({
    data: {
      rawId: raw.id,
      headlineEn: `${MARKER} English headline`,
      headlineRu: "Русский заголовок",
      headlineUz: "Uzbek sarlavha",
      summaryEn: "English summary.",
      summaryRu: "Русское резюме.",
      summaryUz: "Uzbek xulosa.",
      contentEn: "English body paragraph.",
      contentRu: "Русский текст.",
      contentUz: "Uzbek matni.",
      // "News" must be dropped; Economy must survive.
      categories: "News, Economy",
      status: "ready",
    },
  });

  // --- act ---------------------------------------------------------------------------
  const result = await runPublish({ processedIds: [processed.id] });

  check("publishes the requested item", result.publishedCount === 1, `published ${result.publishedCount}`);
  check("sends nothing to Telegram when the integration is off", result.telegramSentCount === 0, `sent ${result.telegramSentCount}`);
  check("reports Telegram as disabled", result.telegramEnabled === false, String(result.telegramEnabled));
  check("reports no errors", !result.errors, JSON.stringify(result.errors ?? []));

  const article = await prisma.article.findFirst({
    where: { title: { contains: MARKER } },
    include: { categories: true },
  });

  check("creates the public article", Boolean(article));

  if (article) {
    check("carries the Russian title", article.titleRu === "Русский заголовок");
    check("carries the Uzbek title", article.titleUz === "Uzbek sarlavha");
    check("carries the Russian summary", article.summaryRu === "Русское резюме.");
    check("carries the Uzbek body", (article.contentUz || "").startsWith("Uzbek matni."));

    // Attribution is not optional: the pipeline rewrites someone else's reporting.
    check("appends the original source link", (article.content || "").includes("Original source:"));
    check("source link names the outlet", (article.content || "").includes(`${MARKER} source`));
    // Tracking parameters and fragments must not be republished.
    check(
      "strips tracking parameters from the source URL",
      (article.content || "").includes("https://example.invalid/article)") &&
        !(article.content || "").includes("utm_source"),
    );

    check("slug is url-safe", /^[a-z0-9-]+$/.test(article.slug), article.slug);
    check("slug derives from the headline", article.slug.startsWith("zzz-publish-check"), article.slug);

    const names = article.categories.map((c) => c.name);
    check("keeps the real category", names.includes("Economy"), names.join(","));
    check("drops the generic 'News' category", !names.includes("News"), names.join(","));

    check("takes the image from the feed item", article.image === "https://example.invalid/photo.jpg");
    check("attributes the author", article.author === "Source Author");
  }

  const after = await prisma.articleProcessed.findUnique({ where: { id: processed.id } });
  check("marks the review item as published", after?.status === "published", String(after?.status));

  // --- publishing twice must not duplicate ------------------------------------------
  const second = await runPublish({ processedIds: [processed.id] });
  check("does not publish the same item twice", second.publishedCount === 0, `published ${second.publishedCount}`);

  const copies = await prisma.article.count({ where: { title: { contains: MARKER } } });
  check("exactly one public article exists", copies === 1, `found ${copies}`);
} finally {
  // --- clean up everything this script created --------------------------------------
  const removedArticles = await prisma.article.deleteMany({ where: { title: { contains: MARKER } } });
  if (sourceId) {
    // ArticleRaw and ArticleProcessed cascade from the source.
    await prisma.source.delete({ where: { id: sourceId } }).catch(() => {});
  }
  const leftovers = await prisma.article.count({ where: { title: { contains: MARKER } } });
  const leftoverSources = await prisma.source.count({ where: { name: { contains: MARKER } } });
  check("cleans up after itself", leftovers === 0 && leftoverSources === 0, `${leftovers} articles, ${leftoverSources} sources left`);
  console.log(`(removed ${removedArticles.count} test article(s))\n`);
}

console.log("--- publish behaviour ---");
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (${detail})`}`);
}
const passed = checks.filter(([, ok]) => ok).length;
console.log(`\n${passed}/${checks.length} passed`);

await prisma.$disconnect();
process.exit(passed === checks.length ? 0 : 1);
