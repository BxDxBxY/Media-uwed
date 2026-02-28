import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "fs";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" }),
});

async function main() {
  const data = {
    articles: await prisma.article.findMany({ include: { categories: true } }),
    categories: await prisma.category.findMany(),
    events: await prisma.event.findMany(),
    media: await prisma.media.findMany(),
    about: await prisma.aboutContent.findMany(),
    subscribers: await prisma.subscriber.findMany(),
    messages: await prisma.contactMessage.findMany(),
  };

  fs.writeFileSync("backup.json", JSON.stringify(data, null, 2));
  console.log("Exported to backup.json");
}

main().finally(() => prisma.$disconnect());