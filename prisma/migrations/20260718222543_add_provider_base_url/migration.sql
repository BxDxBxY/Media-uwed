/*
  Warnings:

  - You are about to drop the column `lastReplySubject` on the `contact_messages` table. All the data in the column will be lost.
  - You are about to drop the column `repliedAt` on the `contact_messages` table. All the data in the column will be lost.
  - You are about to drop the `admin_broadcast_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "automation_configs" ALTER COLUMN "lastScheduledRunAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "contact_messages" DROP COLUMN "lastReplySubject",
DROP COLUMN "repliedAt";

-- AlterTable
ALTER TABLE "integration_configs" ADD COLUMN     "providerBaseUrl" TEXT DEFAULT 'https://openrouter.ai/api/v1';

-- DropTable
DROP TABLE "admin_broadcast_logs";
