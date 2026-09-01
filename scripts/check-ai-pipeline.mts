/**
 * Smoke check for the LLM editorial path — `npm run check:ai`.
 *
 * Starts a scriptable OpenAI-compatible stub provider on localhost and drives
 * `processNewsAI` through the behaviours that matter on OpenRouter's free tier:
 * fenced JSON is parsed, the category taxonomy is enforced, paragraphs survive, the
 * admin's editorial prompt is forwarded, a rate-limited model falls through to the next
 * one, a rejected `response_format` is retried without it, reasoning preambles are
 * stripped, and the per-article request cap is honoured.
 *
 * Requires no real provider key and no network access. Exits non-zero if any assertion
 * fails, so it can be wired into CI.
 */
import http from "node:http";
import { processNewsAI, detectSourceLanguage } from "@/lib/ai";

const PORT = 4599;
const BASE_URL = `http://localhost:${PORT}/v1`;

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

type SeenRequest = {
  model: string;
  jsonMode: boolean;
  maxTokens: number | null;
  hasAuth: boolean;
  system: string;
};

/** Responses handed out in order; once empty the stub answers with valid JSON. */
let script: Array<{ status: number; body: unknown }> = [];
let seen: SeenRequest[] = [];

const asChoice = (content: string) => ({ choices: [{ message: { content } }] });
/** Real models like to wrap the object in prose and fences. */
const fenced = (value: unknown) => `Here you go:\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\``;

const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    seen.push({
      model: String(body.model || ""),
      jsonMode: Boolean(body.response_format),
      maxTokens: typeof body.max_tokens === "number" ? body.max_tokens : null,
      hasAuth: Boolean(req.headers.authorization),
      system: String(body.messages?.[0]?.content || ""),
    });

    const next = script.shift() ?? { status: 200, body: asChoice(fenced(CANNED)) };
    res.writeHead(next.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(next.body));
  });
});

await new Promise<void>((resolve) => server.listen(PORT, resolve));

const checks: Array<[string, boolean]> = [];
const check = (name: string, ok: boolean) => checks.push([name, ok]);

/**
 * Runs one scenario. `translationPolicy: "disabled"` on the failure scenarios keeps the
 * heuristic fallback from calling the public translation services, so the check stays
 * offline and fast.
 */
async function scenario(
  responses: Array<{ status: number; body: unknown }>,
  config: Parameters<typeof processNewsAI>[4] = {},
) {
  script = responses;
  seen = [];
  let requestsCounted = 0;

  const result = await processNewsAI(
    "Universitet yangi ilmiy markaz ochdi",
    "Qayta tiklanuvchi energiya markazi.",
    detectSourceLanguage("Universitet yangi ilmiy markaz ochdi uchun va"),
    "Uzun matn ".repeat(50),
    {
      providerApiKey: "test-key",
      providerBaseUrl: BASE_URL,
      providerModel: "stub-primary",
      fallbackModels: ["stub-fallback-1", "stub-fallback-2"],
      editorialPrompt: "Prefer short paragraphs.",
      ...config,
      onProviderRequest: () => {
        requestsCounted++;
      },
    },
  );

  return { result, requests: seen, requestsCounted };
}

// 1) Happy path: prose-wrapped fenced JSON, taxonomy enforcement, prompt forwarding.
{
  const { result, requests } = await scenario([], { translationPolicy: "full" });

  console.log("--- happy path ---");
  console.log("path:", `${BASE_URL}/chat/completions`);
  console.log("model:", requests[0]?.model, "| json mode:", requests[0]?.jsonMode, "| max_tokens:", requests[0]?.maxTokens);
  console.log(JSON.stringify(result, null, 2));

  check("auth header sent", requests[0]?.hasAuth === true);
  check("json mode requested first", requests[0]?.jsonMode === true);
  check("completion cap raised for three languages", (requests[0]?.maxTokens ?? 0) >= 4000);
  check("system prompt mentions taxonomy", /Campus Life/.test(requests[0]?.system || ""));
  check("editorial instruction forwarded", /short paragraphs/i.test(requests[0]?.system || ""));
  check("one request for one article", requests.length === 1);
  check("headlineEn set", result?.headlineEn === "University opens new research centre");
  check("headlineRu set", (result?.headlineRu || "").startsWith("Университет"));
  check("headlineUz set", (result?.headlineUz || "").startsWith("Universitet"));
  check("content kept multi-paragraph", (result?.contentEn || "").includes("\n\n"));
  check("content not clipped to 900 chars", (result?.contentEn || "").length > 50);
  check("invalid category dropped", !(result?.categories || []).includes("NotARealCategory"));
  check(
    "valid categories kept",
    JSON.stringify(result?.categories) === JSON.stringify(["University", "Science"]),
  );
}

// 2) Rate-limited primary (the everyday free-tier failure) falls through to the next model.
{
  const { result, requests, requestsCounted } = await scenario(
    [{ status: 429, body: { error: { message: "Rate limit exceeded" } } }],
    { translationPolicy: "disabled" },
  );

  check("429 moves to the fallback model", requests[1]?.model === "stub-fallback-1");
  check("fallback produced an article", Boolean(result?.headlineUz));
  check("both requests were metered", requestsCounted === 2);
}

// 3) An endpoint that rejects `response_format` is retried with a plain body, same model.
{
  const { result, requests } = await scenario(
    [{ status: 400, body: { error: { message: "response_format is not supported" } } }],
    { translationPolicy: "disabled" },
  );

  check("400 retries the same model", requests[1]?.model === "stub-primary");
  check("retry drops json mode", requests[1]?.jsonMode === false);
  check("retry drops the completion cap", requests[1]?.maxTokens === null);
  check("plain-body retry produced an article", Boolean(result?.headlineUz));
}

// 4) Reasoning models emit a <think> block before the answer.
{
  const { result } = await scenario(
    [
      {
        status: 200,
        body: asChoice(
          `<think>The user wants JSON. { not: "this object" }</think>\n${JSON.stringify(CANNED)}`,
        ),
      },
    ],
    { translationPolicy: "disabled" },
  );

  check("reasoning preamble stripped", result?.headlineEn === "University opens new research centre");
}

// 5) A reasoning model that spends its whole budget thinking returns an empty message.
{
  const { result, requests } = await scenario(
    [{ status: 200, body: { choices: [{ message: { content: "" }, finish_reason: "length" }] } }],
    { translationPolicy: "disabled" },
  );

  check("empty message moves to the fallback model", requests[1]?.model === "stub-fallback-1");
  check("fallback recovered the article", Boolean(result?.headlineUz));
}

// 6) Unusable output (not JSON at all) is not published as an article.
{
  const { result, requests } = await scenario(
    [
      { status: 200, body: asChoice("I'd be happy to help! Which language would you like?") },
      { status: 200, body: asChoice("still not json") },
      { status: 200, body: asChoice("nope") },
    ],
    { translationPolicy: "disabled" },
  );

  check("every model tried before giving up", requests.length === 3);
  check(
    "unparseable output does not become the article",
    !(result?.contentEn || "").includes("still not json"),
  );
}

// 7) The per-article cap protects the daily quota.
{
  const { requests, requestsCounted } = await scenario(
    [
      { status: 429, body: { error: { message: "Rate limit exceeded" } } },
      { status: 429, body: { error: { message: "Rate limit exceeded" } } },
      { status: 429, body: { error: { message: "Rate limit exceeded" } } },
    ],
    { translationPolicy: "disabled", maxProviderRequests: 2 },
  );

  check("request cap honoured", requests.length === 2 && requestsCounted === 2);
}

// 8) Bad credentials fail the same way for every model, so the chain stops at once.
{
  const { requests } = await scenario(
    [{ status: 401, body: { error: { message: "No auth credentials found" } } }],
    { translationPolicy: "disabled" },
  );

  check("401 aborts instead of trying every model", requests.length === 1);
}

console.log("\n--- assertions ---");
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
console.log(`\n${checks.filter(([, ok]) => ok).length}/${checks.length} passed`);

server.close();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
