import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { runPull, type PullInput } from "@/lib/pipeline/pull";
import { withRequestId } from "@/lib/logger";

export const maxDuration = 60; // Allow up to 60 seconds for this endpoint

async function handlePost(request: Request) {
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

/** Wrapped so every log line from one pipeline run shares a request id. */
export async function POST(request: Request) {
  return withRequestId(request, () => handlePost(request));
}
