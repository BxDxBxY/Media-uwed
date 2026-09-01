import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runPull } from "@/lib/pipeline/pull";
import { runProcess } from "@/lib/pipeline/process";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { withRequestId } from "@/lib/logger";

export const maxDuration = 300;

/**
 * Scheduler entry point. Point an external cron at this endpoint; it enforces the
 * cadence stored in `AutomationConfig.fetchPeriodMinutes` itself, so calling it more
 * often than needed is harmless.
 *
 *   curl -X POST https://<host>/api/cron/automation \
 *        -H "x-automation-secret: $AUTOMATION_CRON_SECRET"
 */
async function runScheduler(request: Request, forceRun: boolean) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  const settings = await prisma.automationConfig.findUnique({ where: { id: "default" } });
  if (!settings) {
    return NextResponse.json({ error: "Automation settings not initialized" }, { status: 400 });
  }

  const periodMinutes = Math.min(1440, Math.max(5, settings.fetchPeriodMinutes || 30));
  const lastRunAt = settings.lastScheduledRunAt ? new Date(settings.lastScheduledRunAt) : null;
  const now = new Date();

  if (!forceRun && lastRunAt && now.getTime() - lastRunAt.getTime() < periodMinutes * 60_000) {
    return NextResponse.json({
      ran: false,
      reason: "period_not_elapsed",
      nextRunInMinutes: Math.ceil((periodMinutes * 60_000 - (now.getTime() - lastRunAt.getTime())) / 60_000),
      periodMinutes,
    });
  }

  // Claim the slot before doing the work, so two overlapping scheduler calls cannot
  // both run the pipeline.
  await prisma.automationConfig.update({
    where: { id: "default" },
    data: { lastScheduledRunAt: now },
  });

  const pullResult = settings.automatedPull
    ? await runPull({ force: true })
    : { message: "pull_disabled" };

  const processResult = settings.processing
    ? await runProcess({ force: true })
    : { message: "process_disabled" };

  return NextResponse.json({
    ran: true,
    periodMinutes,
    pullResult,
    processResult,
    note: "Published items still require human approval in Admin → Automation.",
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { force?: boolean };
  return withRequestId(request, () => runScheduler(request, body?.force === true));
}

/**
 * Vercel Cron invokes scheduled paths with **GET**, not POST — a POST-only route answers
 * 405 and the pipeline silently never runs in production. Same guard, same work; `force`
 * comes from the query string because a GET has no body.
 */
export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "true";
  return withRequestId(request, () => runScheduler(request, force));
}
