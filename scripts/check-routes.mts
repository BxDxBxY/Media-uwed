/**
 * Authorization checks against a running server — `npm run check:routes`.
 *
 * The original audit's worst finding was that content CRUD under `/api/frontend/**` and the
 * pipeline endpoints under `/api/cron/**` accepted anonymous callers: anyone on the internet
 * could publish, edit or delete articles, or trigger a Telegram broadcast. That was fixed by
 * adding guards, and nothing has been stopping someone removing one again.
 *
 * These assertions encode the guarantee rather than the implementation: for every
 * state-changing endpoint, an unauthenticated request must be refused. A regression here is
 * not a broken test — it is the site being open again.
 *
 * Deliberately *not* part of `npm run check`: it needs a running server and a database, so it
 * is an integration check you run against a dev server or a preview deployment.
 *
 *   npm run dev            # in one terminal
 *   npm run check:routes   # in another
 *
 * Set BASE_URL to point somewhere else. No request below creates or modifies data: the
 * mutation probes are all expected to be rejected before they reach the database.
 */
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

const checks: Array<[string, boolean, string]> = [];
const check = (name: string, ok: boolean, detail = "") => checks.push([name, ok, detail]);

async function probe(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: string }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    });
    return { status: res.status, body: (await res.text()).slice(0, 200) };
  } catch (error) {
    return { status: 0, body: error instanceof Error ? error.message : String(error) };
  }
}

// --- is the server even up? ----------------------------------------------------------
const health = await probe("/api/health");
if (health.status === 0) {
  console.log(`No server at ${BASE_URL} — skipping.\n`);
  console.log("Start one with `npm run dev`, or set BASE_URL to a deployed instance.");
  process.exit(0);
}
check("health endpoint responds", health.status === 200, `HTTP ${health.status}`);

// --- public reads must stay public ---------------------------------------------------
for (const path of [
  "/api/frontend/articles?page=1&limit=1",
  "/api/frontend/events",
  "/api/frontend/media",
  "/api/frontend/about",
  "/api/frontend/categories",
]) {
  const res = await probe(path);
  check(`public read stays public: ${path.split("?")[0]}`, res.status === 200, `HTTP ${res.status}`);
}

// --- content mutations must refuse anonymous callers ---------------------------------
// This is the exact defect the audit found: these all used to succeed without a session.
const mutations: Array<[string, string]> = [
  ["POST", "/api/frontend/articles"],
  ["PUT", "/api/frontend/articles/00000000-0000-0000-0000-000000000000"],
  ["DELETE", "/api/frontend/articles/00000000-0000-0000-0000-000000000000"],
  ["POST", "/api/frontend/events"],
  ["PUT", "/api/frontend/events/00000000-0000-0000-0000-000000000000"],
  ["DELETE", "/api/frontend/events/00000000-0000-0000-0000-000000000000"],
  ["POST", "/api/frontend/media"],
  ["PUT", "/api/frontend/media/00000000-0000-0000-0000-000000000000"],
  ["DELETE", "/api/frontend/media/00000000-0000-0000-0000-000000000000"],
];

for (const [method, path] of mutations) {
  const res = await probe(path, { method, body: JSON.stringify({ title: "route-check" }) });
  check(
    `${method} ${path.replace(/\/0{8}.*/, "/:id")} refuses anonymous callers`,
    res.status === 401 || res.status === 403,
    `HTTP ${res.status}`,
  );
}

// --- admin API must refuse anonymous callers -----------------------------------------
for (const path of [
  "/api/admin/dashboard",
  "/api/admin/settings",
  "/api/admin/sources",
  "/api/admin/users",
  "/api/admin/messages",
  "/api/admin/subscribers",
  "/api/admin/integrations",
  "/api/admin/automation/raw",
  "/api/admin/automation/review",
  "/api/admin/security/api-keys",
]) {
  const res = await probe(path);
  check(`admin endpoint refuses anonymous callers: ${path}`, res.status === 401, `HTTP ${res.status}`);
}

// --- the pipeline must refuse callers without the shared secret ----------------------
// A wrong secret is the interesting case: fail-closed means it is rejected, not ignored.
for (const path of ["/api/cron/pull", "/api/cron/process", "/api/cron/publish", "/api/cron/automation"]) {
  const anonymous = await probe(path, { method: "POST", body: "{}" });
  check(`${path} refuses callers with no secret`, anonymous.status === 401, `HTTP ${anonymous.status}`);

  const wrongSecret = await probe(path, {
    method: "POST",
    body: "{}",
    headers: { "x-automation-secret": "definitely-not-the-secret" },
  });
  check(`${path} refuses a wrong secret`, wrongSecret.status === 401, `HTTP ${wrongSecret.status}`);
}

// Vercel Cron issues GET; that path must be guarded exactly like POST.
const cronGet = await probe("/api/cron/automation");
check("GET /api/cron/automation is guarded too", cronGet.status === 401, `HTTP ${cronGet.status}`);

// --- the removed backdoor must stay removed ------------------------------------------
// It created an administrator with a hardcoded password and required no authentication.
const seed = await probe("/api/frontend/seed", { method: "POST", body: "{}" });
check(
  "the seed backdoor is gone",
  seed.status === 404 || seed.status === 405,
  `HTTP ${seed.status}`,
);

// --- admin surfaces must not be reachable without a session --------------------------
const adminPage = await probe("/admin/settings", { redirect: "manual" });
check(
  "admin UI redirects anonymous visitors",
  adminPage.status === 307 || adminPage.status === 302 || adminPage.status === 308,
  `HTTP ${adminPage.status}`,
);

// --- credential endpoints are rate limited -------------------------------------------
// Ten attempts a minute; the eleventh must be refused, or password guessing is unbounded.
// This spends the login bucket for this IP for up to a minute — in-memory, so it clears.
let sawRateLimit = false;
for (let attempt = 0; attempt < 13; attempt++) {
  const res = await probe("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ identity: "nobody-route-check", password: "wrong-password" }),
  });
  if (res.status === 429) {
    sawRateLimit = true;
    break;
  }
}
check("login is rate limited after repeated failures", sawRateLimit, sawRateLimit ? "429 seen" : "no 429 in 13 tries");

console.log(`--- authorization checks against ${BASE_URL} ---`);
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (${detail})`}`);
}
const passed = checks.filter(([, ok]) => ok).length;
console.log(`\n${passed}/${checks.length} passed`);

process.exit(passed === checks.length ? 0 : 1);
