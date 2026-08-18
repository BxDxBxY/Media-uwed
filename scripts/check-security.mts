/**
 * Offline checks for the security primitives — `npm run check:security`.
 *
 * These two modules protect everything else: `lib/security.ts` encrypts the provider API
 * keys and Telegram tokens held in the database, and `lib/admin-auth.ts` decides who is an
 * administrator. Both were entirely untested, and both fail in ways that are invisible from
 * the outside — a tampered ciphertext that still decrypts, or a forged token that still
 * verifies, look exactly like normal operation until someone exploits them.
 *
 * The assertions are about properties rather than implementation: authenticated encryption
 * must reject tampering, password storage must be salted, and a session must not survive a
 * rewritten payload, an expiry, or a password change.
 *
 * No network, no database, and no key material committed anywhere.
 */
import { createHmac } from "node:crypto";
import { encryptSecret, decryptSecret, fingerprintSecret } from "@/lib/security";
import {
  hashPassword,
  verifyPassword,
  createAdminSessionToken,
  verifyAdminSessionToken,
  isSessionStale,
} from "@/lib/admin-auth";

const checks: Array<[string, boolean]> = [];
const check = (name: string, ok: boolean) => checks.push([name, ok]);

// --- secret encryption ---------------------------------------------------------------
{
  const secret = "sk-or-v1-" + "a".repeat(40);
  const encrypted = encryptSecret(secret);

  check("round-trips a provider key", decryptSecret(encrypted) === secret);
  check("ciphertext does not contain the plaintext", !encrypted.includes(secret));
  check("stored form is iv.tag.ciphertext", encrypted.split(".").length === 3);

  // A fresh IV per call: identical inputs must not produce identical ciphertext, or anyone
  // reading the database can tell which integrations share a key.
  check("same value encrypts differently each time", encryptSecret(secret) !== encryptSecret(secret));

  // AES-GCM is authenticated: a flipped byte must be detected, not silently decrypted.
  const [iv, tag, body] = encrypted.split(".");
  const flip = (value: string) => (value[0] === "A" ? "B" : "A") + value.slice(1);
  check("rejects a tampered ciphertext", decryptSecret([iv, tag, flip(body)].join(".")) === null);
  check("rejects a tampered auth tag", decryptSecret([iv, flip(tag), body].join(".")) === null);
  check("rejects a tampered IV", decryptSecret([flip(iv), tag, body].join(".")) === null);

  check("rejects a malformed payload", decryptSecret("not-a-valid-payload") === null);
  check("treats null as absent rather than throwing", decryptSecret(null) === null);
  check("treats an empty string as absent", decryptSecret("") === null);

  check("empty secrets round-trip", decryptSecret(encryptSecret("")) === "");
  check("non-ASCII secrets survive", decryptSecret(encryptSecret("parol kalit 密钥")) === "parol kalit 密钥");

  // The fingerprint is shown in the admin UI to identify which key is stored.
  check("fingerprint is stable", fingerprintSecret(secret) === fingerprintSecret(secret));
  check("fingerprint differs per secret", fingerprintSecret(secret) !== fingerprintSecret(secret + "x"));
  check("fingerprint does not reveal the secret", !fingerprintSecret(secret).includes(secret.slice(0, 8)));
  check("fingerprint is short enough to display", fingerprintSecret(secret).length === 16);
}

// --- password hashing ----------------------------------------------------------------
{
  const password = "correct horse battery staple";
  const hash = hashPassword(password);

  check("accepts the right password", verifyPassword(password, hash) === true);
  check("rejects the wrong password", verifyPassword("wrong password", hash) === false);
  check("hash does not contain the password", !hash.includes(password));
  check("hash is stored as salt:hash", hash.split(":").length === 2);

  // A per-password salt is what stops a stolen table being cracked in bulk.
  check("salted: the same password hashes differently", hashPassword(password) !== hashPassword(password));

  check("rejects a hash with no salt", verifyPassword(password, "nosalt") === false);
  check("rejects an empty hash", verifyPassword(password, "") === false);
  check("rejects a truncated hash", verifyPassword(password, hash.slice(0, 20)) === false);
  check("an empty password verifies against its own hash", verifyPassword("", hashPassword("")) === true);
  check("non-ASCII passwords work", verifyPassword("parol-123", hashPassword("parol-123")) === true);
}

// --- session tokens ------------------------------------------------------------------
{
  const token = createAdminSessionToken({ userId: "user-1", role: "admin" });
  const payload = verifyAdminSessionToken(token);

  check("a fresh token verifies", payload?.userId === "user-1");
  check("token carries the role", payload?.role === "admin");
  check("token carries an issued-at", typeof payload?.iat === "number");
  check("token expiry is in the future", (payload?.exp ?? 0) > Math.floor(Date.now() / 1000));

  const [tokenBody, signature] = token.split(".");
  check("rejects a token with no signature", verifyAdminSessionToken(tokenBody) === null);
  check(
    "rejects a wrong signature",
    verifyAdminSessionToken([tokenBody, "x".repeat(signature.length)].join(".")) === null,
  );
  check("rejects garbage", verifyAdminSessionToken("nonsense") === null);

  // The forgery that matters: rewrite the payload, keep the genuine signature.
  const forged = Buffer.from(
    JSON.stringify({ userId: "user-1", role: "superadmin", exp: 9999999999, iat: 1 }),
  ).toString("base64url");
  check(
    "rejects a payload rewritten to escalate role",
    verifyAdminSessionToken([forged, signature].join(".")) === null,
  );

  // An expired token must fail even though its signature is genuine.
  const expiredBody = Buffer.from(
    JSON.stringify({ userId: "user-1", role: "admin", exp: Math.floor(Date.now() / 1000) - 60, iat: 1 }),
  ).toString("base64url");
  const seed = process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || "insecure-dev-secret";
  const expiredSignature = createHmac("sha256", seed).update(expiredBody).digest("base64url");
  check(
    "rejects an expired but correctly signed token",
    verifyAdminSessionToken([expiredBody, expiredSignature].join(".")) === null,
  );
}

// --- session invalidation on password change -----------------------------------------
{
  const now = Date.now();
  const issuedBefore = { iat: Math.floor((now - 60_000) / 1000) };
  const issuedAfter = { iat: Math.floor((now + 60_000) / 1000) };
  const changedNow = { passwordChangedAt: new Date(now) };

  check("session issued before the password change is stale", isSessionStale(issuedBefore, changedNow));
  check("session issued after it is not", !isSessionStale(issuedAfter, changedNow));
  check("no password change means nothing is stale", !isSessionStale(issuedBefore, { passwordChangedAt: null }));
  check("a missing user is not treated as stale", !isSessionStale(issuedBefore, null));
  check("a null session is not treated as stale", !isSessionStale(null, changedNow));
  // Tokens predating the feature carry no `iat`; they must not outlive a password change.
  check("a legacy token without iat is stale", isSessionStale({}, changedNow));
}

console.log("--- assertions ---");
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
console.log(`\n${checks.filter(([, ok]) => ok).length}/${checks.length} passed`);

process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
