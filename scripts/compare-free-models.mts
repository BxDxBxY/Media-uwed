/**
 * Compares AI models on a real queued article — `npm run check:models [model,model,…]`.
 *
 * The point is choosing the default on evidence rather than on reputation: free models
 * differ enormously at Uzbek, and Uzbek is what gets published under the university's
 * name. For each model it reports whether the editorial pass succeeded, how much of each
 * language came back, whether the language is actually the requested one, and how much
 * of the source survived verbatim (a rewrite that copies the source is plagiarism, which
 * is the reason this pipeline exists).
 *
 * Spends one provider request per model and records them against the daily budget, so
 * running it costs real quota: 4 models is 4 of the free tier's 50 requests/day.
 *
 * Requires a provider key — either `OPENROUTER_API_KEY` in `.env`, or a key stored in
 * Admin → Automation → Integrations.
 */
import { prisma } from "@/lib/prisma";
import { scrapeArticleDetails } from "@/lib/scraper";
import { decryptSecret } from "@/lib/security";
import { recordAiRequests } from "@/lib/ai-usage";
import {
  DEFAULT_AI_MODEL,
  DEFAULT_FALLBACK_MODELS,
  detectSourceLanguage,
  parseModelList,
  processNewsAI,
} from "@/lib/ai";

const candidates = (() => {
  const fromArgs = parseModelList(process.argv.slice(2).join(","));
  return fromArgs.length > 0 ? fromArgs : [DEFAULT_AI_MODEL, ...DEFAULT_FALLBACK_MODELS];
})();

const aiIntegration = await prisma.integrationConfig.findUnique({
  where: { integrationType: "ai" },
});
const apiKey =
  (decryptSecret(aiIntegration?.providerApiKeyEncrypted) || "").trim() ||
  (process.env.OPENROUTER_API_KEY || "").trim();

if (!apiKey) {
  console.error(
    "No provider key found. Put OPENROUTER_API_KEY in .env, or store a key in\n" +
      "Admin → Automation → Integrations, then run this again.",
  );
  process.exit(1);
}

// Prefer a queued article with a scraped body — a headline-only item cannot show whether
// a model keeps paragraphs or truncates them.
const queued = await prisma.articleRaw.findMany({
  orderBy: { createdAt: "desc" },
  take: 40,
  select: { id: true, title: true, description: true, rawJson: true, url: true },
});

const scored = queued
  .map((raw) => {
    let fullContent = "";
    try {
      const parsed = raw.rawJson ? JSON.parse(raw.rawJson) : {};
      fullContent = typeof parsed.fullContent === "string" ? parsed.fullContent : "";
    } catch {
      fullContent = "";
    }
    return { ...raw, fullContent };
  })
  .sort((a, b) => b.fullContent.length - a.fullContent.length);

const withBody = scored[0];

if (!withBody) {
  console.error("No articles in the queue. Run a pull first (Admin → Automation).");
  process.exit(1);
}

// Bodies are only stored when an article is processed, so most of the queue holds just a
// headline. Comparing models on a headline measures how much they invent, not how well
// they rewrite — scrape a body first.
if (withBody.fullContent.length < 400) {
  console.log("Queued articles have no stored body; scraping candidates…");

  for (const candidate of scored.slice(0, 8)) {
    try {
      const details = await scrapeArticleDetails(candidate.url);
      if ((details.content || "").length >= 400) {
        withBody.id = candidate.id;
        withBody.title = candidate.title;
        withBody.description = candidate.description;
        withBody.url = candidate.url;
        withBody.fullContent = details.content || "";
        break;
      }
    } catch {
      // try the next article
    }
  }

  if (withBody.fullContent.length < 400) {
    console.error(
      "Could not scrape a body from any queued article. The comparison would only measure\n" +
        "how much each model invents from a headline, so it is not worth the quota.",
    );
    process.exit(1);
  }
}

const sourceLanguage = detectSourceLanguage(
  `${withBody.title}\n${withBody.description || ""}\n${withBody.fullContent}`,
);

console.log("Test article");
console.log(`  title:  ${withBody.title}`);
console.log(`  body:   ${withBody.fullContent.length} chars`);
console.log(`  source: ${sourceLanguage}`);
console.log(`\nCandidates (1 request each): ${candidates.join(", ")}\n`);

const cyrillicRatio = (text: string) => {
  const letters = (text.match(/\p{L}/gu) || []).length;
  if (!letters) return 0;
  return (text.match(/[Ѐ-ӿ]/g) || []).length / letters;
};

/** Uzbek markers that Russian and English text will not contain. */
const looksUzbek = (text: string) =>
  /[ʻʼgʻoʻ]/.test(text) || /\b(va|uchun|bilan|ning|hamda|boʻyicha|deb)\b/i.test(text);

/**
 * Longest run of consecutive source words reproduced verbatim. A genuine rewrite lands
 * in the single digits; copy-paste with light edits shows 15+.
 */
const longestVerbatimRun = (source: string, output: string): number => {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const sourceWords = norm(source);
  const outputText = ` ${norm(output).join(" ")} `;

  let best = 0;
  for (let start = 0; start < sourceWords.length; start++) {
    let length = best + 1;
    while (start + length <= sourceWords.length) {
      const phrase = ` ${sourceWords.slice(start, start + length).join(" ")} `;
      if (!outputText.includes(phrase)) break;
      best = length;
      length++;
    }
  }
  return best;
};

const sourceText = `${withBody.title} ${withBody.description || ""} ${withBody.fullContent}`;
const rows: string[][] = [];

for (const model of candidates) {
  let requests = 0;
  let producedBy: string | null = null;
  const startedAt = process.hrtime.bigint();

  const result = await processNewsAI(
    withBody.title,
    withBody.description || "",
    sourceLanguage,
    withBody.fullContent,
    {
      providerApiKey: apiKey,
      providerBaseUrl: (aiIntegration as { providerBaseUrl?: string } | null)?.providerBaseUrl || undefined,
      providerModel: model,
      // No fallbacks: the point is to measure this model, not to be rescued by another.
      fallbackModels: [],
      maxProviderRequests: 2,
      editorialPrompt: aiIntegration?.editorialPrompt || undefined,
      translationPolicy: "full",
      onProviderRequest: () => {
        requests++;
      },
      onEditorialOutcome: ({ model: usedModel }) => {
        producedBy = usedModel;
      },
    },
  );

  const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
  await recordAiRequests(requests);

  // Output from the heuristic fallback is a failure for this model: its Uzbek is a free
  // machine translation of a regex paraphrase, not a rewrite.
  const succeeded = producedBy !== null;

  if (!result || !succeeded) {
    rows.push([
      model,
      result ? "heuristics" : "FAILED",
      `${requests} req`,
      `${seconds.toFixed(1)}s`,
      "—",
      "—",
      "—",
      "—",
    ]);
    console.log(`\n✗ ${model}: the editorial pass failed (see the error above)`);
    continue;
  }

  const uzOk = looksUzbek(result.contentUz) && cyrillicRatio(result.contentUz) < 0.1;
  const ruOk = cyrillicRatio(result.contentRu) > 0.5;
  const enOk = cyrillicRatio(result.contentEn) < 0.05;
  const verbatim = longestVerbatimRun(sourceText, result.contentEn || result.contentRu || "");
  const paragraphs = (result.contentUz || "").split(/\n\s*\n/).filter(Boolean).length;

  rows.push([
    model,
    "ok",
    `${requests} req`,
    `${seconds.toFixed(1)}s`,
    `${enOk ? "✓" : "✗"} ${result.contentEn.length}`,
    `${ruOk ? "✓" : "✗"} ${result.contentRu.length}`,
    `${uzOk ? "✓" : "✗"} ${result.contentUz.length}`,
    `${verbatim}w / ${paragraphs}¶`,
  ]);

  console.log(`\n=== ${model} ===`);
  console.log(`categories: ${result.categories.join(", ")}`);
  console.log(`EN  ${result.headlineEn}`);
  console.log(`RU  ${result.headlineRu}`);
  console.log(`UZ  ${result.headlineUz}`);
  console.log(`UZ summary: ${result.summaryUz}`);
  console.log(`UZ body (first 400): ${(result.contentUz || "").slice(0, 400)}`);
}

console.log("\n\n--- comparison ---");
const header = ["model", "result", "cost", "time", "EN chars", "RU chars", "UZ chars", "verbatim/paras"];
const widths = header.map((_, i) =>
  Math.max(header[i].length, ...rows.map((row) => (row[i] || "").length)),
);
const line = (cells: string[]) => cells.map((cell, i) => (cell || "").padEnd(widths[i])).join("  ");

console.log(line(header));
console.log(widths.map((w) => "-".repeat(w)).join("  "));
for (const row of rows) console.log(line(row));

console.log(
  "\n`verbatim` is the longest run of source words reproduced word-for-word: single " +
    "digits is a real rewrite, 15+ means the model copied the source.\n" +
    "Read the Uzbek samples above before deciding — the length and script checks cannot " +
    "tell fluent Uzbek from clumsy Uzbek.",
);

await prisma.$disconnect();
