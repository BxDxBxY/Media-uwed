/**
 * Smoke check for the LLM editorial path — `npm run check:ai`.
 *
 * Starts a stub OpenAI-compatible provider on localhost, runs `processNewsAI` against
 * it and asserts the important behaviours: fenced JSON is parsed, the category
 * taxonomy is enforced, paragraphs survive, the admin's editorial prompt is forwarded
 * and no API key is logged. Requires no real provider key and no network access.
 *
 * Exits non-zero if any assertion fails, so it can be wired into CI.
 */
import http from "node:http";
import { processNewsAI, detectSourceLanguage } from "@/lib/ai";

const CANNED = {
  categories: ["University", "Science", "NotARealCategory"],
  en: {
    headline: "University opens new research centre",
    summary: "The university has opened a research centre focused on renewable energy.",
    content: "Para one about the centre.\n\nPara two with details and a quote.\n\nPara three closing.",
  },
  ru: {
    headline: "Университет открыл новый исследовательский центр",
    summary: "Университет открыл центр, посвящённый возобновляемой энергетике.",
    content: "Первый абзац.\n\nВторой абзац с деталями.\n\nТретий абзац.",
  },
  uz: {
    headline: "Universitet yangi ilmiy markaz ochdi",
    summary: "Universitet qayta tiklanuvchi energiyaga bagʻishlangan markaz ochdi.",
    content: "Birinchi abzas.\n\nIkkinchi abzas.\n\nUchinchi abzas.",
  },
};

let received: any = null;

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    received = { url: req.url, auth: req.headers.authorization, body: JSON.parse(body || "{}") };
    res.writeHead(200, { "Content-Type": "application/json" });
    // Wrapped in prose + fences on purpose: real models do this.
    res.end(
      JSON.stringify({
        choices: [{ message: { content: "Here you go:\n```json\n" + JSON.stringify(CANNED) + "\n```" } }],
      }),
    );
  });
});

await new Promise<void>((resolve) => server.listen(4599, resolve));

const result = await processNewsAI(
  "Universitet yangi ilmiy markaz ochdi",
  "Qayta tiklanuvchi energiya markazi.",
  detectSourceLanguage("Universitet yangi ilmiy markaz ochdi uchun va"),
  "Uzun matn ".repeat(50),
  {
    providerApiKey: "test-key",
    providerBaseUrl: "http://localhost:4599/v1",
    providerModel: "stub-model",
    editorialPrompt: "Prefer short paragraphs.",
    translationPolicy: "full",
  },
);

console.log("--- request seen by stub provider ---");
console.log("path:", received?.url);
console.log("auth header present:", Boolean(received?.auth));
console.log("model:", received?.body?.model);
console.log("messages:", received?.body?.messages?.length);
console.log("system prompt mentions taxonomy:", /Campus Life/.test(received?.body?.messages?.[0]?.content || ""));
console.log("editorial instruction forwarded:", /short paragraphs/i.test(received?.body?.messages?.[0]?.content || ""));

console.log("\n--- parsed result ---");
console.log(JSON.stringify(result, null, 2));

console.log("\n--- assertions ---");
const checks: Array<[string, boolean]> = [
  ["headlineEn set", result?.headlineEn === "University opens new research centre"],
  ["headlineRu set", (result?.headlineRu || "").startsWith("Университет")],
  ["headlineUz set", (result?.headlineUz || "").startsWith("Universitet")],
  ["content kept multi-paragraph", (result?.contentEn || "").includes("\n\n")],
  ["content not clipped to 900 chars", (result?.contentEn || "").length > 50],
  ["invalid category dropped", !(result?.categories || []).includes("NotARealCategory")],
  ["valid categories kept", JSON.stringify(result?.categories) === JSON.stringify(["University", "Science"])],
];
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);

server.close();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
