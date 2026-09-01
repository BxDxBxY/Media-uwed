import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function normalizeCategoryInput(category: unknown): string | null {
  if (typeof category !== "string") return null;
  const values = [...new Set(category.split(",").map((item) => item.trim()).filter(Boolean))];
  return values.length ? values.join(", ") : null;
}

async function syncCategories(categoryValue: string | null) {
  if (!categoryValue) return;
  const categories = categoryValue.split(",").map((item) => item.trim()).filter(Boolean);
  await Promise.all(
    categories.map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const mediaData = await request.json();

    if ("category" in mediaData) {
      mediaData.category = normalizeCategoryInput(mediaData.category);
    }

    const media = await prisma.media.update({
      where: { id },
      data: mediaData,
    });

    await syncCategories(media.category);

    return NextResponse.json({ media });
  } catch {
    return NextResponse.json({ error: "Failed to update media" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    await prisma.media.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
