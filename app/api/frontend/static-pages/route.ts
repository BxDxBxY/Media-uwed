import { NextResponse } from "next/server";
import { getStaticPage, type StaticPageSlug } from "@/lib/static-pages";

const validSlugs = new Set<StaticPageSlug>(["privacy-policy", "terms-of-use"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") as StaticPageSlug | null;
  if (!slug || !validSlugs.has(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const page = await getStaticPage(slug);
    return NextResponse.json({ page });
  } catch {
    return NextResponse.json({ error: "Failed to load static page" }, { status: 500 });
  }
}
