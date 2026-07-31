import axios from "axios";
import { polishText } from "@/lib/text-clean";
import { logger } from "@/lib/logger";

export interface ProcessedNews {
  headlineEn: string;
  headlineRu: string;
  headlineUz: string;
  summaryEn: string;
  summaryRu: string;
  summaryUz: string;
  contentEn: string;
  contentRu: string;
  contentUz: string;
  categories: string[];
}



export type AiTaskConfig = {
  summarizationEnabled?: boolean;
  categorizationEnabled?: boolean;
  translationPolicy?: "full" | "summary_only" | "disabled";
  providerApiKey?: string;
  providerModel?: string;
  providerBaseUrl?: string;
  editorialPrompt?: string;
};
// Free/no-auth translation endpoints (may rate-limit sometimes)
const LIBRETRANSLATE_URL = "https://libretranslate.de/translate"; // public instance
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

const MAX_TRANSLATE_CHARS = 450;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_TRANSLATE_MODEL || "openai/gpt-4o-mini";
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE || "University Media AI";

function chunkText(input: string, limit: number = MAX_TRANSLATE_CHARS): string[] {
  const text = cleanText(input);
  if (!text) return [];
  if (text.length <= limit) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!sentence) continue;

    if (sentence.length > limit) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }

      for (let i = 0; i < sentence.length; i += limit) {
        chunks.push(sentence.slice(i, i + limit).trim());
      }
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > limit) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}



async function translateWithOpenRouterChunk(
  chunk: string,
  source: "en" | "ru" | "uz",
  target: "en" | "ru" | "uz",
  apiKey: string | null,
  model: string,
  editorialPrompt?: string,
  providerBaseUrl?: string,
): Promise<string | null> {
  const baseUrl = (providerBaseUrl || "").trim() || "https://openrouter.ai/api/v1";
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1") || url.includes("192.168.") || url.includes("::1");
  const safeKey = (apiKey || "").trim() || (isLocal ? "local-model" : "");
  if (!safeKey) {
    logger.debug("No AI provider key configured; skipping LLM call and using fallback translators");
    return null;
  }

  try {
    const prompt = [
      "You are a professional news translator and editor.",
      `Translate the text from ${source} to ${target}.`,
      "Return only translated text with no markdown, no explanations, no extra labels.",
      "Keep names, numbers, and factual meaning accurate.",
      editorialPrompt ? `Editorial instructions from admin: ${editorialPrompt}` : null,
      "Input:",
      chunk,
    ].filter(Boolean).join("\n");

    // Never log key material, not even a prefix.
    logger.debug("AI translate request", { url, hasKey: Boolean(safeKey), model });

    const res = await axios.post(
      url,
      {
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        stream: false,
      },
      {
        timeout: 25_000,
        headers: {
          Authorization: `Bearer ${safeKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-OpenRouter-Title": OPENROUTER_TITLE,
        },
      },
    );

    const out = res.data?.choices?.[0]?.message?.content?.trim() || "";
    if (!out || isRefusalLike(out)) return null;

    return cleanText(out);
  } catch (error: unknown) {
    // Response headers can carry credentials/rate-limit tokens — do not log them.
    if (axios.isAxiosError(error)) {
      logger.error("AI translation request failed", {
        status: error.response?.status ?? null,
        data: typeof error.response?.data === "string"
          ? error.response.data.slice(0, 500)
          : error.response?.data ?? null,
        message: error.message,
      });
    } else {
      logger.error("AI translation request failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}
function cleanText(s: string) {
  return polishText((s || "").replace(/\s+/g, " "));
}

/**
 * Detects a model refusal ("I can't help with that") so it is not published as if it
 * were a translation.
 *
 * Deliberately narrow. An earlier version rejected any output containing the
 * substrings `policy` or `sorry`, which for a news platform threw away large numbers
 * of perfectly good translations (any article mentioning government policy) and
 * silently downgraded them to a free translation service.
 *
 * Rules that keep false positives near zero:
 *  - only the opening of the text is inspected — a refusal never starts with the
 *    translated article and then apologises;
 *  - patterns require a first-person refusal ("I cannot …"), not a bare keyword;
 *  - long outputs are trusted: a refusal is short, an article is not.
 */
function isRefusalLike(text: string): boolean {
  const normalized = cleanText(text).toLowerCase();
  if (!normalized) return false;

  // A real refusal is short. Anything article-length is content, not a refusal.
  if (normalized.length > 400) return false;

  const opening = normalized.slice(0, 160);

  return [
    /^i(?:'m| am)? ?(?:'m )?sorry\b/,
    /^(?:i am|i'm) (?:sorry|unable|not able)\b/,
    /\bi (?:can(?:'|no)?t|cannot|won't|will not) (?:help|assist|comply|fulfill|fulfil|provide|translate|complete)\b/,
    /\bunable to (?:assist|help|comply|complete that)\b/,
    /\bas an ai (?:language )?model\b/,
    /\b(?:violates|against) (?:our|my|the) (?:content )?(?:policy|policies|guidelines)\b/,
  ].some((pattern) => pattern.test(opening));
}


export function detectSourceLanguage(input: string): "en" | "ru" | "uz" {
  const text = cleanText(input).toLowerCase();
  if (!text) return "en";

  const cyrillicCount = (text.match(/[а-яё]/gi) || []).length;
  const latinCount = (text.match(/[a-z]/gi) || []).length;

  if (cyrillicCount > latinCount * 0.25) return "ru";

  // Uzbek latin-specific letters / common tokens
  if (/[ʻʼ’ʻ]/.test(text) || /\bo['’`]z\b|\bham\b|\buchun\b|\bva\b/.test(text)) {
    return "uz";
  }

  return "en";
}

/**
 * Simple paraphrase (no AI):
 * - cleans whitespace
 * - removes common boilerplate
 * - applies light safe rewrites
 */
function paraphraseBasic(text: string): string {
  let t = cleanText(text);

  t = t.replace(/^read more[:\-]?\s*/i, "");
  t = t.replace(/^watch[:\-]?\s*/i, "");
  t = t.replace(/\s*\.\.\.\s*$/, ".");
  t = t.replace(/\s{2,}/g, " ").trim();

  const swaps: Array<[RegExp, string]> = [
    [/\baccording to\b/gi, "based on"],
    [/\breportedly\b/gi, ""],
    [/\bin order to\b/gi, "to"],
    [/\bdue to the fact that\b/gi, "because"],
    [/\bhas announced\b/gi, "announced"],
    [/\bhas stated\b/gi, "said"],
    [/\bsaid that\b/gi, "said"],
    [/\bapproximately\b/gi, "about"],
    [/\bnevertheless\b/gi, "however"],
  ];

  for (const [re, rep] of swaps) t = t.replace(re, rep);

  t = t.replace(/\s{2,}/g, " ").trim();
  if (t && !/[.!?]$/.test(t)) t += ".";
  return t;
}

/**
 * Translation pipeline:
 * 1) OpenRouter (if API key configured)
 * 2) LibreTranslate
 * 3) MyMemory
 * Returns original text if translation fails.
 */
async function translate(
  text: string,
  source: "en" | "ru" | "uz",
  target: "en" | "ru" | "uz",
  options?: { providerApiKey?: string; providerModel?: string; editorialPrompt?: string; providerBaseUrl?: string },
) {
  const q = cleanText(text);
  if (!q) return "";
  if (source === target) return q;

  const chunks = chunkText(q);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    let translatedChunk = "";

    translatedChunk =
      (await translateWithOpenRouterChunk(
        chunk,
        source,
        target,
        options?.providerApiKey || OPENROUTER_API_KEY || null,
        options?.providerModel || OPENROUTER_MODEL,
        options?.editorialPrompt,
        options?.providerBaseUrl,
      )) || "";

    // 2) LibreTranslate
    if (!translatedChunk) {
      try {
        const res = await axios.post(
          LIBRETRANSLATE_URL,
          { q: chunk, source, target, format: "text" },
          { timeout: 20_000 },
        );
        const out = res.data?.translatedText;
        if (typeof out === "string" && out.trim()) {
          translatedChunk = cleanText(out);
        }
      } catch {
        // ignore, fallback below
      }
    }

    // 3) MyMemory
    if (!translatedChunk) {
      try {
        const url =
          `${MYMEMORY_URL}?q=${encodeURIComponent(chunk)}` +
          `&langpair=${encodeURIComponent(source)}|${encodeURIComponent(target)}`;
        const res = await axios.get(url, { timeout: 20_000 });
        const out = res.data?.responseData?.translatedText;
        if (typeof out === "string" && out.trim()) {
          translatedChunk = cleanText(out);
        }
      } catch {
        // ignore
      }
    }

    translatedChunks.push(translatedChunk || chunk);
  }

  return cleanText(translatedChunks.join(" "));
}

async function translateWithPivot(
  text: string,
  source: "en" | "ru" | "uz",
  target: "en" | "ru" | "uz",
  options?: { providerApiKey?: string; providerModel?: string; editorialPrompt?: string; providerBaseUrl?: string },
): Promise<string> {
  const primary = await translate(text, source, target, options);
  const normalizedSource = cleanText(text);

  if (target === source || !normalizedSource) return primary;

  const unchanged = cleanText(primary).toLowerCase() === normalizedSource.toLowerCase();
  if (!unchanged || source === "en" || target === "en") return primary;

  const pivot = await translate(text, source, "en", options);
  if (!pivot || cleanText(pivot).toLowerCase() === normalizedSource.toLowerCase()) return primary;

  const pivoted = await translate(pivot, "en", target, options);
  return cleanText(pivoted) || primary;
}


/**
 * Extractive fallback summariser (used only when no LLM is available).
 *
 * `maxSentences`/`maxChars` are parameters because the same helper produces both the
 * short summary and the article body; clamping a body to 900 characters — as this did
 * for every field — published visibly truncated articles.
 */
function summarizeToTwoParagraphs(text: string, maxSentences = 8, maxChars = 900): string {
  const cleaned = cleanText(text);
  if (!cleaned) return "";

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const selected = sentences.slice(0, maxSentences).join(" ");
  const capped =
    selected.length > maxChars ? `${selected.slice(0, maxChars - 3).trim()}...` : selected;

  const midpoint = Math.ceil(capped.length / 2);
  const splitAt = capped.indexOf(". ", midpoint);
  if (splitAt > 0 && splitAt < capped.length - 3) {
    return `${capped.slice(0, splitAt + 1).trim()}\n\n${capped.slice(splitAt + 2).trim()}`;
  }

  return capped;
}

function detectCategories(title: string, description: string): string[] {
  const text = cleanText(`${title}. ${description}`.toLowerCase());

  const rules: Array<{ category: string; weight: number; pattern: RegExp }> = [
    { category: "War in Iran", weight: 5, pattern: /\biran|tehran|isfahan|israel-iran|iranian military|iran strike\b/ },
    { category: "Ukraine", weight: 5, pattern: /\bukraine|kyiv|kiev|donbas|moscow|russia-ukraine\b/ },
    { category: "Palestine", weight: 5, pattern: /\bpalestin|gaza|west bank|israel|hamas\b/ },
    { category: "Afghanistan", weight: 5, pattern: /\bafghan|taliban|kabul\b/ },
    { category: "Politics", weight: 3, pattern: /\belection|parliament|government|minister|policy|sanction|diplomat\b/ },
    { category: "Technology", weight: 3, pattern: /\bai\b|artificial intelligence|machine learning|tech|software|google|apple|microsoft|openai\b/ },
    { category: "Health", weight: 3, pattern: /\bhealth|hospital|virus|disease|vaccine|clinic|medical\b/ },
    { category: "Education", weight: 3, pattern: /\buniversity|student|education|school|campus|academic|faculty\b/ },
    { category: "Economy", weight: 3, pattern: /\beconomy|inflation|gdp|market|trade|oil|gas|business|investment\b/ },
    { category: "Sports", weight: 3, pattern: /\bsport|match|tournament|league|football|basketball|tennis|fifa|olympic\b/ },
    { category: "Culture", weight: 2, pattern: /\bculture|art|music|movie|theater|festival|exhibition|museum\b/ },
    { category: "Science", weight: 2, pattern: /\bscience|research|discovery|laboratory|physics|biology|chemistry\b/ },
    { category: "Events", weight: 2, pattern: /\bevent|conference|workshop|seminar|meeting|summit|forum\b/ },
    { category: "Interviews", weight: 2, pattern: /\binterview|exclusive|q&a|conversation|asked\b/ },
    { category: "Analysis", weight: 1, pattern: /\bopinion|analysis|editorial|insight\b/ },
    { category: "World", weight: 1, pattern: /\bworld|international|global|foreign\b/ },
    { category: "News", weight: 1, pattern: /\bbreaking|update|reported|latest|statement\b/ },
  ];

  const score = new Map<string, number>();

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      score.set(rule.category, (score.get(rule.category) || 0) + rule.weight);
    }
  }

  if (score.size === 0) return ["News"];

  const sorted = [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  return sorted.slice(0, 3);
}

const LANGUAGE_NAMES: Record<"en" | "ru" | "uz", string> = {
  en: "English",
  ru: "Russian",
  uz: "Uzbek (Latin script)",
};

/** Categories the model may choose from, so the taxonomy stays stable. */
const CATEGORY_VOCABULARY = [
  "University",
  "Education",
  "Science",
  "Technology",
  "Economy",
  "Politics",
  "World",
  "Health",
  "Sports",
  "Culture",
  "Events",
  "Interviews",
  "Analysis",
  "Campus Life",
];

type LlmArticle = { headline?: unknown; summary?: unknown; content?: unknown };

function asCleanString(value: unknown): string {
  return typeof value === "string" ? polishText(value.trim()) : "";
}

/** Tolerant JSON extraction: models like to wrap output in prose or ``` fences. */
function extractJsonObject(raw: string): Record<string, unknown> | null {
  const text = String(raw || "").trim();
  if (!text) return null;

  const withoutFences = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const candidates = [withoutFences];
  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(withoutFences.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // try the next candidate
    }
  }

  return null;
}

/**
 * Full editorial pass in a single LLM call: rewrite, summarise, translate into
 * EN/RU/UZ and categorise.
 *
 * Why one call instead of the older per-chunk translation loop:
 *  - the model sees the whole article, so wording and terminology stay consistent
 *    across languages instead of being stitched together from 450-character chunks;
 *  - it actually rewrites the source (the point of the pipeline — republishing a feed
 *    verbatim is plagiarism) rather than applying regex synonym swaps;
 *  - one request per article instead of up to nine, which is cheaper and faster.
 *
 * Returns `null` on any problem — no key, network error, unparseable output — so the
 * caller transparently falls back to the heuristic pipeline.
 */
async function processNewsWithLlm(
  title: string,
  description: string,
  sourceLanguage: "en" | "ru" | "uz",
  detailedContent: string,
  taskConfig: AiTaskConfig,
): Promise<ProcessedNews | null> {
  const apiKey = (taskConfig.providerApiKey || OPENROUTER_API_KEY || "").trim();
  const baseUrl = (taskConfig.providerBaseUrl || "").trim() || "https://openrouter.ai/api/v1";
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|\[::1\]/.test(url);
  const safeKey = apiKey || (isLocal ? "local-model" : "");

  if (!safeKey) return null;

  const model = (taskConfig.providerModel || OPENROUTER_MODEL).trim();
  const policy = taskConfig.translationPolicy ?? "full";
  const targets: Array<"en" | "ru" | "uz"> =
    policy === "disabled" ? [sourceLanguage] : ["en", "ru", "uz"];

  const sourceBody = cleanText(detailedContent || description || title);
  // Keep the prompt bounded; feed articles are rarely longer than this and the tail
  // of a scraped page is usually navigation noise.
  const boundedBody = sourceBody.length > 9000 ? `${sourceBody.slice(0, 9000)}…` : sourceBody;

  const instructions = [
    "You are the editor of a university news desk. Rewrite the source material as an original news article.",
    "Rules:",
    "- Rewrite in your own words. Do not copy sentences from the source verbatim.",
    "- Keep every fact, name, number, quote and date accurate. Invent nothing.",
    "- Neutral, factual news register. No opinion, no marketing language, no emoji.",
    `- Produce ${targets.length === 1 ? "one language" : "each language"}: ${targets
      .map((code) => LANGUAGE_NAMES[code])
      .join(", ")}. Each version must read as if written natively, not translated.`,
    "- `headline`: one line, no trailing period, max 120 characters.",
    "- `summary`: 1-2 sentences, max 300 characters.",
    policy === "summary_only"
      ? `- "content": full article only in ${LANGUAGE_NAMES[sourceLanguage]}; for the other languages repeat the summary.`
      : '- "content": the full article, 3-6 paragraphs separated by a blank line. Do not truncate mid-sentence.',
    taskConfig.categorizationEnabled === false
      ? '- `categories`: return exactly ["News"].'
      : `- \`categories\`: 1-3 items chosen ONLY from this list: ${CATEGORY_VOCABULARY.join(", ")}.`,
    taskConfig.editorialPrompt?.trim()
      ? `\nAdditional editorial instructions from the admin (follow them unless they conflict with accuracy):\n${taskConfig.editorialPrompt.trim()}`
      : null,
    "",
    "Respond with JSON only, no commentary, in exactly this shape:",
    `{"categories":["..."],${targets
      .map((code) => `"${code}":{"headline":"...","summary":"...","content":"..."}`)
      .join(",")}}`,
  ]
    .filter(Boolean)
    .join("\n");

  const userContent = [
    `Source language: ${LANGUAGE_NAMES[sourceLanguage]}`,
    `Source headline: ${cleanText(title)}`,
    description ? `Source summary: ${cleanText(description)}` : null,
    "Source body:",
    boundedBody || cleanText(title),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    logger.debug("AI editorial pass request", { url, model, targets: targets.join(",") });

    const res = await axios.post(
      url,
      {
        model,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: userContent },
        ],
        temperature: 0.3,
        stream: false,
      },
      {
        timeout: 120_000,
        headers: {
          Authorization: `Bearer ${safeKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-Title": OPENROUTER_TITLE,
        },
      },
    );

    const raw = res.data?.choices?.[0]?.message?.content ?? "";
    if (!raw || isRefusalLike(raw)) {
      logger.warn("AI editorial pass returned no usable content; falling back to heuristics");
      return null;
    }

    const parsed = extractJsonObject(raw);
    if (!parsed) {
      logger.warn("AI editorial pass output was not valid JSON; falling back to heuristics");
      return null;
    }

    const perLanguage = (code: "en" | "ru" | "uz") => {
      const block = (parsed[code] ?? {}) as LlmArticle;
      return {
        headline: asCleanString(block.headline),
        summary: asCleanString(block.summary),
        content: asCleanString(block.content),
      };
    };

    const source = perLanguage(sourceLanguage);
    if (!source.headline || !(source.summary || source.content)) {
      logger.warn("AI editorial pass omitted the source language; falling back to heuristics");
      return null;
    }

    // Any language the model skipped falls back to the source-language version rather
    // than being left empty.
    const pick = (code: "en" | "ru" | "uz") => {
      const block = perLanguage(code);
      return {
        headline: block.headline || source.headline,
        summary: block.summary || source.summary || source.content,
        content: block.content || source.content || source.summary,
      };
    };

    const en = pick("en");
    const ru = pick("ru");
    const uz = pick("uz");

    const rawCategories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const categories =
      taskConfig.categorizationEnabled === false
        ? ["News"]
        : Array.from(
            new Set(
              rawCategories
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
                // Accept only the agreed taxonomy, case-insensitively.
                .map(
                  (value) =>
                    CATEGORY_VOCABULARY.find(
                      (allowed) => allowed.toLowerCase() === value.toLowerCase(),
                    ) || "",
                )
                .filter(Boolean),
            ),
          ).slice(0, 3);

    const summarize = (value: string, fallback: string) =>
      taskConfig.summarizationEnabled === false ? fallback : value || fallback;

    logger.info("AI editorial pass succeeded", { model, categories: categories.join(",") });

    return {
      headlineEn: en.headline,
      headlineRu: ru.headline,
      headlineUz: uz.headline,
      summaryEn: summarize(en.summary, en.headline),
      summaryRu: summarize(ru.summary, ru.headline),
      summaryUz: summarize(uz.summary, uz.headline),
      contentEn: en.content,
      contentRu: ru.content,
      contentUz: uz.content,
      categories: categories.length > 0 ? categories : ["News"],
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      logger.error("AI editorial pass failed", {
        status: error.response?.status ?? null,
        data: typeof error.response?.data === "string"
          ? error.response.data.slice(0, 500)
          : error.response?.data ?? null,
        message: error.message,
      });
    } else {
      logger.error("AI editorial pass failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

/**
 * Runs the editorial pipeline for one feed item.
 *
 * Preferred path is a single structured LLM call (`processNewsWithLlm`). When no
 * provider key is configured, or the call fails, it degrades to the offline
 * heuristics below: regex-based paraphrasing, extractive summarisation, keyword
 * categorisation and the free translation chain. The heuristic output is publishable
 * but noticeably weaker — configure a provider key for real editorial quality.
 */
export async function processNewsAI(
  title: string,
  description: string,
  sourceLanguage: "en" | "ru" | "uz" = "en",
  detailedContent?: string,
  taskConfig: AiTaskConfig = {},
): Promise<ProcessedNews | null> {
  const llmResult = await processNewsWithLlm(
    title,
    description,
    sourceLanguage,
    detailedContent || "",
    taskConfig,
  );
  if (llmResult) return llmResult;

  try {
    const src = sourceLanguage;

    const rewrittenTitle = paraphraseBasic(title);
    const rewrittenSummary = summarizeToTwoParagraphs(paraphraseBasic(description || title));
    // The body keeps far more of the source than the summary does.
    const rewrittenContent = summarizeToTwoParagraphs(
      paraphraseBasic(detailedContent || description || title),
      40,
      4000,
    );

    const translationPolicy = taskConfig.translationPolicy ?? "full";

    const shouldTranslateTitle = translationPolicy !== "disabled";
    const shouldTranslateSummary = translationPolicy !== "disabled";
    const shouldTranslateContent = translationPolicy === "full";

    const [headlineEn, headlineRu, headlineUz] = shouldTranslateTitle
      ? await Promise.all([
          translateWithPivot(rewrittenTitle, src, "en", taskConfig),
          translateWithPivot(rewrittenTitle, src, "ru", taskConfig),
          translateWithPivot(rewrittenTitle, src, "uz", taskConfig),
        ])
      : [rewrittenTitle, rewrittenTitle, rewrittenTitle];

    const [summaryEn, summaryRu, summaryUz] = shouldTranslateSummary
      ? await Promise.all([
          translateWithPivot(rewrittenSummary, src, "en", taskConfig),
          translateWithPivot(rewrittenSummary, src, "ru", taskConfig),
          translateWithPivot(rewrittenSummary, src, "uz", taskConfig),
        ])
      : [rewrittenSummary, rewrittenSummary, rewrittenSummary];

    const [contentEn, contentRu, contentUz] = shouldTranslateContent
      ? await Promise.all([
          translateWithPivot(rewrittenContent, src, "en", taskConfig),
          translateWithPivot(rewrittenContent, src, "ru", taskConfig),
          translateWithPivot(rewrittenContent, src, "uz", taskConfig),
        ])
      : [rewrittenContent, rewrittenContent, rewrittenContent];

    const summarySource = taskConfig.summarizationEnabled === false ? title : description || title;
    const normalizedSummary = paraphraseBasic(summarySource);

    const finalSummaryEn = taskConfig.summarizationEnabled === false ? polishText(title) : summarizeToTwoParagraphs(polishText(summaryEn || normalizedSummary));
    const finalSummaryRu = taskConfig.summarizationEnabled === false ? polishText(headlineRu) : summarizeToTwoParagraphs(polishText(summaryRu || normalizedSummary));
    const finalSummaryUz = taskConfig.summarizationEnabled === false ? polishText(headlineUz) : summarizeToTwoParagraphs(polishText(summaryUz || normalizedSummary));

    const categories = taskConfig.categorizationEnabled === false
      ? ["News"]
      : detectCategories(title, `${description || ""} ${detailedContent || ""}`);

    return {
      headlineEn: polishText(headlineEn),
      headlineRu: polishText(headlineRu),
      headlineUz: polishText(headlineUz),
      summaryEn: finalSummaryEn,
      summaryRu: finalSummaryRu,
      summaryUz: finalSummaryUz,
      contentEn: summarizeToTwoParagraphs(polishText(contentEn), 40, 4000),
      contentRu: summarizeToTwoParagraphs(polishText(contentRu), 40, 4000),
      contentUz: summarizeToTwoParagraphs(polishText(contentUz), 40, 4000),
      categories,
    };
  } catch (error) {
    logger.error("Heuristic processing pipeline failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
