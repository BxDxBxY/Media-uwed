/**
 * Publishes everything the pipeline has finished and a human would accept.
 * Telegram stays untouched: the integration is off, and runPublish reports it.
 */
import { prisma } from "@/lib/prisma";
import { runPublish } from "@/lib/pipeline/publish";

const ready = await prisma.articleProcessed.findMany({
  where: { status: { in: ["pending_review", "ready"] } },
  select: { id: true, headlineEn: true, summaryEn: true, contentEn: true },
  orderBy: { createdAt: "desc" },
});

// Refuse anything too thin to look like an article on the front page.
const publishable = ready.filter(
  (a) => a.headlineEn.trim().length > 15 && (a.contentEn || "").length >= 350 && a.summaryEn.trim().length > 40,
);
const tooThin = ready.length - publishable.length;

console.log(`готовы к публикации: ${ready.length}, из них достаточно полные: ${publishable.length} (отсеяно тонких: ${tooThin})`);

const r = await runPublish({ processedIds: publishable.map((a) => a.id) });
console.log("ИТОГ ПУБЛИКАЦИИ:", JSON.stringify({
  опубликовано: r.publishedCount,
  вTelegram: r.telegramSentCount,
  telegramВключён: r.telegramEnabled,
  ошибки: r.errors ?? "нет",
}));
console.log("всего статей на сайте:", await prisma.article.count());
await prisma.$disconnect();
