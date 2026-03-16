import axios from "axios";
import { polishText } from "@/lib/text-clean";

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
): Promise<string | null> {
  const safeKey = (apiKey || "").trim();
  if (!safeKey) {
    console.log("OpenRouter key missing or empty after trim; skipping provider call");
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

    console.log({
      hasKey: Boolean(safeKey),
      keyPrefix: safeKey.slice(0, 8),
      model,
    });

    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
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
  } catch (error: any) {
    console.error("OpenRouter error status:", error?.response?.status);
    console.error("OpenRouter error data:", error?.response?.data);
    console.error("OpenRouter error headers:", error?.response?.headers);
    console.error("OpenRouter translation error:", error?.message || error);
    return null;
  }
}
function cleanText(s: string) {
  return polishText((s || "").replace(/\s+/g, " "));
}

function isRefusalLike(text: string): boolean {
  const normalized = cleanText(text).toLowerCase();
  if (!normalized) return false;
  return [
    "sorry",
    "i can't help",
    "i cannot help",
    "i can't assist",
    "i cannot assist",
    "unable to assist",
    "cannot comply",
    "i'm not able to",
    "i cannot fulfill",
    "policy",
    "cannot provide",
  ].some((phrase) => normalized.includes(phrase));
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
  options?: { providerApiKey?: string; providerModel?: string; editorialPrompt?: string },
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
  options?: { providerApiKey?: string; providerModel?: string; editorialPrompt?: string },
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


function summarizeToTwoParagraphs(text: string): string {
  const cleaned = cleanText(text);
  if (!cleaned) return "";

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const selected = sentences.slice(0, 8).join(" " );
  const capped = selected.length > 900 ? `${selected.slice(0, 897).trim()}...` : selected;

  const midpoint = Math.ceil(capped.length / 2);
  const splitAt = capped.indexOf(". ", midpoint);
  if (splitAt > 0 && splitAt < capped.length - 3) {
    return `${capped.slice(0, splitAt + 1).trim()}\n\n${capped.slice(splitAt + 2).trim()}`;
  }

  return capped;
}

function detectCategories(title: string, description: string): string[] {
  const t = `${title} ${description}`.toLowerCase();
  const cats: string[] = [];

  const add = (c: string) => {
    if (!cats.includes(c)) cats.push(c);
  };

  if (/\bukraine|kyiv|kiev|russia|moscow|war\b/.test(t)) add("Ukraine");
  if (/\bpalestin|gaza|israel|hamas\b/.test(t)) add("Palestine");
  if (/\bafghan|taliban|kabul\b/.test(t)) add("Afghanistan");
  if (/\belection|parliament|government|minister|policy|sanction\b/.test(t))
    add("Politics");
  if (
    /\bai\b|artificial intelligence|machine learning|tech|software|google|apple|microsoft/.test(
      t,
    )
  )
    add("Technology");
  if (/\bhealth|hospital|virus|disease|vaccine\b/.test(t)) add("Health");
  if (/\buniversity|student|education|school|campus|academic|faculty\b/.test(t))
    add("Education");
  if (
    /\beconomy|inflation|gdp|market|trade|oil|gas|business|investment\b/.test(t)
  )
    add("Economy");
  if (/\bsport|match|tournament|league|football|basketball|tennis\b/.test(t))
    add("Sports");
  if (/\bculture|art|music|movie|theater|festival|exhibition\b/.test(t))
    add("Culture");
  if (
    /\bscience|research|discovery|laboratory|physics|biology|chemistry\b/.test(
      t,
    )
  )
    add("Science");
  if (/\bevent|conference|workshop|seminar|meeting|gathering\b/.test(t))
    add("Events");
  if (/\bcampus|dormitory|student life|community\b/.test(t)) add("Campus");
  if (/\binterview|exclusive|q&a|conversation\b/.test(t)) add("Interviews");
  if (/\bopinion|analysis|editorial|insight\b/.test(t)) add("Analysis");
  if (/\buniversity|student|education|school|campus|academic|faculty\b/.test(t)) add("University");
  if (/\bworld|international|global|foreign\b/.test(t)) add("World");

  if (cats.length === 0) add("World");
  return cats.slice(0, 3);
}

export async function processNewsAI(
  title: string,
  description: string,
  sourceLanguage: "en" | "ru" | "uz" = "en",
  detailedContent?: string,
  taskConfig: AiTaskConfig = {},
): Promise<ProcessedNews | null> {
  try {
    const src = sourceLanguage;

    const rewrittenTitle = paraphraseBasic(title);
    const rewrittenSummary = summarizeToTwoParagraphs(paraphraseBasic(description || title));
    const rewrittenContent = summarizeToTwoParagraphs(paraphraseBasic(detailedContent || description || title));

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
      contentEn: summarizeToTwoParagraphs(polishText(contentEn)),
      contentRu: summarizeToTwoParagraphs(polishText(contentRu)),
      contentUz: summarizeToTwoParagraphs(polishText(contentUz)),
      categories,
    };
  } catch (error) {
    console.error("Multi-lang translate error:", error);
    return null;
  }
}
