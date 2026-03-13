/**
 * Placeholder abstraction for secure secret storage.
 *
 * In production, replace the in-memory/env fallback with a managed vault
 * provider (e.g. AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault).
 */

const volatileSecretStore = new Map<string, string>();

export async function storeSecret(key: string, value: string): Promise<void> {
  // Placeholder implementation: keeps non-persistent copy in memory for current process.
  volatileSecretStore.set(key, value);
}

export async function resolveSecret(key: string): Promise<string | null> {
  return volatileSecretStore.get(key) ?? process.env[key] ?? null;
}
