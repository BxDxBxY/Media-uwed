import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const DEFAULT_AUTOMATION_SETTINGS = {
  includeKeywords: "",
  excludeKeywords: "",
  aiInstructions: "",
  aiStrictMode: false,
  automatedPull: true,
  processing: true,
  translation: true,
  fetchPeriodMinutes: 30,
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePayload(payload: unknown) {
  const body = (payload ?? {}) as Record<string, unknown>;

  return {
    includeKeywords: normalizeString(body.includeKeywords),
    excludeKeywords: normalizeString(body.excludeKeywords),
    aiInstructions: normalizeString(body.aiInstructions),
    aiStrictMode: Boolean(body.aiStrictMode),
    automatedPull: body.automatedPull === undefined ? true : Boolean(body.automatedPull),
    processing: body.processing === undefined ? true : Boolean(body.processing),
    translation: body.translation === undefined ? true : Boolean(body.translation),
    fetchPeriodMinutes:
      typeof body.fetchPeriodMinutes === "number" && Number.isFinite(body.fetchPeriodMinutes)
        ? Math.min(1440, Math.max(5, Math.floor(body.fetchPeriodMinutes)))
        : DEFAULT_AUTOMATION_SETTINGS.fetchPeriodMinutes,
  };
}

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const settings = await prisma.automationConfig.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", ...DEFAULT_AUTOMATION_SETTINGS },
  });

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const payload = normalizePayload(await request.json());
  const settings = await prisma.automationConfig.upsert({
    where: { id: "default" },
    update: payload,
    create: { id: "default", ...DEFAULT_AUTOMATION_SETTINGS, ...payload },
  });

  return NextResponse.json({ settings });
}
