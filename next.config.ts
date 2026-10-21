import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: https: http:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data: https:",
      "connect-src 'self' https: http:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  // NOTE (2026-07-31): `next build` cannot run from an exFAT volume — see
  // docs/02-SETUP-GUIDE.md §10. exFAT has no reparse points, so fs.readlink() answers
  // EISDIR where webpack expects EINVAL, and exFAT also rejects the ':' that Turbopack
  // puts in chunk filenames. Neither is fixable from this config (resolve.symlinks
  // and cache:false were both tried). Build from an NTFS drive or in CI.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
