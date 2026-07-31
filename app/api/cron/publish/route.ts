import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { runPublish, type PublishInput } from "@/lib/pipeline/publish";

export const maxDuration = 60;

export async function POST(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, "cron-publish", RATE_LIMITS.pipeline);
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as PublishInput;
    const result = await runPublish(body ?? {});
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Critical error in publish endpoint", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      {
        error: "Failed to publish",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
