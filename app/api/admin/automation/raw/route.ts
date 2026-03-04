import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  deriveTermsFromInstructions,
  matchesRequirements,
  normalizeKeywords,
} from "@/lib/automation-filters";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeKeywords = searchParams.get("includeKeywords") || "";
    const excludeKeywords = searchParams.get("excludeKeywords") || "";
    const aiInstructions = searchParams.get("aiInstructions") || "";
    const aiStrictMode = searchParams.get("aiStrictMode") === "true";

    const include = normalizeKeywords(includeKeywords);
    const exclude = normalizeKeywords(excludeKeywords);
    const instructionTerms = deriveTermsFromInstructions(aiInstructions);
    const effectiveInclude = aiStrictMode ? [...new Set([...include, ...instructionTerms])] : include;

    const items = await prisma.articleRaw.findMany({
      where: {
        processed: { is: null },
      },
      include: {
        source: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const filteredItems = items.filter((item) =>
      matchesRequirements(item, effectiveInclude, exclude),
    );

    return NextResponse.json({
      items: filteredItems,
      totalFetched: items.length,
      filteredCount: filteredItems.length,
      requirementsApplied: effectiveInclude.length > 0 || exclude.length > 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch raw items" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Provide ids array" }, { status: 400 });
    }

    const result = await prisma.articleRaw.deleteMany({
      where: {
        id: { in: ids },
        processed: { is: null },
      },
    });

    return NextResponse.json({ deletedCount: result.count });
  } catch (error) {
    console.error("Failed to delete raw items:", error);
    return NextResponse.json(
      { error: "Failed to delete raw items" },
      { status: 500 },
    );
  }
}
