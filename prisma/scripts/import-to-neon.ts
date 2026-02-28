import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const data = JSON.parse(fs.readFileSync("backup.json", "utf-8"));

  await prisma.category.createMany({ data: data.categories });
  await prisma.event.createMany({ data: data.events });
  await prisma.media.createMany({ data: data.media });
  await prisma.subscriber.createMany({ data: data.subscribers });
  await prisma.contactMessage.createMany({ data: data.messages });
  await prisma.aboutContent.createMany({ data: data.about });

  for (const a of data.articles) {
    const { categories, ...rest } = a;
    await prisma.article.create({
      data: {
        ...rest,
        categories: {
          connect: categories.map((c: any) => ({ name: c.name })),
        },
      },
    });
  }

  console.log("Import complete");
}

main().finally(() => prisma.$disconnect());