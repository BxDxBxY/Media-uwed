import { prisma } from "@/lib/prisma";
import { runProcess } from "@/lib/pipeline/process";

const rows = await prisma.articleRaw.findMany({
  where: { relevance: "relevant", processed: { is: null } },
  orderBy: { publishedAt: "desc" },
  select: { id: true, title: true, description: true, rawJson: true },
});
const ids = rows
  .filter((r) => {
    let full = "";
    try { full = JSON.parse(r.rawJson || "{}").fullContent || ""; } catch {}
    return (r.title + (r.description || "") + full).length >= 400;
  })
  .slice(0, 24)
  .map((r) => r.id);

console.log("обрабатываю", ids.length, "статей, параллельно по 4");
const t0 = Date.now();
const r = await runProcess({ ids, force: true });
console.log(`ИТОГ за ${Math.round((Date.now() - t0) / 1000)}с:`, JSON.stringify({
  processed: r.processedCount, failed: r.failedCount,
  llm: r.llmArticles, heuristic: r.heuristicArticles,
  skippedThin: r.skippedThinSource, budget: r.aiBudget,
}));
await prisma.$disconnect();
