-- Lets the admin UI reject sessions that were issued before a password change.
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
