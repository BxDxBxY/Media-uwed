import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { getAboutPageConfig, setAboutPageConfig } from "@/lib/about-page-config";

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const [about, config] = await Promise.all([
      prisma.aboutContent.findFirst(),
      getAboutPageConfig(),
    ]);
    return NextResponse.json({ about, config });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch about content" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const { config, ...aboutPayload } = body || {};
    const existing = await prisma.aboutContent.findFirst();

    let about;
    if (existing) {
      about = await prisma.aboutContent.update({
        where: { id: existing.id },
        data: aboutPayload,
      });
    } else {
      about = await prisma.aboutContent.create({
        data: aboutPayload,
      });
    }

    const savedConfig = config ? await setAboutPageConfig(config) : await getAboutPageConfig();

    return NextResponse.json({ about, config: savedConfig });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update about content" },
      { status: 500 },
    );
  }
}
