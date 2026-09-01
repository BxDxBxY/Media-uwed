/**
 * Canonical public origin of the site.
 *
 * Used for canonical URLs, Open Graph tags, sitemap entries and links sent to
 * Telegram/email. Configure `APP_URL` (or `NEXT_PUBLIC_SITE_URL`) in production —
 * otherwise absolute URLs point at localhost and search engines index nothing useful.
 */
export function getPublicSiteUrl(): string {
  const candidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    // Vercel injects this for preview/production deployments.
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    const value = (candidate || "").trim();
    if (!value) continue;
    try {
      return new URL(value).origin;
    } catch {
      // Ignore malformed values and try the next candidate.
    }
  }

  return "http://localhost:3000";
}

/** True when the resolved origin is a real public URL rather than the localhost default. */
export function hasPublicSiteUrl(): boolean {
  const origin = getPublicSiteUrl();
  return !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin);
}
