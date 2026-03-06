const REQUIRED_ENV_KEYS = ["DATABASE_URL"] as const;

export type AppEnvStatus = {
  ok: boolean;
  missing: string[];
};

export function validateEnv(requiredKeys: readonly string[] = REQUIRED_ENV_KEYS): AppEnvStatus {
  const missing = requiredKeys.filter((key) => !process.env[key] || !String(process.env[key]).trim());
  return {
    ok: missing.length === 0,
    missing,
  };
}

export function assertEnv(requiredKeys: readonly string[] = REQUIRED_ENV_KEYS) {
  const status = validateEnv(requiredKeys);
  if (!status.ok) {
    throw new Error(`Missing required environment variables: ${status.missing.join(", ")}`);
  }
}
