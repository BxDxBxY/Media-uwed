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
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.slice(1) || null;

    const searchId = parsed.searchParams.get("v");
    if (searchId) return searchId;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const markerIndex = parts.findIndex((part) => part === "shorts" || part === "embed" || part === "v");
    if (markerIndex !== -1 && parts[markerIndex + 1]) return parts[markerIndex + 1];

    return null;
  } catch {
    return null;
  }
}

export function getVimeoIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!/vimeo\.com$/i.test(parsed.hostname)) return null;
    const match = parsed.pathname.match(/\/(?:video\/)?(\d+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export function getVideoEmbedUrl(url?: string | null): string | null {
  if (!url) return null;

  const youtubeId = getYouTubeIdFromUrl(url);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`;

  const vimeoId = getVimeoIdFromUrl(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;

  if (/yandex\.ru\/video/i.test(url)) return url.replace("/preview/", "/embed/");
  if (/rutube\.ru\/(video|play\/embed)\//i.test(url)) return url.replace("/video/", "/play/embed/");

  return null;
}

export function getYouTubeThumbnail(url?: string | null): string | null {
  const id = getYouTubeIdFromUrl(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function getVimeoThumbnail(url?: string | null): string | null {
  const id = getVimeoIdFromUrl(url);
  return id ? `https://vumbnail.com/${id}.jpg` : null;
}

export function getMediaPreviewUrl(item: { type: string; url?: string | null; thumbnail?: string | null }): string {
  if (item.type !== "video") return item.url || "";
  if (item.thumbnail) return item.thumbnail;
  return getYouTubeThumbnail(item.url) || getVimeoThumbnail(item.url) || item.url || "";
}
