# 🔒 Security Analysis

> **Date:** 2026-05-13  
> **Project:** Media-uwed
>
> 🚩 **PARTIALLY OUTDATED — reviewed 2026-07-31.** This document described the *intended* security model and missed several real holes. Corrections are inlined below and marked **`⚠️ CORRECTION (2026-07-31)`**. For the current picture read [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md) first.

---

## 1. Authentication Security

### Session Token Structure
```
base64url(JSON payload) . base64url(HMAC-SHA256 signature)

Payload: { userId, role, exp (timestamp) }
TTL: 12 hours
```

**Strengths:**
- HTTP-only cookies (not accessible via JS)
- SameSite=lax (CSRF protection)
- HMAC-SHA256 signed (tamper-proof)
- Timing-safe comparison for signature verification
- Explicit expiry check

**Weaknesses:**
- No refresh token rotation
- No session invalidation on password change
- Relies on `NEXTAUTH_SECRET` or fallback secret chain

> ⚠️ **CORRECTION (2026-07-31)** — the fallback chain is not hypothetical: `.env` contains neither `ADMIN_SESSION_SECRET` nor `ADMIN_SECRET_ENCRYPTION_KEY`, so both session signing and secret encryption currently derive from `NEXTAUTH_SECRET = "development-secret-change-in-production"`. Anyone knowing that literal can forge admin sessions and decrypt stored integration secrets. See audit **H5**.

### Password Security
- **Algorithm:** scrypt (memory-hard, resistant to GPU attacks)
- **Salt:** 16 random bytes per password
- **Hash length:** 64 bytes output
- **Verification:** timing-safe equality check
- **Validation:** Minimum 8 characters on client side

> ⚠️ **CORRECTION (2026-07-31)** — 8-character minimum is enforced **server-side** in `auth/signup` and `auth/reset-password`, but there is **no rate limiting** on login, signup or forgot-password. Brute force and account spam are unthrottled. See audit **H4**.

### ⚠️ ADDED (2026-07-31) — Privilege escalation via password reset
Public self-registration is open (`/admin/signup`) and correctly creates `approved=false` accounts, but `app/api/admin/auth/reset-password/route.ts:38` sets `approved: true` when a password is reset. Register → request reset for your own email → reset → you are an approved `role="admin"` user. The super-admin approval queue is bypassed. **Critical — see audit C2.**

---

## 2. Encryption Security

### Secret Storage (AES-256-GCM)
```
Algorithm: AES-256-GCM (Authenticated Encryption)
IV: 12 random bytes per encryption
Auth Tag: 16 bytes (integrity verification)
Key: SHA-256(secret) derived from env chain
```

**Strengths:**
- Industry-standard AEAD cipher
- Unique IV per encryption (random)
- Authenticated encryption (tamper detection)
- Secrets never returned to client in plaintext
- Fingerprint hash for UI verification

**Weaknesses:**
- Encryption key derived from env var (not KMS)
- Fallback chain weakens security
- No key rotation mechanism beyond manual
- Same key encrypts all secrets

---

## 3. API Security

### CORS & Headers
```javascript
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: restricted (no camera/mic/geo)
Content-Security-Policy: strict defaults
```

### Admin API Protection
- `requireAdmin()` middleware checks session on all admin routes
- 401 returned for unauthorized access
- ~~No public write endpoints (except contact form and newsletter)~~

> 🔴 **CORRECTION (2026-07-31) — the last line was false.** Verified with `curl` and no cookies:
>
> | Endpoint | Anonymous response |
> |---|---|
> | `POST /api/frontend/articles` | `400` (validation reached) |
> | `DELETE /api/frontend/articles/<id>` | `404 {"error":"Article not found"}` |
> | `PUT /api/frontend/events/<id>` | `404 {"error":"Event not found"}` |
> | `GET /api/admin/dashboard` | `401` ✅ |
>
> Unauthenticated write endpoints exist for **articles, events, media** (`POST`/`PUT`/`DELETE`) and `POST /api/frontend/seed`. The admin UI itself calls them (`lib/context.tsx:256-381`), which is why they were left open. Additionally `/api/cron/pull|process|publish` have **no auth**, and `/api/cron/automation` **fails open** when `AUTOMATION_CRON_SECRET` is unset.
>
> Accurate statement: *`requireAdmin()` guards `/api/admin/**` only. `/api/frontend/**` mutations and `/api/cron/**` are unauthenticated.* See audit **C1** and **C4**.

### API Key Security
- Key hash stored (SHA-256), not plaintext
- Prefix-based lookup for efficient validation
- Revocation support via `revokedAt` field

---

## 4. Data Protection

### At Rest
- Database secrets encrypted via AES-256-GCM
- Password hashed via scrypt
- No PII stored unencrypted beyond email addresses

### In Transit
- HTTPS enforcement in production
- CSP headers mitigate XSS
- HTTP-only cookies for session tokens

### Input Validation
- Server-side validation on all mutation endpoints
- Type checking via TypeScript + runtime checks
- Contact form requires valid email format

> ⚠️ **CORRECTION (2026-07-31)** — validation ≠ authorization. Shape validation exists, but on `/api/frontend/**` mutations there is no *caller* check at all (C1). Also missing: SSRF guards on admin-supplied RSS/article URLs (`lib/rss.ts`, `lib/scraper.ts`).

---

## 5. Recommendations

**🔴 Blocking (added 2026-07-31 — do these first, details in [06-AUDIT-2026-07-31.md](06-AUDIT-2026-07-31.md) §8):**

1. **Authorize `/api/frontend/**` mutations** and delete/gate `POST /api/frontend/seed` (C1)
2. **Remove `approved: true` from password reset**; close or throttle public signup (C2)
3. **Fail-closed secret on all `/api/cron/**` endpoints** (C4)
4. **Set real `ADMIN_SESSION_SECRET` + `ADMIN_SECRET_ENCRYPTION_KEY`** before any deployment (H5)
5. **Stop logging the AI key prefix** — `lib/ai.ts:109` (H3)

**Original backlog (still valid):**

1. **Add rate limiting** on login endpoint (brute-force protection)
2. **Implement session revocation** on password change
3. **Add audit logging** for admin actions (who did what when)
4. **Use Vault/KMS** for encryption key management in production
5. **Add 2FA** for admin accounts
6. **Add IP-based access restrictions** for admin panel
7. **Implement CSRF tokens** for state-changing operations
8. **Add request logging** with correlation IDs
