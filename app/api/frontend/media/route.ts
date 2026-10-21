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

export async function GET() {
  try {
    const media = await prisma.media.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ media });
  } catch {
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { type, title, titleRu, titleUz, url, thumbnail, duration, count, category } = body;

    if (!type || !title || !url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedCategory = normalizeCategoryInput(category);

    const media = await prisma.media.create({
      data: {
        type,
        title,
        titleRu: titleRu || null,
        titleUz: titleUz || null,
        url,
        thumbnail: thumbnail || null,
        duration: duration || null,
        count: count || null,
        category: normalizedCategory,
      },
    });

    await syncCategories(normalizedCategory);

    return NextResponse.json({ media }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create media" }, { status: 500 });
  }
}
