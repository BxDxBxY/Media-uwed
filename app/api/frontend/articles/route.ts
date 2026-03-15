import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildArticleSelect(includeContent: boolean) {
  return {
    id: true,
    title: true,
    titleRu: true,
    titleUz: true,
    summary: true,
    summaryRu: true,
    summaryUz: true,
    ...(includeContent
      ? {
          content: true,
          contentRu: true,
          contentUz: true,
          imageCaption: true,
          imageCaptionRu: true,
          imageCaptionUz: true,
        }
      : {}),
    image: true,
    category: true,
    categories: {
      select: {
        id: true,
        name: true,
      },
    },
    date: true,
    slug: true,
    author: true,
    createdAt: true,
  } as const;
}

// GET /api/frontend/articles - List paginated articles or get single article by slug
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const requestedLimit = parsePositiveInt(searchParams.get("limit"), 12);
    const limit = Math.min(requestedLimit, 100);
    const includeContent = searchParams.get("full") === "1";
    const slug = searchParams.get("slug");

    if (slug) {
      const article = await prisma.article.findUnique({
        where: { slug },
        select: buildArticleSelect(true),
      });

      if (!article) {
        return NextResponse.json({ error: "Article not found" }, { status: 404 });
      }

      return NextResponse.json({ article });
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        select: buildArticleSelect(includeContent),
      }),
      prisma.article.count(),
    ]);

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles", details: error.message },
      { status: 500 },
    );
  }
}

// POST /api/frontend/articles - Create new article
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      titleRu,
      titleUz,
      summary,
      summaryRu,
      summaryUz,
      content,
      contentRu,
      contentUz,
      image,
      imageCaption,
      imageCaptionRu,
      imageCaptionUz,
      category, // Single category string for backward compat
      categories, // Array of category strings
      date,
      slug,
      author,
      url,
    } = body;

    // Validate required fields
    if (!title || !content || !slug) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Handle categories
    const categoryList = categories || (category ? [category] : ["News"]);
    const categoryConnect = await Promise.all(
      categoryList.map(async (name: string) => {
        const cat = await prisma.category.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        return { id: cat.id };
      }),
    );

    const article = await prisma.article.create({
      data: {
        title,
        titleRu: titleRu || null,
        titleUz: titleUz || null,
        summary: summary || content.slice(0, 100) + "...",
        summaryRu: summaryRu || null,
        summaryUz: summaryUz || null,
        content,
        contentRu: contentRu || null,
        contentUz: contentUz || null,
        image: image || `https://picsum.photos/seed/${slug}/800/600`,
        imageCaption: imageCaption || null,
        imageCaptionRu: imageCaptionRu || null,
        imageCaptionUz: imageCaptionUz || null,
        date:
          date ||
          new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        slug,
        author: author || "Admin",
        url: url || null,
        categories: {
          connect: categoryConnect,
        },
      },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating article:", error);
    return NextResponse.json(
      { error: "Failed to create article", details: error.message },
      { status: 500 },
    );
  }
}
