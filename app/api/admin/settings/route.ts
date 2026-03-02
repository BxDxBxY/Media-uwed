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

function normalizeSettingsPayload(payload: unknown) {
  const body = (payload ?? {}) as Record<string, unknown>;

  return {
    siteName:
      typeof body.siteName === "string" && body.siteName.trim()
        ? body.siteName.trim()
        : defaultSettings.siteName,
    contactEmail:
      typeof body.contactEmail === "string" && body.contactEmail.trim()
        ? body.contactEmail.trim()
        : defaultSettings.contactEmail,
    siteDescription:
      typeof body.siteDescription === "string" && body.siteDescription.trim()
        ? body.siteDescription.trim()
        : defaultSettings.siteDescription,
    metaTitle:
      typeof body.metaTitle === "string" && body.metaTitle.trim()
        ? body.metaTitle.trim()
        : defaultSettings.metaTitle,
    keywords:
      typeof body.keywords === "string" && body.keywords.trim()
        ? body.keywords.trim()
        : defaultSettings.keywords,
    defaultLanguage:
      body.defaultLanguage === "uz" || body.defaultLanguage === "ru"
        ? body.defaultLanguage
        : "en",
    enableNotifications: Boolean(body.enableNotifications),
    enableComments: Boolean(body.enableComments),
    moderateComments: Boolean(body.moderateComments),
    themeMode:
      body.themeMode === "light" || body.themeMode === "dark"
        ? body.themeMode
        : "system",
  };
}

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
  } catch (error) {
    console.error("Failed to fetch settings", error);
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

    const payload = normalizeSettingsPayload(await request.json());

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: payload,
      create: { id: "default", ...defaultSettings, ...payload },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to save settings", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
