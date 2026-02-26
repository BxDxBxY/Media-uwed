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
    const rewrittenTitle = paraphraseBasic(title);
    const rewrittenSummary = paraphraseBasic(description || title);

    // Translate into all 3 languages
    const headlineEn = await translate(rewrittenTitle, src, "en");
    const headlineRu = await translate(rewrittenTitle, src, "ru");
    const headlineUz = await translate(rewrittenTitle, src, "uz");

    const summaryEn = await translate(rewrittenSummary, src, "en");
    const summaryRu = await translate(rewrittenSummary, src, "ru");
    const summaryUz = await translate(rewrittenSummary, src, "uz");

    const categories = detectCategories(title, description || "");
    console.log(headlineUz, "200");
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
    console.error("Free translate/paraphrase error:", error);
    return null;
  }
}

// import axios from "axios";

// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// export interface ProcessedNews {
//   headlineEn: string;
//   headlineRu: string;
//   headlineUz: string;
//   summaryEn: string;
//   summaryRu: string;
//   summaryUz: string;
//   categories: string[];
// }

// export async function processNewsAI(
//   title: string,
//   description: string,
//   sourceLanguage: "en" | "ru" | "uz" = "en",
// ): Promise<ProcessedNews | null> {
//   if (!GEMINI_API_KEY) {
//     console.warn("GEMINI_API_KEY is missing. AI processing will be mock.");
//     return {
//       headlineEn: sourceLanguage === "en" ? title : `EN: ${title}`,
//       headlineRu: sourceLanguage === "ru" ? title : `RU: ${title}`,
//       headlineUz: sourceLanguage === "uz" ? title : `UZ: ${title}`,
//       summaryEn: `Paraphrased: ${description || title}`,
//       summaryRu: `Перефразировано: ${description || title}`,
//       summaryUz: `Tahrirlangan: ${description || title}`,
//       categories: ["News"],
//     };
//   }

//   const prompt = `
//         You are a premium news editor for a University Media portal.
//         Take this news (Source Language: ${sourceLanguage.toUpperCase()}):
//         Title: ${title}
//         Description: ${description || "No description provided."}

//         Requirements:
//         1. Rewrite the headline and summary into a professional editorial style.
//         2. Output must be available in English (EN), Russian (RU), and Uzbek (UZ).
//         3. DO NOT include any labels like "Paraphrased:", "[AI]", or language prefixes in the values. Output ONLY the story content.
//         4. Detect up to 3 relevant categories (e.g., Politics, Education, Technology, Palestine, Ukraine, Science).
//         5. Return ONLY a JSON object with these keys:
//            headlineEn, headlineRu, headlineUz, summaryEn, summaryRu, summaryUz, categories (array of strings).

//         JSON Output:
//     `;

//   try {
//     const response = await axios.post(GEMINI_URL, {
//       contents: [{ parts: [{ text: prompt }] }],
//       generationConfig: { response_mime_type: "application/json" },
//     });

//     console.log(response.data);
//     const text = response.data.candidates[0].content.parts[0].text;
//     return JSON.parse(text);
//   } catch (error) {
//     console.error("Gemini API error:", error);
//     return null;
//   }
// }
//
// import axios from "axios";

// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// export interface ProcessedNews {
//   headlineEn: string;
//   headlineRu: string;
//   headlineUz: string;
//   summaryEn: string;
//   summaryRu: string;
//   summaryUz: string;
//   categories: string[];
// }

// function sleep(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// function parseRetryAfterMs(retryAfter: unknown): number | null {
//   if (retryAfter == null) return null;

//   // Retry-After can be seconds or a date string
//   const s = String(retryAfter).trim();
//   const asNum = Number(s);
//   if (!Number.isNaN(asNum) && asNum >= 0) return asNum * 1000;

//   const asDate = Date.parse(s);
//   if (!Number.isNaN(asDate)) {
//     const diff = asDate - Date.now();
//     return diff > 0 ? diff : 0;
//   }

//   return null;
// }

// function extractJson(text: string): string {
//   // Gemini often returns pure JSON, but sometimes wraps it with stray whitespace/newlines.
//   // This extracts the first {...} block defensively.
//   const firstBrace = text.indexOf("{");
//   const lastBrace = text.lastIndexOf("}");
//   if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace)
//     return text.trim();
//   return text.slice(firstBrace, lastBrace + 1).trim();
// }

// export async function processNewsAI(
//   title: string,
//   description: string,
//   sourceLanguage: "en" | "ru" | "uz" = "en",
// ): Promise<ProcessedNews | null> {
//   if (!GEMINI_API_KEY) {
//     console.warn("GEMINI_API_KEY is missing. AI processing will be mock.");
//     return {
//       headlineEn: sourceLanguage === "en" ? title : title,
//       headlineRu: sourceLanguage === "ru" ? title : title,
//       headlineUz: sourceLanguage === "uz" ? title : title,
//       summaryEn: description || title,
//       summaryRu: description || title,
//       summaryUz: description || title,
//       categories: ["News"],
//     };
//   }

//   const prompt = `
// You are a premium news editor for a University Media portal.
// Take this news (Source Language: ${sourceLanguage.toUpperCase()}):
// Title: ${title}
// Description: ${description || "No description provided."}

// Requirements:
// 1) Rewrite the headline and summary into a professional editorial style.
// 2) Output must be available in English (EN), Russian (RU), and Uzbek (UZ).
// 3) Do NOT include any labels like "Paraphrased:", "[AI]", or language prefixes inside values.
// 4) Detect up to 3 relevant categories (e.g., Politics, Education, Technology, Palestine, Ukraine, Science).
// 5) Return ONLY a JSON object with keys:
//    headlineEn, headlineRu, headlineUz, summaryEn, summaryRu, summaryUz, categories (array of strings).
// `;

//   const MAX_RETRIES = 6;
//   const BASE_DELAY_MS = 800; // tweak if needed

//   for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
//     try {
//       const response = await axios.post(
//         GEMINI_URL,
//         {
//           contents: [{ parts: [{ text: prompt }] }],
//           generationConfig: { response_mime_type: "application/json" },
//         },
//         { timeout: 30_000 },
//       );

//       const text: string | undefined =
//         response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

//       if (!text) {
//         console.error("Gemini returned no text:", response.data);
//         return null;
//       }

//       const jsonStr = extractJson(text);
//       const parsed = JSON.parse(jsonStr) as ProcessedNews;

//       // minimal sanity checks so garbage doesn't enter DB
//       if (
//         !parsed.headlineEn ||
//         !parsed.headlineRu ||
//         !parsed.headlineUz ||
//         !parsed.summaryEn ||
//         !parsed.summaryRu ||
//         !parsed.summaryUz ||
//         !Array.isArray(parsed.categories)
//       ) {
//         console.error("Gemini JSON missing fields:", parsed);
//         return null;
//       }

//       return parsed;
//     } catch (err: any) {
//       const status = err?.response?.status as number | undefined;

//       // Only retry on rate limits, transient server errors, and network issues
//       const retryable =
//         status === 429 ||
//         (status != null && status >= 500) ||
//         err.code === "ECONNRESET" ||
//         err.code === "ETIMEDOUT" ||
//         err.code === "ENOTFOUND" ||
//         err.code === "EAI_AGAIN";

//       if (!retryable || attempt === MAX_RETRIES) {
//         console.error("Gemini API error:", {
//           status,
//           message: err?.message,
//           data: err?.response?.data,
//         });
//         return null;
//       }

//       // Respect Retry-After header if present
//       const retryAfterHeader = err?.response?.headers?.["retry-after"];
//       const retryAfterMs = parseRetryAfterMs(retryAfterHeader);

//       // Exponential backoff + jitter
//       const expo = BASE_DELAY_MS * Math.pow(2, attempt);
//       const jitter = Math.floor(Math.random() * 250);
//       const waitMs =
//         retryAfterMs != null ? retryAfterMs + jitter : expo + jitter;

//       console.warn(
//         `Gemini rate-limited/transient error (status=${status}). Retry #${attempt + 1} in ${waitMs}ms.`,
//       );
//       await sleep(waitMs);
//     }
//   }

//   return null;
// }
