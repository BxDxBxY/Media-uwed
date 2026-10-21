-- Re-approve the administrators that existed before approvals were introduced.
--
-- Migration 20260731000000 added `approved` and `isSuperAdmin` to `admin_users` with a
-- default of false. On a database that already had administrators, `migrate deploy` therefore
-- marks every one of them unapproved -- and the same release rejects login unless `approved`
-- is true and requires `isSuperAdmin` for /api/admin/users. The result is a deployment where
-- nobody can sign in and nobody can approve anybody: a lockout that needs an out-of-band
-- script to escape.
--
-- Scoped by creation date rather than blanket-approving every row: accounts created from
-- 2026-07-31 onwards went through the signup flow *after* approvals existed, and they must
-- keep waiting for a human. Only accounts that predate the feature are restored.
UPDATE "admin_users"
SET "approved" = true
WHERE "createdAt" < TIMESTAMP '2026-07-31 00:00:00'
  AND "approved" = false;

-- Guarantee someone can actually administer the instance. If no approved super-admin exists
-- at all, promote the earliest account -- the one that bootstrapped the deployment.
UPDATE "admin_users"
SET "isSuperAdmin" = true, "approved" = true
WHERE "id" = (
  SELECT "id" FROM "admin_users" ORDER BY "createdAt" ASC LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM "admin_users" WHERE "isSuperAdmin" = true AND "approved" = true
);
