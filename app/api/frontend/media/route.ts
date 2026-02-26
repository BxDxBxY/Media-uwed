import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const media = await prisma.media.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ media });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      title,
      titleRu,
      titleUz,
      url,
      thumbnail,
      duration,
      count,
      category,
    } = body;

    if (!type || !title || !url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

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
        category: category || null,
      },
    });

    return NextResponse.json({ media }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to create media" },
      { status: 500 },
    );
  }
}
