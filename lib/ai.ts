import axios from "axios";

export interface ProcessedNews {
  headlineEn: string;
  headlineRu: string;
  headlineUz: string;
  summaryEn: string;
  summaryRu: string;
  summaryUz: string;
  categories: string[];
}

// Free/no-auth translation endpoints (may rate-limit sometimes)
const LIBRETRANSLATE_URL = "https://libretranslate.de/translate"; // public instance
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

function cleanText(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

/**
 * Simple paraphrase (no AI):
 * - cleans whitespace
 * - removes common boilerplate
 * - applies light safe rewrites
 * This is not “LLM quality”, but it’s free and stable.
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
 * Translation: try LibreTranslate (no auth) then MyMemory (no auth).
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

  // 1) LibreTranslate
  try {
    const res = await axios.post(
      LIBRETRANSLATE_URL,
      { q, source, target, format: "text" },
      { timeout: 20_000 },
    );
    const out = res.data?.translatedText;
    if (typeof out === "string" && out.trim()) return cleanText(out);
  } catch {
    // ignore, fallback
  }

  // 2) MyMemory
  try {
    const url =
      `${MYMEMORY_URL}?q=${encodeURIComponent(q)}` +
      `&langpair=${encodeURIComponent(source)}|${encodeURIComponent(target)}`;
    const res = await axios.get(url, { timeout: 20_000 });
    const out = res.data?.responseData?.translatedText;
    if (typeof out === "string" && out.trim()) return cleanText(out);
  } catch {
    // ignore
  }

  return q; // fallback: return original
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

  if (cats.length === 0) add("News");
  return cats.slice(0, 3);
}

export async function processNewsAI(
  title: string,
  description: string,
  sourceLanguage: "en" | "ru" | "uz" = "en",
): Promise<ProcessedNews | null> {
  try {
    const src = sourceLanguage;

    // “Paraphrase” (clean editorial rewrite) in source language locally
    // For non-English, paraphraseBasic might be less effective but still cleans whitespace
    const rewrittenTitle = paraphraseBasic(title);
    const rewrittenSummary = paraphraseBasic(description || title);

    // Translate into all 3 languages (translate function handles src === target)
    const [headlineEn, headlineRu, headlineUz] = await Promise.all([
      translate(rewrittenTitle, src, "en"),
      translate(rewrittenTitle, src, "ru"),
      translate(rewrittenTitle, src, "uz"),
    ]);

    const [summaryEn, summaryRu, summaryUz] = await Promise.all([
      translate(rewrittenSummary, src, "en"),
      translate(rewrittenSummary, src, "ru"),
      translate(rewrittenSummary, src, "uz"),
    ]);

    const categories = detectCategories(title, description || "");

    return {
      headlineEn,
      headlineRu,
      headlineUz,
      summaryEn,
      summaryRu,
      summaryUz,
      categories,
    };
  } catch (error) {
    console.error("Multi-lang translate error:", error);
    return null;
  }
}
