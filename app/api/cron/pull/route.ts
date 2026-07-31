import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { runPull, type PullInput } from "@/lib/pipeline/pull";

export const maxDuration = 60; // Allow up to 60 seconds for this endpoint

export async function POST(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, "cron-pull", RATE_LIMITS.pipeline);
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as PullInput;
    const result = await runPull(body ?? {});
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in pull endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to pull RSS feeds",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
