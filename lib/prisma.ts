import "dotenv/config";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing. Set it in .env, e.g. postgresql://user:pass@localhost:5432/media_uwed?schema=public",
  );
}

const adapter = new PrismaPg({ connectionString: databaseUrl });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Reuse a single client across hot reloads in development; creating one per reload
// exhausts the database connection pool.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
