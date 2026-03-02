ALTER TABLE "contact_messages" ADD COLUMN "repliedAt" TIMESTAMP(3);
ALTER TABLE "contact_messages" ADD COLUMN "lastReplySubject" TEXT;

CREATE TABLE "admin_broadcast_logs" (
    "id" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_broadcast_logs_pkey" PRIMARY KEY ("id")
);
