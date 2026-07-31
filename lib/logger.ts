type LogMeta = Record<string, unknown>;

function serialize(meta?: LogMeta) {
  return meta ? JSON.stringify(meta) : "";
}

/**
 * Never pass secrets (API keys, tokens, reset links, password hashes) in `meta` —
 * these lines end up in hosting provider logs. Log presence (`hasKey: true`), not value.
 */
export const logger = {
  /** Verbose diagnostics. Suppressed in production. */
  debug(message: string, meta?: LogMeta) {
    if (process.env.NODE_ENV === "production") return;
    console.debug(`[DEBUG] ${message}`, serialize(meta));
  },
  info(message: string, meta?: LogMeta) {
    console.info(`[INFO] ${message}`, serialize(meta));
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(`[WARN] ${message}`, serialize(meta));
  },
  error(message: string, meta?: LogMeta) {
    console.error(`[ERROR] ${message}`, serialize(meta));
  },
};
