import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
    const { id, status, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing article ID" },
        { status: 400 },
      );
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
