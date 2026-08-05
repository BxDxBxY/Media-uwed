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

/**
 * `deriveTermsFromInstructions` used to live here: it turned the admin's editorial brief
 * into up to 24 keywords that an article had to contain. It was removed because it failed
 * silently in both directions — it stripped everything outside `[a-z0-9]`, so a brief
 * written in Russian or Uzbek produced no terms and filtered nothing, and it harvested
 * terms from negations too, so "avoid politics" required articles to mention *politics*.
 * Judging prose about editorial intent is now `lib/pipeline/triage.ts`, which asks the
 * model. Keywords below stay for what they are good at: cheap, deterministic, exact
 * matching.
 */
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
