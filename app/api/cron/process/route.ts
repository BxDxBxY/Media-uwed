import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { runProcess, type ProcessInput } from "@/lib/pipeline/process";
import { withRequestId } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes for AI processing

async function handlePost(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, "cron-process", RATE_LIMITS.pipeline);
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as ProcessInput;
    const result = await runProcess(body ?? {});
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in process endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to process articles",
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
