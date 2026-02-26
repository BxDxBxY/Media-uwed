import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { articleId, visitorIdentifier } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID required" },
        { status: 400 },
      );
    }

    // Increment view count and record view
    await prisma.$transaction([
      prisma.article.update({
        where: { id: articleId },
        data: { views: { increment: 1 } },
      }),
      prisma.articleView.create({
        data: {
          articleId,
          visitorIdentifier: visitorIdentifier || "anonymous",
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error recording view:", error);
    return NextResponse.json(
      { error: "Failed to record view" },
      { status: 500 },
    );
  }
}
