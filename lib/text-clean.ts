const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  laquo: "«",
  raquo: "»",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeHtmlEntities(input: string): string {
  if (!input) return "";

  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    const raw = String(entity || "");

    if (raw.startsWith("#x") || raw.startsWith("#X")) {
      const code = Number.parseInt(raw.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    if (raw.startsWith("#")) {
      const code = Number.parseInt(raw.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    const normalized = raw.toLowerCase();
    return NAMED_ENTITIES[normalized] ?? match;
  });
}

export function polishText(input: string): string {
  return decodeHtmlEntities(String(input || ""))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();
}
