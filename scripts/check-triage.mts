/**
 * Offline checks for topical triage — `npm run check:triage`.
 *
 * Triage decides which queued articles belong on the site, judging each headline against
 * the editorial brief the admin wrote in Admin -> Automation. Two properties matter more
 * than accuracy and are asserted here:
 *
 *  - it must cost one request per batch, not per article. On OpenRouter's free tier the
 *    daily budget is 50 requests, so per-article judging would halve what can be published.
 *  - it must fail *open*. If the model is rate-limited, returns junk, or omits an item,
 *    the article is kept and a human decides. A selection filter that fails closed would
 *    quietly stop the site publishing anything.
 *
 * Runs against a scriptable stub provider on localhost, so no key and no network needed.
 */
import http from "node:http";
import { triageArticles } from "@/lib/pipeline/triage";

let lastBody: any = null;
let script: Array<{ status: number; body: unknown }> = [];
const server = http.createServer((req, res) => {
  let raw = ""; req.on("data", (c) => (raw += c));
  req.on("end", () => {
    lastBody = JSON.parse(raw || "{}");
    const next = script.shift() ?? { status: 200, body: { choices: [{ message: { content: JSON.stringify({ verdicts: [{ n: 1, keep: true, reason: "diplomacy" }, { n: 2, keep: false, reason: "celebrity gossip" }] }) } }] } };
    res.writeHead(next.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(next.body));
  });
});
await new Promise<void>((r) => server.listen(4602, r));

const cfg = { providerApiKey: "k", providerBaseUrl: "http://localhost:4602/v1", providerModel: "stub", fallbackModels: ["stub-2"] };
const candidates = [
  { id: "a", title: "Uzbekistan and Kyrgyzstan sign trade protocol", description: "Diplomatic talks", sourceName: "UzA" },
  { id: "b", title: "Singer buys a new car", description: "Gossip", sourceName: "X" },
];

const checks: Array<[string, boolean]> = [];

// 1) Normal batch
let reqs = 0;
let v = await triageArticles({ candidates, brief: "Cover diplomacy, economy and education of Uzbekistan. Avoid celebrity gossip.", taskConfig: { ...cfg, onProviderRequest: () => reqs++ } });
checks.push(["verdicts returned for every candidate", v?.length === 2]);
checks.push(["relevant item kept", v?.find((x) => x.id === "a")?.keep === true]);
checks.push(["off-brief item rejected", v?.find((x) => x.id === "b")?.keep === false]);
checks.push(["reason captured", (v?.find((x) => x.id === "b")?.reason || "").includes("gossip")]);
checks.push(["one request for the whole batch", reqs === 1]);
checks.push(["brief is in the system prompt", String(lastBody?.messages?.[0]?.content || "").includes("Avoid celebrity gossip")]);
checks.push(["temperature is deterministic", lastBody?.temperature === 0]);
checks.push(["candidates numbered in the user message", String(lastBody?.messages?.[1]?.content || "").includes("2. Singer buys")]);

// 2) No brief -> no opinion, no requests
reqs = 0;
v = await triageArticles({ candidates, brief: "   ", taskConfig: { ...cfg, onProviderRequest: () => reqs++ } });
checks.push(["empty brief spends nothing and returns null", v === null && reqs === 0]);

// 3) Model omits an item -> kept by default
script = [{ status: 200, body: { choices: [{ message: { content: JSON.stringify({ verdicts: [{ n: 2, keep: false, reason: "gossip" }] }) } }] } }];
v = await triageArticles({ candidates, brief: "Cover diplomacy.", taskConfig: cfg });
checks.push(["unjudged item defaults to kept", v?.find((x) => x.id === "a")?.keep === true]);

// 4) Rate limit on the first model -> falls through to the fallback
script = [{ status: 429, body: { error: "rate limited" } }];
reqs = 0;
v = await triageArticles({ candidates, brief: "Cover diplomacy.", taskConfig: { ...cfg, onProviderRequest: () => reqs++ } });
checks.push(["429 falls through to the fallback model", v?.length === 2 && reqs === 2]);

// 5) Unusable output from every model -> null (caller processes everything)
script = [
  { status: 200, body: { choices: [{ message: { content: "sorry, no json" } }] } },
  { status: 200, body: { choices: [{ message: { content: "still none" } }] } },
];
v = await triageArticles({ candidates, brief: "Cover diplomacy.", taskConfig: cfg });
checks.push(["unusable output yields no opinion rather than dropping everything", v === null]);

// 6) Request cap respected
script = [{ status: 429, body: {} }, { status: 429, body: {} }, { status: 429, body: {} }];
reqs = 0;
await triageArticles({ candidates, brief: "Cover diplomacy.", taskConfig: { ...cfg, onProviderRequest: () => reqs++ }, maxRequests: 1 });
checks.push(["request cap honoured", reqs <= 2]);

// 7) <think> preamble tolerated
script = [{ status: 200, body: { choices: [{ message: { content: '<think>{"not":"this"}</think>\n{"verdicts":[{"n":1,"keep":false,"reason":"off"},{"n":2,"keep":true,"reason":"ok"}]}' } }] } }];
v = await triageArticles({ candidates, brief: "Cover diplomacy.", taskConfig: cfg });
checks.push(["reasoning preamble stripped", v?.find((x) => x.id === "a")?.keep === false]);

for (const [n, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${n}`);
console.log(`\n${checks.filter(([, ok]) => ok).length}/${checks.length} passed`);
server.close();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
