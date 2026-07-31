import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard for server-side fetches of admin-supplied URLs (RSS feeds, article pages
 * to scrape).
 *
 * Without this, anyone who can add a source can make the server request
 * `http://169.254.169.254/…` (cloud instance metadata, i.e. credentials),
 * `http://localhost:5432` or any other address reachable only from inside the network,
 * and read the response through the admin UI. Adding a source is an admin action, but
 * "admin" here includes self-registered accounts pending approval and anyone who gets
 * a session — so the fetch layer should not be the trusting part of the system.
 *
 * Rules: only http/https, no credentials in the URL, and the resolved IP must be
 * publicly routable.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.goog",
]);

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

/** True for loopback, link-local, private and other non-public ranges. */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);

  if (version === 4) {
    const parts = address.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
    const [a, b] = parts;

    if (a === 0) return true; // "this" network
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a === 192 && b === 0) return true; // IETF protocol assignments
    if (a >= 224) return true; // multicast + reserved
    return false;
  }

  if (version === 6) {
    const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fe80")) return true; // link-local
    if (/^f[cd]/.test(normalized)) return true; // unique local
    // IPv4-mapped (::ffff:10.0.0.1) — re-check the embedded address.
    const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  // Not an IP literal — caller resolves DNS first.
  return true;
}

/**
 * Validates a URL and resolves its host, throwing `UnsafeUrlError` when the target is
 * not a publicly routable http(s) address. Returns the parsed URL.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("Not a valid absolute URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError(`Unsupported protocol: ${parsed.protocol}`);
  }

  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError("URLs with embedded credentials are not allowed");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost")) {
    throw new UnsafeUrlError(`Blocked host: ${hostname}`);
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new UnsafeUrlError(`Blocked non-public address: ${hostname}`);
    }
    return parsed;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new UnsafeUrlError(`Could not resolve host: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError(`Host did not resolve: ${hostname}`);
  }

  // Every resolved address must be public — a host that returns one public and one
  // private address is a DNS-rebinding attempt.
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new UnsafeUrlError(`Host ${hostname} resolves to a non-public address`);
    }
  }

  return parsed;
}

/**
 * `fetch` restricted to publicly routable http(s) targets.
 *
 * Note: there is an unavoidable TOCTOU gap between the DNS check and the request, and
 * redirects are followed by `fetch` itself. `redirect: "manual"` would be stricter but
 * would break the many feeds that redirect http→https; the residual risk is accepted
 * here and noted rather than hidden.
 */
export async function safeFetch(rawUrl: string, init?: RequestInit): Promise<Response> {
  await assertPublicUrl(rawUrl);
  return fetch(rawUrl, init);
}
