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
  /** Models tried, in order, if `providerModel` fails. Defaults to `DEFAULT_FALLBACK_MODELS`. */
  fallbackModels?: string[];
  /** Requests this article may spend across all models. Defaults to `MAX_REQUESTS_PER_ARTICLE`. */
  maxProviderRequests?: number;
  /**
   * Called once per HTTP request actually sent to the provider, so the caller can meter
   * a daily quota. Fired for failed requests too — a rejected request still counts
   * against OpenRouter's rate limit.
   */
  onProviderRequest?: (info: { model: string; status: number | null; ok: boolean }) => void;
  /**
   * Which model produced the article, or `null` when every model failed and the offline
   * heuristics took over. Lets callers report how much of a batch got a real editorial
   * pass instead of a regex paraphrase.
   */
  onEditorialOutcome?: (info: { model: string | null }) => void;
};
// Free/no-auth translation endpoints (may rate-limit sometimes)
const LIBRETRANSLATE_URL = "https://libretranslate.de/translate"; // public instance
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

const MAX_TRANSLATE_CHARS = 450;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Default model, deliberately a `:free` OpenRouter variant.
 *
 * The account this runs on has no credits, so free variants are the only usable ones:
 * 20 requests/minute and 50 requests/day shared across every `:free` model (1000/day
 * once $10 of credit has ever been purchased). That quota is why the editorial pass is
 * a single call per article and why `lib/ai-usage.ts` meters it.
 *
 * Switching to a paid model is one field: `OPENROUTER_TRANSLATE_MODEL`, or the model
 * box in Admin → Automation → Integrations.
 */
export const DEFAULT_AI_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const OPENROUTER_MODEL = process.env.OPENROUTER_TRANSLATE_MODEL || DEFAULT_AI_MODEL;

/**
 * Tried in order when the chosen model is rate-limited, out of capacity, or returns
 * something unusable. Free capacity is shared between all OpenRouter users and is often
 * busy, so a single-model configuration falls through to the weak heuristic pipeline far
 * more often than it has to. Override with `OPENROUTER_FALLBACK_MODELS` (comma-separated).
 *
 * Order comes from `npm run check:models` on a real 1292-character article (2026-08-01),
 * and is by Uzbek quality rather than speed, because Uzbek is what gets published under
 * the university's name and the weakest models mangle it:
 *  - nemotron-3-ultra-550b (75s) — fluent Uzbek, every fact traceable to the source;
 *  - gpt-oss-20b (250s) — good Uzbek, but turned a federal-budget surplus into "market
 *    profit from lending", and is too slow for a serverless function's time limit;
 *  - nemotron-3-super-120b (28s) — fastest, but its Uzbek came back salted with Dutch and
 *    Turkish words ("Kremlda gehouden", "1 iyulga geldik"), so it is a last resort.
 * `google/gemma-4-31b-it:free` was dropped: 429 from the shared upstream pool on both
 * attempts.
 */
export const DEFAULT_FALLBACK_MODELS = [
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

/**
 * Requests one article may spend, including fallbacks and retries. Without a cap a
 * single stubborn article could eat a large slice of a 50-request day.
 */
const MAX_REQUESTS_PER_ARTICLE = 3;

/**
 * Below this much source material the editorial pass switches to brief mode. See the
 * comment at the `isThinSource` computation for why.
 */
const BRIEF_SOURCE_CHARS = 400;

/**
 * Below this there is nothing to rewrite — a headline alone cannot become an article
 * without inventing the article. `runProcess` skips these and leaves them queued.
 */
export const MIN_SOURCE_CHARS = 120;

const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE || "University Media AI";

export function parseModelList(value: string | null | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

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
 * Free translation chain for the heuristic fallback: LibreTranslate, then MyMemory,
 * then the untranslated source.
 *
 * Deliberately LLM-free. The provider is called exactly once per article, by the
 * editorial pass; this function only runs when that call was impossible or failed.
 * An earlier version retried the provider here once per 450-character chunk — up to nine
 * extra requests per article, which on the free tier (50 requests/day) exhausted the
 * whole day's quota on a handful of articles and then failed anyway, since a failing
 * editorial call and a failing chunk call almost always share the same cause.
 */
async function translate(
  text: string,
  source: "en" | "ru" | "uz",
  target: "en" | "ru" | "uz",
) {
  const q = cleanText(text);
  if (!q) return "";
  if (source === target) return q;

  const chunks = chunkText(q);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    let translatedChunk = "";

    // 1) LibreTranslate
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

    // 2) MyMemory
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
): Promise<string> {
  const primary = await translate(text, source, target);
  const normalizedSource = cleanText(text);

  if (target === source || !normalizedSource) return primary;

  const unchanged = cleanText(primary).toLowerCase() === normalizedSource.toLowerCase();
  if (!unchanged || source === "en" || target === "en") return primary;

  const pivot = await translate(text, source, "en");
  if (!pivot || cleanText(pivot).toLowerCase() === normalizedSource.toLowerCase()) return primary;

  const pivoted = await translate(pivot, "en", target);
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

/**
 * Tolerant JSON extraction: models like to wrap output in prose or ``` fences.
 *
 * Reasoning-tuned models (most of the free tier) additionally emit a `<think>` block
 * before the answer. It is stripped first, because braces inside the reasoning would
 * otherwise anchor the brace-slice below to the wrong opening brace.
 */
function extractJsonObject(raw: string): Record<string, unknown> | null {
  const text = String(raw || "")
    .replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, "")
    // An unterminated opening tag means the model was cut off mid-thought; there is no
    // answer after it, but dropping the tag keeps the parse attempt from tripping on it.
    .replace(/<(?:think|thinking|reasoning)>/gi, "")
    .trim();
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
  // The configured model first, then the fallbacks, with duplicates removed so a model
  // that also appears in the fallback list is not billed twice for the same failure.
  const candidates = Array.from(
    new Set([
      model,
      ...(taskConfig.fallbackModels ??
        (parseModelList(process.env.OPENROUTER_FALLBACK_MODELS).length > 0
          ? parseModelList(process.env.OPENROUTER_FALLBACK_MODELS)
          : DEFAULT_FALLBACK_MODELS)),
    ].filter(Boolean)),
  );
  const requestBudget = Math.max(1, taskConfig.maxProviderRequests ?? MAX_REQUESTS_PER_ARTICLE);
  const policy = taskConfig.translationPolicy ?? "full";
  const targets: Array<"en" | "ru" | "uz"> =
    policy === "disabled" ? [sourceLanguage] : ["en", "ru", "uz"];

  const sourceBody = cleanText(detailedContent || description || title);
  // Keep the prompt bounded; feed articles are rarely longer than this and the tail
  // of a scraped page is usually navigation noise.
  const boundedBody = sourceBody.length > 9000 ? `${sourceBody.slice(0, 9000)}…` : sourceBody;

  /**
   * Some sources give a full article, some a one-sentence teaser, and some (TASS, whose
   * pages block scraping) nothing but a headline plus a teaser. Asking for "3-6
   * paragraphs" from two sentences does not produce a short article — it produces an
   * invented one: measured against a headline-only source, a model padded the body with
   * a textbook explanation of what lending statistics are. A university masthead cannot
   * publish that, so a thin source switches the prompt to brief mode.
   */
  const isThinSource = cleanText(`${title} ${description} ${detailedContent}`).length < BRIEF_SOURCE_CHARS;

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
    isThinSource
      ? '- The source is a short news brief. "content": 1-3 sentences, no more. Add NO background, ' +
        "context, definitions, history or consequences — nothing that is not stated in the source. " +
        "A shorter, accurate item is correct; padding it out is a factual error."
      : policy === "summary_only"
        ? `- "content": full article only in ${LANGUAGE_NAMES[sourceLanguage]}; for the other languages repeat the summary.`
        : '- "content": the full article, 3-6 paragraphs separated by a blank line. Do not truncate mid-sentence.',
    taskConfig.categorizationEnabled === false
      ? '- `categories`: return exactly ["News"].'
      : `- \`categories\`: chosen ONLY from this list: ${CATEGORY_VOCABULARY.join(", ")}. ` +
        "Put the single most specific one first, and add a second only if it is genuinely " +
        "central to the story — two precise tags beat three vague ones. " +
        '"Events" means a scheduled event (conference, ceremony, festival, match), not any ' +
        'piece of news; "Analysis" means commentary rather than reporting; "Campus Life" and ' +
        '"University" are for this university\'s own community.',
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

  let requestsSpent = 0;

  for (const candidate of candidates) {
    if (requestsSpent >= requestBudget) {
      logger.warn("AI editorial pass hit its per-article request budget", {
        requestsSpent,
        requestBudget,
      });
      break;
    }

    const call = await callEditorialModel({
      candidate,
      url,
      apiKey: safeKey,
      instructions,
      userContent,
      remainingRequests: requestBudget - requestsSpent,
      onProviderRequest: (info) => {
        requestsSpent++;
        taskConfig.onProviderRequest?.(info);
      },
    });

    if (call.outcome === "abort") break;
    if (call.outcome === "next") continue;

    if (isRefusalLike(call.content)) {
      logger.warn("AI editorial pass was refused; trying the next model", { model: candidate });
      continue;
    }

    const parsed = extractJsonObject(call.content);
    if (!parsed) {
      logger.warn("AI editorial pass output was not valid JSON; trying the next model", {
        model: candidate,
      });
      continue;
    }

    const mapped = mapEditorialJson(parsed, sourceLanguage, taskConfig);
    if (!mapped) {
      logger.warn("AI editorial pass omitted the source language; trying the next model", {
        model: candidate,
      });
      continue;
    }

    logger.info("AI editorial pass succeeded", {
      model: candidate,
      requestsSpent,
      categories: mapped.categories.join(","),
    });
    taskConfig.onEditorialOutcome?.({ model: candidate });
    return mapped;
  }

  logger.warn("No AI model produced a usable article; falling back to heuristics", {
    tried: candidates.join(","),
    requestsSpent,
  });
  return null;
}

/** Statuses where another model is worth trying rather than giving up on the article. */
const RETRYABLE_PROVIDER_STATUSES = new Set([402, 408, 409, 429, 500, 502, 503, 504, 524]);

type EditorialCall =
  | { outcome: "content"; content: string }
  /** This model failed; try the next one. */
  | { outcome: "next" }
  /** Nothing will work (bad or missing credentials) — stop spending requests. */
  | { outcome: "abort" };

/**
 * Sends the editorial prompt to one model.
 *
 * Spends up to two requests on it: the first asks for JSON mode and raises the
 * completion cap, and if the endpoint rejects those optional fields the same model is
 * retried with a plain body. Free endpoints differ in which parameters they accept, so
 * this is self-healing rather than a hardcoded capability table.
 */
async function callEditorialModel(args: {
  candidate: string;
  url: string;
  apiKey: string;
  instructions: string;
  userContent: string;
  remainingRequests: number;
  onProviderRequest: (info: { model: string; status: number | null; ok: boolean }) => void;
}): Promise<EditorialCall> {
  const { candidate, url, apiKey, instructions, userContent, remainingRequests, onProviderRequest } =
    args;

  // Only attempt the plain-body retry if the article can still afford a second request.
  const modes: readonly boolean[] = remainingRequests > 1 ? [true, false] : [true];

  for (const strict of modes) {
    const body: Record<string, unknown> = {
      model: candidate,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      stream: false,
    };

    if (strict) {
      body.response_format = { type: "json_object" };
      // Three languages of article body do not fit in the default completion cap of
      // several free endpoints, which truncates the JSON mid-string.
      body.max_tokens = 8000;
    }

    try {
      logger.debug("AI editorial pass request", { url, model: candidate, jsonMode: strict });

      const res = await axios.post(url, body, {
        timeout: 120_000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-Title": OPENROUTER_TITLE,
        },
      });

      onProviderRequest({ model: candidate, status: res.status, ok: true });

      const raw = res.data?.choices?.[0]?.message?.content;
      if (typeof raw === "string" && raw.trim()) {
        return { outcome: "content", content: raw };
      }

      // Reasoning-tuned models sometimes spend the whole completion budget thinking and
      // return an empty message. Another model beats retrying this one.
      logger.warn("AI editorial pass returned an empty message", {
        model: candidate,
        finishReason: res.data?.choices?.[0]?.finish_reason ?? null,
      });
      return { outcome: "next" };
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status ?? null : null;
      onProviderRequest({ model: candidate, status, ok: false });
      logProviderError(candidate, status, error);

      // A 400/422 normally means `response_format` or `max_tokens` was rejected, not that
      // the model is unusable — retry it once with a plain body.
      if (strict && modes.length > 1 && (status === 400 || status === 422)) continue;

      // Bad credentials fail identically for every model, so stop rather than burning
      // one request per candidate to learn the same thing.
      if (status === 401 || status === 403) return { outcome: "abort" };

      return { outcome: "next" };
    }
  }

  return { outcome: "next" };
}

function logProviderError(model: string, status: number | null, error: unknown): void {
  // Response headers can carry credentials — log status and body only.
  const data = axios.isAxiosError(error)
    ? typeof error.response?.data === "string"
      ? error.response.data.slice(0, 500)
      : error.response?.data ?? null
    : null;

  logger.error("AI editorial pass request failed", {
    model,
    status,
    data,
    message: error instanceof Error ? error.message : String(error),
    retryable: status === null ? true : RETRYABLE_PROVIDER_STATUSES.has(status),
  });

  // Two failures are common enough on the free tier to deserve an actionable message
  // instead of a bare status code in the log.
  if (status === 404 && JSON.stringify(data ?? "").toLowerCase().includes("data policy")) {
    logger.error(
      "OpenRouter found no endpoint matching the account's data policy for this model. " +
        "Check OpenRouter → Settings → Privacy, which has separate toggles for free and " +
        "paid models, or choose a different model.",
      { model },
    );
  }

  if (status === 429) {
    logger.warn(
      "OpenRouter rate limit reached: free models allow 20 requests/minute and 50/day " +
        "(1000/day once $10 of credit has been purchased).",
      { model },
    );
  }
}

/** Turns a validated editorial JSON object into the pipeline's result shape. */
function mapEditorialJson(
  parsed: Record<string, unknown>,
  sourceLanguage: "en" | "ru" | "uz",
  taskConfig: AiTaskConfig,
): ProcessedNews | null {
  const perLanguage = (code: "en" | "ru" | "uz") => {
    const block = (parsed[code] ?? {}) as LlmArticle;
    return {
      headline: asCleanString(block.headline),
      summary: asCleanString(block.summary),
      content: asCleanString(block.content),
    };
  };

  const source = perLanguage(sourceLanguage);
  if (!source.headline || !(source.summary || source.content)) return null;

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

  taskConfig.onEditorialOutcome?.({ model: null });

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
          translateWithPivot(rewrittenTitle, src, "en"),
          translateWithPivot(rewrittenTitle, src, "ru"),
          translateWithPivot(rewrittenTitle, src, "uz"),
        ])
      : [rewrittenTitle, rewrittenTitle, rewrittenTitle];

    const [summaryEn, summaryRu, summaryUz] = shouldTranslateSummary
      ? await Promise.all([
          translateWithPivot(rewrittenSummary, src, "en"),
          translateWithPivot(rewrittenSummary, src, "ru"),
          translateWithPivot(rewrittenSummary, src, "uz"),
        ])
      : [rewrittenSummary, rewrittenSummary, rewrittenSummary];

    const [contentEn, contentRu, contentUz] = shouldTranslateContent
      ? await Promise.all([
          translateWithPivot(rewrittenContent, src, "en"),
          translateWithPivot(rewrittenContent, src, "ru"),
          translateWithPivot(rewrittenContent, src, "uz"),
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
