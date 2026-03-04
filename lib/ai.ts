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

// Free/no-auth translation endpoints (may rate-limit sometimes)
const LIBRETRANSLATE_URL = "https://libretranslate.de/translate"; // public instance
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

const MAX_TRANSLATE_CHARS = 450;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_TRANSLATE_MODEL || "gemini-2.0-flash";

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



async function translateWithGeminiChunk(
  chunk: string,
  source: "en" | "ru" | "uz",
  target: "en" | "ru" | "uz",
): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  try {
    const prompt = [
      "You are a professional news translator.",
      `Translate the text from ${source} to ${target}.`,
      "Return only translated text with no markdown, no explanations, no extra labels.",
      "Keep names, numbers, and factual meaning accurate.",
      "Input:",
      chunk,
    ].join("\n");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await axios.post(
      url,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 800,
        },
      },
      { timeout: 25_000 },
    );

    const out =
      res.data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p?.text || "")
        .join("\n")
        .trim() || "";

    return out ? cleanText(out) : null;
  } catch (error) {
    console.error("Gemini translation error:", error);
    return null;
  }
}
function cleanText(s: string) {
  return polishText((s || "").replace(/\s+/g, " "));
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
 * 1) Gemini (if API key configured)
 * 2) LibreTranslate
 * 3) MyMemory
 * Returns original text if translation fails.
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

    translatedChunk = (await translateWithGeminiChunk(chunk, source, target)) || "";

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

  if (cats.length === 0) add("News");
  return cats.slice(0, 4);
}

export async function processNewsAI(
  title: string,
  description: string,
  sourceLanguage: "en" | "ru" | "uz" = "en",
  detailedContent?: string,
): Promise<ProcessedNews | null> {
  try {
    const src = sourceLanguage;

    const rewrittenTitle = paraphraseBasic(title);
    const rewrittenSummary = paraphraseBasic(description || title);
    const rewrittenContent = paraphraseBasic(detailedContent || description || title);

    const [headlineEn, headlineRu, headlineUz] = await Promise.all([
      translateWithPivot(rewrittenTitle, src, "en"),
      translateWithPivot(rewrittenTitle, src, "ru"),
      translateWithPivot(rewrittenTitle, src, "uz"),
    ]);

    const [summaryEn, summaryRu, summaryUz] = await Promise.all([
      translateWithPivot(rewrittenSummary, src, "en"),
      translateWithPivot(rewrittenSummary, src, "ru"),
      translateWithPivot(rewrittenSummary, src, "uz"),
    ]);

    const [contentEn, contentRu, contentUz] = await Promise.all([
      translateWithPivot(rewrittenContent, src, "en"),
      translateWithPivot(rewrittenContent, src, "ru"),
      translateWithPivot(rewrittenContent, src, "uz"),
    ]);

    const categories = detectCategories(title, `${description || ""} ${detailedContent || ""}`);

    return {
      headlineEn: polishText(headlineEn),
      headlineRu: polishText(headlineRu),
      headlineUz: polishText(headlineUz),
      summaryEn: polishText(summaryEn),
      summaryRu: polishText(summaryRu),
      summaryUz: polishText(summaryUz),
      contentEn: polishText(contentEn),
      contentRu: polishText(contentRu),
      contentUz: polishText(contentUz),
      categories,
    };
  } catch (error) {
    console.error("Multi-lang translate error:", error);
    return null;
  }
}
