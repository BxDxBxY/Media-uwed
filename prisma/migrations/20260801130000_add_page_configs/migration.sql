-- Editable page documents (currently the About page) get their own table.
--
-- They were stored in `contact_messages` under the magic subject `__about_page_config__`,
-- and every save inserted a new row rather than updating one, so internal configuration
-- piled up inside the public contact inbox.
CREATE TABLE IF NOT EXISTS "page_configs" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_configs_pkey" PRIMARY KEY ("key")
);

-- Carry over the most recent stored config, if there is one, then drop the impostor rows.
INSERT INTO "page_configs" ("key", "value", "updatedAt")
SELECT 'about', "message", "createdAt"
FROM "contact_messages"
WHERE "subject" = '__about_page_config__'
ORDER BY "createdAt" DESC
LIMIT 1
ON CONFLICT ("key") DO NOTHING;

DELETE FROM "contact_messages" WHERE "subject" = '__about_page_config__';
