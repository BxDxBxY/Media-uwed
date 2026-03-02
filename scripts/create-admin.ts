import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/admin-auth";

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !email || !password) {
    throw new Error(
      "Missing required env vars. Set ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD.",
    );
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const admin = await (prisma as any).adminUser.upsert({
    where: { email },
    update: {
      username,
      passwordHash: hashPassword(password),
      role: "admin",
    },
    create: {
      username,
      email,
      passwordHash: hashPassword(password),
      role: "admin",
    },
  });

  console.log("Admin user ready:", {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
  });
}

main()
  .catch((error) => {
    console.error("Failed to create admin user:", error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
