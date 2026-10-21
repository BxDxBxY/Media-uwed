import { PrismaClient } from "../../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: "postgresql://postgres:postgres@localhost:5432/media_uwed?schema=public",
  }),
});

async function test() {
  try {
    const [articles, events, sources, categories, users] = await Promise.all([
      prisma.article.count(),
      prisma.event.count(),
      prisma.source.count(),
      prisma.category.count(),
      prisma.adminUser.count(),
    ]);

    console.log("=== Database Connection Test ===");
    console.log("Status: ✅ CONNECTED");
    console.log("");
    console.log("Table Counts:");
    console.log("  articles:", articles);
    console.log("  events:", events);
    console.log("  sources:", sources);
    console.log("  categories:", categories);
    console.log("  admin_users:", users);

    if (articles > 0) {
      const sample = await prisma.article.findFirst({
        include: { categories: true },
      });
      console.log("");
      console.log("Sample article:", sample?.title);
      console.log("  slug:", sample?.slug);
      console.log(
        "  categories:",
        sample?.categories?.map((c) => c.name).join(", "),
      );
    }

    await prisma.$disconnect();
    console.log("");
    console.log("✅ Database is fully operational!");
  } catch (error) {
    console.error("❌ Database connection failed:", (error as Error).message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

test();
