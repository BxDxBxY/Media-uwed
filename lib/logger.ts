type LogMeta = Record<string, unknown>;

function serialize(meta?: LogMeta) {
  return meta ? JSON.stringify(meta) : "";
}

export const logger = {
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
