import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const items = await prisma.articleProcessed.findMany({
      where: {
        status: {
          in: ["pending_review", "ready"],
        },
      },
      include: {
        raw: {
          include: {
            source: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch review items" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id, ids, status, rawImageUrl, ...updates } = await request.json();

    if (Array.isArray(ids) && ids.length > 0) {
      if (!status) {
        return NextResponse.json(
          { error: "Missing status for bulk update" },
          { status: 400 },
        );
      }

      const result = await prisma.articleProcessed.updateMany({
        where: { id: { in: ids } },
        data: { status },
      });

      return NextResponse.json({ updatedCount: result.count });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Missing article ID" },
        { status: 400 },
      );
    }


    if (typeof rawImageUrl === "string") {
      const item = await prisma.articleProcessed.findUnique({ where: { id }, select: { rawId: true } });
      if (item?.rawId) {
        await prisma.articleRaw.update({
          where: { id: item.rawId },
          data: { imageUrl: rawImageUrl.trim() || null },
        });
      }
    }

    const updated = await prisma.articleProcessed.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...updates,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("Failed to update review item:", error);
    return NextResponse.json(
      { error: "Failed to update review item" },
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
      return NextResponse.json(
        { error: "Provide ids array" },
        { status: 400 },
      );
    }

    const result = await prisma.articleProcessed.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ deletedCount: result.count });
  } catch (error) {
    console.error("Failed to delete review items:", error);
    return NextResponse.json(
      { error: "Failed to delete review items" },
      { status: 500 },
    );
  }
}
