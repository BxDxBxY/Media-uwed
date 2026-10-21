-- Brings the migration history in line with prisma/schema.prisma.
--
-- The four `admin_users` columns below were previously applied to development
-- databases with `prisma db push` and had no migration, so `prisma migrate deploy`
-- produced a schema the application could not run against.
-- Written to be safe to re-run on a database that already has them.

-- AlterTable: admin approval + password reset support
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP(3);
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_resetToken_key" ON "admin_users"("resetToken");

-- CreateTable: admin assistant memory / pending tool actions
CREATE TABLE IF NOT EXISTS "assistant_memory" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "role" TEXT,
    "content" TEXT NOT NULL,
    "token" TEXT,
    "actionType" TEXT,
    "target" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "assistant_memory_token_key" ON "assistant_memory"("token");
CREATE INDEX IF NOT EXISTS "assistant_memory_kind_createdAt_idx" ON "assistant_memory"("kind", "createdAt");
