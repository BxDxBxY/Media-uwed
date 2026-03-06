export function splitMediaCategories(category?: string | null): string[] {
  if (!category) return [];
  return [...new Set(category.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function hasMediaCategory(categoryValue: string | null | undefined, target: string): boolean {
  const key = target.trim().toLowerCase();
  return splitMediaCategories(categoryValue).some((category) => category.toLowerCase() === key);
}

export function getYouTubeIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }

    const searchId = parsed.searchParams.get("v");
    if (searchId) return searchId;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const markerIndex = parts.findIndex((part) => part === "shorts" || part === "embed" || part === "v");
    if (markerIndex !== -1 && parts[markerIndex + 1]) {
      return parts[markerIndex + 1];
    }

    return null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnail(url?: string | null): string | null {
  const id = getYouTubeIdFromUrl(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function getMediaPreviewUrl(item: { type: string; url?: string | null; thumbnail?: string | null }): string {
  if (item.type !== "video") return item.url || "";
  if (item.thumbnail) return item.thumbnail;
  return getYouTubeThumbnail(item.url) || item.url || "";
}
