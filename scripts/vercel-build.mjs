/**
 * Deployment build step — `npm run vercel-build`.
 *
 * Exists to turn two opaque build failures into actionable ones. `prisma migrate deploy`
 * chained with `&&` aborts the whole deployment with a bare `P1001: Can't reach database
 * server`, which says nothing about *which* setting is wrong or where to change it. On a
 * hosted build container the answer is almost always that `DATABASE_URL` is unset, or was
 * copied from a developer's `.env` and still points at `localhost` — a host that exists on
 * a laptop and nowhere else.
 *
 * Migrations are never skipped when a database is configured: deploying code whose schema
 * has not been applied is worse than a failed build.
 */
import { spawnSync } from "node:child_process";

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  return result.status ?? 1;
};

const fail = (lines) => {
  console.error(`\n${"=".repeat(72)}`);
  for (const line of lines) console.error(line);
  console.error(`${"=".repeat(72)}\n`);
  process.exit(1);
};

const databaseUrl = (process.env.DATABASE_URL || "").trim();

if (!databaseUrl) {
  fail([
    "DATABASE_URL is not set for this build.",
    "",
    "Set it in the hosting project's environment variables (on Vercel:",
    "Settings -> Environment Variables, for every environment you deploy).",
    "It must point at a database the build container can reach over the network —",
    "a managed Postgres such as Neon, Supabase or Vercel Postgres.",
  ]);
}

// Only fatal on a hosted builder. Self-hosting the app on the same machine as Postgres is
// a legitimate setup, and this script must not refuse it.
const onHostedBuilder = Boolean(process.env.VERCEL || process.env.CI);

if (/@(localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(databaseUrl)) {
  if (onHostedBuilder) {
    fail([
      "DATABASE_URL points at localhost, which in a build container is the container itself.",
      "",
      "This value was almost certainly copied from a local .env file. Replace it with a",
      "managed Postgres connection string reachable from the internet.",
    ]);
  }
  console.warn("! DATABASE_URL points at localhost - fine when the database is on this machine.");
}

console.log("> prisma generate");
if (run("npx", ["prisma", "generate"]) !== 0) process.exit(1);

console.log("> prisma migrate deploy");
if (run("npx", ["prisma", "migrate", "deploy"]) !== 0) {
  fail([
    "Migrations could not be applied.",
    "",
    "If the error above is P1001 the build container cannot reach the database: check that",
    "DATABASE_URL is correct and that the database allows connections from the deployment",
    "platform. Deploying without applying migrations would leave the running app querying",
    "columns that do not exist, so the build stops here deliberately.",
  ]);
}

console.log("> next build");
process.exit(run("npx", ["next", "build"]));
