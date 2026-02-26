import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const mediaData = await request.json();
    const media = await prisma.media.update({
      where: { id },
      data: mediaData,
    });
    return NextResponse.json({ media });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update media" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.media.delete({
      where: { id },
    });
    await prisma.media.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 },
    );
  }
}
