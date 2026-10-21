import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Daily budget for AI provider requests.
 *
 * OpenRouter's free tier allows 20 requests/minute and 50 requests/day per account,
 * shared across every `:free` model (1000/day once $10 of credit has been purchased).
 * The pipeline spends one request per article, so an unmetered cron run over a backlog
 * of a few hundred queued articles burns the day's quota in its first batch and then
 * quietly downgrades everything else to the heuristic pipeline.
 *
 * Metering it here means the operator sees "budget spent, N articles left for tomorrow"
 * instead of discovering a day of weak articles after the fact.
 */

/**
 * Default cap, below the free tier's 50 so the admin assistant chat and manual
 * re-translations still have room after a full automated day.
 */
const DEFAULT_DAILY_LIMIT = 40;

export type AiUsage = {
  day: string;
  used: number;
  /** 0 when unlimited. */
  limit: number;
  /** `Infinity` when unlimited. */
  remaining: number;
  unlimited: boolean;
};

/**
 * `AI_DAILY_REQUEST_LIMIT` requests per UTC day. Set it to `0` to disable metering —
 * correct for paid models, where the cost per article matters but the request count
 * does not.
 */
export function dailyRequestLimit(): number {
  const raw = (process.env.AI_DAILY_REQUEST_LIMIT || "").trim();
  if (!raw) return DEFAULT_DAILY_LIMIT;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    logger.warn("AI_DAILY_REQUEST_LIMIT is not a non-negative number; using the default", {
      value: raw,
      default: DEFAULT_DAILY_LIMIT,
    });
    return DEFAULT_DAILY_LIMIT;
  }

  return Math.floor(parsed);
}

/** UTC calendar day, matching how OpenRouter resets the free quota. */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function getAiUsage(now: Date = new Date()): Promise<AiUsage> {
  const day = utcDay(now);
  const limit = dailyRequestLimit();
  const row = await prisma.aiUsageDay.findUnique({ where: { day } });
  const used = row?.requests ?? 0;

  return {
    day,
    used,
    limit,
    remaining: limit === 0 ? Infinity : Math.max(0, limit - used),
    unlimited: limit === 0,
  };
}

/**
 * Adds to today's counter. Called after requests have been sent, including failed ones —
 * a rejected request still counts against OpenRouter's rate limit.
 */
export async function recordAiRequests(count: number, now: Date = new Date()): Promise<void> {
  if (!Number.isFinite(count) || count <= 0) return;

  const day = utcDay(now);
  const requests = Math.floor(count);

  try {
    await prisma.aiUsageDay.upsert({
      where: { day },
      create: { day, requests },
      update: { requests: { increment: requests } },
    });
  } catch (error) {
    // Losing a counter update must never fail an article that was processed fine.
    logger.error("Failed to record AI request usage", {
      day,
      requests,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
