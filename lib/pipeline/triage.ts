import axios from "axios";
import { logger } from "@/lib/logger";
import { DEFAULT_AI_MODEL, DEFAULT_FALLBACK_MODELS, parseModelList, type AiTaskConfig } from "@/lib/ai";

/**
 * Topical triage: decides which queued articles belong on this site, using the editorial
 * brief the admin wrote in Admin → Automation.
 *
 * Why this exists. The brief used to be turned into keywords by
 * `deriveTermsFromInstructions`, which was wrong in two ways that both failed silently:
 * it stripped everything outside `[a-z0-9]`, so a brief written in Russian or Uzbek
 * produced an empty term list and filtered nothing at all; and it harvested terms from
 * the whole text including negations, so "avoid politics" added *politics* to the list of
 * words an article had to contain. A brief is prose about intent — judging it needs a
 * model, not a tokenizer.
 *
 * Why one batched request. The free tier allows 50 requests a day. Judging articles one at
 * a time would double the cost of every article and halve the number that can be
 * published. Instead every candidate headline goes into a single request — 40 headlines
 * cost the same one request as one — and the verdicts are persisted on `ArticleRaw` so a
 * rejected item is never judged twice.
 */

export type TriageCandidate = {
  id: string;
  title: string;
  description?: string | null;
  sourceName?: string | null;
};

export type TriageVerdict = {
  id: string;
  keep: boolean;
  reason: string;
};

/**
 * Headlines per request. Large enough that triage costs a rounding error against the daily
 * budget, small enough that the response cannot outgrow the completion cap.
 */
const BATCH_SIZE = 40;

/** Teaser characters per candidate — enough to judge a topic, short enough to stay cheap. */
const TEASER_CHARS = 220;

const RETRYABLE_STATUSES = new Set([402, 408, 409, 429, 500, 502, 503, 504, 524]);

function buildPrompt(brief: string, batch: TriageCandidate[]): { system: string; user: string } {
  const system = [
    "You are the assignment editor of a news desk. You decide which wire stories belong on",
    "this outlet and which are off-topic. You do not rewrite anything.",
    "",
    "The editor-in-chief's brief, which defines what this outlet covers:",
    "---",
    brief.trim(),
    "---",
    "",
    "For every numbered item, decide whether it fits the brief.",
    "Rules:",
    "- Judge only against the brief. Do not apply your own idea of what is newsworthy.",
    "- Follow exclusions in the brief as strictly as inclusions.",
    "- When an item is borderline, keep it: a human reviews everything before publication.",
    "- `reason`: at most 12 words, in English, naming the deciding factor.",
    "",
    "Respond with JSON only, no commentary, in exactly this shape:",
    '{"verdicts":[{"n":1,"keep":true,"reason":"..."},{"n":2,"keep":false,"reason":"..."}]}',
    "Include every item number exactly once.",
  ].join("\n");

  const user = batch
    .map((candidate, index) => {
      const teaser = String(candidate.description || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, TEASER_CHARS);

      return [
        `${index + 1}. ${candidate.title.replace(/\s+/g, " ").trim()}`,
        candidate.sourceName ? `   source: ${candidate.sourceName}` : null,
        teaser ? `   teaser: ${teaser}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return { system, user };
}

function parseVerdicts(raw: string, batch: TriageCandidate[]): TriageVerdict[] | null {
  const text = String(raw || "")
    .replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, "")
    .trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  const list = (parsed as { verdicts?: unknown })?.verdicts;
  if (!Array.isArray(list)) return null;

  const byNumber = new Map<number, { keep: boolean; reason: string }>();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const n = Number(record.n);
    if (!Number.isInteger(n) || n < 1 || n > batch.length) continue;

    byNumber.set(n, {
      keep: record.keep !== false,
      reason: String(record.reason ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
    });
  }

  if (byNumber.size === 0) return null;

  // An item the model skipped is kept: dropping articles because a model omitted a line
  // would silently shrink the queue, and a human reviews everything anyway.
  return batch.map((candidate, index) => {
    const verdict = byNumber.get(index + 1);
    return {
      id: candidate.id,
      keep: verdict ? verdict.keep : true,
      reason: verdict?.reason || (verdict ? "" : "not judged; kept by default"),
    };
  });
}

async function judgeBatch(
  batch: TriageCandidate[],
  brief: string,
  taskConfig: AiTaskConfig,
): Promise<TriageVerdict[] | null> {
  const apiKey = (taskConfig.providerApiKey || process.env.OPENROUTER_API_KEY || "").trim();
  const baseUrl = (taskConfig.providerBaseUrl || "").trim() || "https://openrouter.ai/api/v1";
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|\[::1\]/.test(url);
  const safeKey = apiKey || (isLocal ? "local-model" : "");

  if (!safeKey) return null;

  const candidates = Array.from(
    new Set(
      [
        (taskConfig.providerModel || DEFAULT_AI_MODEL).trim(),
        ...(taskConfig.fallbackModels ??
          (parseModelList(process.env.OPENROUTER_FALLBACK_MODELS).length > 0
            ? parseModelList(process.env.OPENROUTER_FALLBACK_MODELS)
            : DEFAULT_FALLBACK_MODELS)),
      ].filter(Boolean),
    ),
  );

  const { system, user } = buildPrompt(brief, batch);

  for (const model of candidates) {
    try {
      const res = await axios.post(
        url,
        {
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          // Selection should be reproducible, so no creative sampling.
          temperature: 0,
          stream: false,
        },
        {
          timeout: 120_000,
          headers: {
            Authorization: `Bearer ${safeKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      taskConfig.onProviderRequest?.({ model, status: res.status, ok: true });

      const verdicts = parseVerdicts(res.data?.choices?.[0]?.message?.content ?? "", batch);
      if (verdicts) {
        logger.info("Triage batch judged", {
          model,
          judged: batch.length,
          kept: verdicts.filter((v) => v.keep).length,
        });
        return verdicts;
      }

      logger.warn("Triage output was not usable JSON; trying the next model", { model });
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status ?? null : null;
      taskConfig.onProviderRequest?.({ model, status, ok: false });
      logger.error("Triage request failed", {
        model,
        status,
        message: error instanceof Error ? error.message : String(error),
      });

      if (status === 401 || status === 403) return null;
      if (status !== null && !RETRYABLE_STATUSES.has(status)) return null;
    }
  }

  return null;
}

/**
 * Judges every candidate against the brief.
 *
 * Returns `null` when triage could not run at all (no brief, no provider key, every model
 * failed). Callers must treat `null` as "no opinion" and process everything — a filter
 * that fails closed would stop the site publishing entirely.
 */
export async function triageArticles(input: {
  candidates: TriageCandidate[];
  brief: string;
  taskConfig: AiTaskConfig;
  /** Cap on provider requests triage may spend, so it cannot eat the day's budget. */
  maxRequests?: number;
}): Promise<TriageVerdict[] | null> {
  const brief = String(input.brief || "").trim();
  if (!brief || input.candidates.length === 0) return null;

  const maxRequests = Math.max(1, input.maxRequests ?? 3);
  const verdicts: TriageVerdict[] = [];
  let requestsUsed = 0;

  // Count what actually went over the wire, not batches: a batch that falls through the
  // model chain spends several requests, and the caller's budget is in requests.
  const taskConfig: AiTaskConfig = {
    ...input.taskConfig,
    onProviderRequest: (info) => {
      requestsUsed++;
      input.taskConfig.onProviderRequest?.(info);
    },
  };

  for (let offset = 0; offset < input.candidates.length; offset += BATCH_SIZE) {
    if (requestsUsed >= maxRequests) {
      logger.warn("Triage stopped at its request cap; the rest of the queue is untouched", {
        judged: verdicts.length,
        remaining: input.candidates.length - verdicts.length,
      });
      break;
    }

    const batch = input.candidates.slice(offset, offset + BATCH_SIZE);
    const batchVerdicts = await judgeBatch(batch, brief, taskConfig);

    if (!batchVerdicts) {
      logger.warn("Triage batch failed; those articles keep no verdict", { size: batch.length });
      continue;
    }

    verdicts.push(...batchVerdicts);
  }

  return verdicts.length > 0 ? verdicts : null;
}
