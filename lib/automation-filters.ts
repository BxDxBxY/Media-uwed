export const normalizeKeywords = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

export const deriveTermsFromInstructions = (instructions: string): string[] => {
  const stopWords = new Set([
    "the", "and", "for", "with", "from", "that", "this", "into", "your", "about", "only", "avoid", "should",
    "need", "must", "news", "article", "articles", "content", "more", "less", "than", "have", "has", "are",
    "you", "our", "their", "they", "them", "was", "were", "will", "would", "can", "could", "not",
  ]);

  return instructions
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !stopWords.has(word))
    .slice(0, 24);
};

export const matchesRequirements = (
  article: { title: string; description?: string | null },
  includeKeywords: string[],
  excludeKeywords: string[],
): boolean => {
  const haystack = `${article.title} ${article.description || ""}`.toLowerCase();

  if (includeKeywords.length > 0 && !includeKeywords.some((keyword) => haystack.includes(keyword))) {
    return false;
  }

  if (excludeKeywords.length > 0 && excludeKeywords.some((keyword) => haystack.includes(keyword))) {
    return false;
  }

  return true;
};
