import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const defaultSettings = {
  siteName: "University Media Portal",
  contactEmail: "admin@university.edu",
  siteDescription:
    "The official news and media portal for University students and faculty.",
  metaTitle: "University Media | Latest News & Events",
  keywords: "university, news, events, campus life, research, education",
  defaultLanguage: "en",
  enableNotifications: true,
  enableComments: true,
  moderateComments: true,
  themeMode: "system",
};

export async function GET(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", ...defaultSettings },
    });

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;

    const payload = await request.json();

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        siteName: payload.siteName,
        contactEmail: payload.contactEmail,
        siteDescription: payload.siteDescription,
        metaTitle: payload.metaTitle,
        keywords: payload.keywords,
        defaultLanguage: payload.defaultLanguage,
        enableNotifications: payload.enableNotifications,
        enableComments: payload.enableComments,
        moderateComments: payload.moderateComments,
        themeMode: payload.themeMode,
      },
      create: { id: "default", ...defaultSettings, ...payload },
    });

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
