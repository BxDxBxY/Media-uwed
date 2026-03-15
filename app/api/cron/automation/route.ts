import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST as pullPost } from "@/app/api/cron/pull/route";
import { POST as processPost } from "@/app/api/cron/process/route";

function canRunCron(request: Request) {
  const expected = process.env.AUTOMATION_CRON_SECRET?.trim();
  if (!expected) return true;
  const provided = request.headers.get("x-automation-secret")?.trim();
  return provided && provided === expected;
}

export async function POST(request: Request) {
  if (!canRunCron(request)) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  const settings = await prisma.automationConfig.findUnique({ where: { id: "default" } });
  if (!settings) {
    return NextResponse.json({ error: "Automation settings not initialized" }, { status: 400 });
  }

  const periodMinutes = Math.min(1440, Math.max(5, settings.fetchPeriodMinutes || 30));
  const lastRunAt = settings.lastScheduledRunAt ? new Date(settings.lastScheduledRunAt) : null;
  const now = new Date();

  if (lastRunAt && now.getTime() - lastRunAt.getTime() < periodMinutes * 60_000) {
    return NextResponse.json({
      ran: false,
      reason: "period_not_elapsed",
      nextRunInMinutes: Math.ceil((periodMinutes * 60_000 - (now.getTime() - lastRunAt.getTime())) / 60_000),
      periodMinutes,
    });
  }

  const pullResponse = settings.automatedPull
    ? await pullPost(new Request("http://internal/api/cron/pull", { method: "POST", body: JSON.stringify({ force: true }) }))
    : NextResponse.json({ message: "pull_disabled" });

  const processResponse = settings.processing
    ? await processPost(new Request("http://internal/api/cron/process", { method: "POST", body: JSON.stringify({ force: true }) }))
    : NextResponse.json({ message: "process_disabled" });

  const pullResult = await pullResponse.json().catch(() => ({}));
  const processResult = await processResponse.json().catch(() => ({}));

  await prisma.automationConfig.update({
    where: { id: "default" },
    data: { lastScheduledRunAt: now },
  });

  return NextResponse.json({
    ran: true,
    periodMinutes,
    pullResult,
    processResult,
    note: "Configure an external scheduler (e.g. Vercel Cron) to call this endpoint periodically.",
  });
}
