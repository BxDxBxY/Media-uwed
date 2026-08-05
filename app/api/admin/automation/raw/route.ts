import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { matchesRequirements, normalizeKeywords } from "@/lib/automation-filters";

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const includeKeywords = searchParams.get("includeKeywords") || "";
    const excludeKeywords = searchParams.get("excludeKeywords") || "";
    const applyFilters = searchParams.get("applyFilters") === "1";
    // The queue hides off-brief articles by default; `showRejected=1` brings them back so
    // an editor can see what the brief threw away and override it.
    const showRejected = searchParams.get("showRejected") === "1";

    const include = normalizeKeywords(includeKeywords);
    const exclude = normalizeKeywords(excludeKeywords);

    const items = await prisma.articleRaw.findMany({
      where: {
        processed: { is: null },
        // `NULL <> 'rejected'` is NULL in SQL, so un-judged items need an explicit branch.
        ...(showRejected ? {} : { OR: [{ relevance: null }, { relevance: { not: "rejected" } }] }),
      },
      include: {
        source: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const filteredItems = applyFilters
      ? items.filter((item) => matchesRequirements(item, include, exclude))
      : items;

    const rejectedCount = await prisma.articleRaw.count({
      where: { processed: { is: null }, relevance: "rejected" },
    });

    return NextResponse.json({
      items: filteredItems,
      totalFetched: items.length,
      filteredCount: filteredItems.length,
      requirementsApplied: include.length > 0 || exclude.length > 0,
      rejectedOffBrief: rejectedCount,
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
