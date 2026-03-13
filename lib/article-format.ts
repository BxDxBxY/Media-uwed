export function splitReadableParagraphs(content: string): string[] {
  const normalized = String(content || "").trim();
  if (!normalized) return [];

  const fromBreaks = normalized
    .split(/\n{2,}/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (fromBreaks.length > 1) return fromBreaks;

  const sentences = normalized.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 3) return [normalized.replace(/\s+/g, " ")];

  const chunks: string[] = [];
  let buffer: string[] = [];

  for (const sentence of sentences) {
    buffer.push(sentence);
    if (buffer.length >= 2) {
      chunks.push(buffer.join(" ").trim());
      buffer = [];
    }
  }

  if (buffer.length > 0) chunks.push(buffer.join(" ").trim());
  return chunks;
}

export function extractInlineImageUrls(content: string): string[] {
  const matches = String(content || "").match(/https?:\/\/[^\s)"']+\.(?:jpg|jpeg|png|webp|gif)/gi) || [];
  return Array.from(new Set(matches));
}

export function compactExcerpt(text: string, sentenceCount = 2): string {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "—";
  return normalized.split(/(?<=[.!?])\s+/).slice(0, sentenceCount).join(" ");
}
