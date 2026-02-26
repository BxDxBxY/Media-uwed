import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const { articleId } = await request.json();
    if (!articleId)
      return NextResponse.json({ error: "No articleId" }, { status: 400 });

    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "127.0.0.1";
    const date = new Date().toISOString().split("T")[0];
    const identifier = `${ip}-${date}`;

    const existing = await prisma.articleView.findFirst({
      where: {
        articleId,
        visitorIdentifier: identifier,
      },
    });

    if (!existing) {
      await prisma.$transaction([
        prisma.articleView.create({
          data: { articleId, visitorIdentifier: identifier },
        }),
        prisma.article.update({
          where: { id: articleId },
          data: { views: { increment: 1 } },
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to record view" },
      { status: 500 },
    );
  }
}
