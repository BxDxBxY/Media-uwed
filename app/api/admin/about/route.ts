import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const about = await prisma.aboutContent.findFirst();
    return NextResponse.json({ about });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch about content" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const existing = await prisma.aboutContent.findFirst();

    let about;
    if (existing) {
      about = await prisma.aboutContent.update({
        where: { id: existing.id },
        data: body,
      });
    } else {
      about = await prisma.aboutContent.create({
        data: body,
      });
    }

    return NextResponse.json({ about });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update about content" },
      { status: 500 },
    );
  }
}
