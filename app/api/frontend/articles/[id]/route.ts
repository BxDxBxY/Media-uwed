import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/frontend/articles/[id] - Update article
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, summary, content, image, category, date, slug, author } =
      body;

    const article = await prisma.article.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(summary && { summary }),
        ...(content && { content }),
        ...(image && { image }),
        ...(category && { category }),
        ...(date && { date }),
        ...(slug && { slug }),
        ...(author && { author }),
      },
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
