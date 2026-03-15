import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAboutPageConfig } from "@/lib/about-page-config";

export async function GET() {
  try {
    const [about, config] = await Promise.all([
      prisma.aboutContent.findFirst(),
      getAboutPageConfig(),
    ]);

    return NextResponse.json({ about, config });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch about content" },
      { status: 500 },
    );
  }
}
