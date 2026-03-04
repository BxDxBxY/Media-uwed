import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
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

    return NextResponse.json({ items });
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
