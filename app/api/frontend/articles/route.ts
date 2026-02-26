import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/frontend/articles - List all articles
export async function GET() {
  try {
    const articles = await prisma.article.findMany({
      include: {
        categories: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ articles });
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
