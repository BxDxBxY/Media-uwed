import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const sources = await prisma.source.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ sources });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { name, feedUrl, category } = await request.json();
    if (!name || !feedUrl) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const source = await prisma.source.create({
      data: { name, feedUrl, category, enabled: true },
    });
    return NextResponse.json({ source });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Source with this URL already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to add source" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id, enabled } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const source = await prisma.source.update({
      where: { id },
      data: { enabled },
    });
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update source" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await prisma.source.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 },
    );
  }
}
