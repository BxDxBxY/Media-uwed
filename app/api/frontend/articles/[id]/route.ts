import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function resolveCategories(input: unknown): Promise<Array<{ id: string }> | null> {
  const rawList = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];

  const names = Array.from(new Set(rawList.map((name) => String(name || "").trim()).filter(Boolean)));
  if (names.length === 0) return null;

  const connected = await Promise.all(
    names.map(async (name) => {
      const category = await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      return { id: category.id };
    }),
  );

  return connected;
}

// PUT /api/frontend/articles/[id] - Update article
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const categoryInput = body.categories || body.category;
    const categoryConnect = await resolveCategories(categoryInput);

    const article = await prisma.article.update({
      where: { id },
      data: {
        ...(typeof body.title === "string" && body.title.trim() ? { title: body.title.trim() } : {}),
        ...(typeof body.titleRu === "string" ? { titleRu: body.titleRu.trim() || null } : {}),
        ...(typeof body.titleUz === "string" ? { titleUz: body.titleUz.trim() || null } : {}),
        ...(typeof body.summary === "string" ? { summary: body.summary.trim() } : {}),
        ...(typeof body.summaryRu === "string" ? { summaryRu: body.summaryRu.trim() || null } : {}),
        ...(typeof body.summaryUz === "string" ? { summaryUz: body.summaryUz.trim() || null } : {}),
        ...(typeof body.content === "string" ? { content: body.content } : {}),
        ...(typeof body.contentRu === "string" ? { contentRu: body.contentRu || null } : {}),
        ...(typeof body.contentUz === "string" ? { contentUz: body.contentUz || null } : {}),
        ...(typeof body.image === "string" ? { image: body.image.trim() || "" } : {}),
        ...(typeof body.imageCaption === "string" ? { imageCaption: body.imageCaption.trim() || null } : {}),
        ...(typeof body.imageCaptionRu === "string" ? { imageCaptionRu: body.imageCaptionRu.trim() || null } : {}),
        ...(typeof body.imageCaptionUz === "string" ? { imageCaptionUz: body.imageCaptionUz.trim() || null } : {}),
        ...(typeof body.date === "string" && body.date.trim() ? { date: body.date.trim() } : {}),
        ...(typeof body.slug === "string" && body.slug.trim() ? { slug: body.slug.trim() } : {}),
        ...(typeof body.author === "string" && body.author.trim() ? { author: body.author.trim() } : {}),
        ...(typeof body.url === "string" ? { url: body.url.trim() || null } : {}),
        ...(categoryConnect ? { categories: { set: categoryConnect } } : {}),
      },
      include: { categories: true },
    });

    return NextResponse.json({ article });
  } catch (error: any) {
    console.error("Error updating article:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 },
    );
  }
}

// DELETE /api/frontend/articles/[id] - Delete article
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.article.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting article:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 },
    );
  }
}
