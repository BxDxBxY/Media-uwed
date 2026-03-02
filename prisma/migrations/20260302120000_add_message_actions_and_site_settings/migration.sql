ALTER TABLE "contact_messages" ADD COLUMN "readAt" TIMESTAMP(3);
ALTER TABLE "contact_messages" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT 'University Media Portal',
    "contactEmail" TEXT NOT NULL DEFAULT 'admin@university.edu',
    "siteDescription" TEXT NOT NULL DEFAULT 'The official news and media portal for University students and faculty.',
    "metaTitle" TEXT NOT NULL DEFAULT 'University Media | Latest News & Events',
    "keywords" TEXT NOT NULL DEFAULT 'university, news, events, campus life, research, education',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
    "enableComments" BOOLEAN NOT NULL DEFAULT true,
    "moderateComments" BOOLEAN NOT NULL DEFAULT true,
    "themeMode" TEXT NOT NULL DEFAULT 'system',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
