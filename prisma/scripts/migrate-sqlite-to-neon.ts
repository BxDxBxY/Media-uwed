import "dotenv/config";
import { PrismaClient as PrismaNeon } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient as PrismaSqlite } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const SQLITE_URL = "file:./prisma/dev.db"; // your old local DB
const NEON_URL = process.env.DATABASE_URL!; // your Neon URL

const sqlite = new PrismaSqlite({
  adapter: new PrismaBetterSqlite3({ url: SQLITE_URL }),
});

const neon = new PrismaNeon({
  adapter: new PrismaPg({ connectionString: NEON_URL }),
});

async function main() {
  // Example: copy categories first (because articles link to them)
  const categories = await sqlite.category.findMany();
  for (const c of categories) {
    await neon.category.upsert({
      where: { name: c.name },
      update: {},
      create: { id: c.id, name: c.name },
    });
  }

  // Then articles (and connect categories)
  const articles = await sqlite.article.findMany({ include: { categories: true } });
  for (const a of articles) {
    await neon.article.upsert({
      where: { slug: a.slug },
      update: {
        // update fields as you want
      },
      create: {
        ...a,
        categories: {
          connect: a.categories.map((c) => ({ name: c.name })),
        },
      },
    });
  }

  // Repeat similarly for events, media, aboutContent, subscribers, etc.
}

main()
  .then(() => console.log("Done"))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await sqlite.$disconnect();
    await neon.$disconnect();
  });