import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getStaticPage, setStaticPage, type StaticPageSlug } from "@/lib/static-pages";

const validSlugs = new Set<StaticPageSlug>(["privacy-policy", "terms-of-use"]);

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

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

export async function PUT(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const slug = String(body.slug || "") as StaticPageSlug;
    if (!validSlugs.has(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const page = await setStaticPage({
      slug,
      title,
      titleRu: String(body.titleRu || "").trim(),
      titleUz: String(body.titleUz || "").trim(),
      content,
      contentRu: String(body.contentRu || "").trim(),
      contentUz: String(body.contentUz || "").trim(),
    });

    return NextResponse.json({ page });
  } catch {
    return NextResponse.json({ error: "Failed to save static page" }, { status: 500 });
  }
}
