import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const seed =
    process.env.ADMIN_SECRET_ENCRYPTION_KEY ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "unsafe-dev-fallback-key-change-me";

  return createHash("sha256").update(seed).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  // Structure check, not truthiness: an empty ciphertext is what a stored empty string
  // legitimately looks like, and rejecting it here made `encryptSecret("")` un-decryptable
  // — a valid payload reported as if it were corrupt.
  const parts = payload.split(".");
  if (parts.length !== 3) return null;
  const [ivPart, tagPart, contentPart] = parts;
  if (!ivPart || !tagPart) return null;

  try {
    const iv = Buffer.from(ivPart, "base64url");
    const tag = Buffer.from(tagPart, "base64url");
    const content = Buffer.from(contentPart, "base64url");

    const decipher = createDecipheriv(ALGO, getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(content), decipher.final()]);
    return out.toString("utf8");
  } catch {
    return null;
  }
}

export function fingerprintSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
