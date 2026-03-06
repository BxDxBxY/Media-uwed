const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

export const parseEventImages = (rawImage: string | null | undefined): string[] => {
  if (!rawImage) return [];

  const trimmed = rawImage.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0 && isHttpUrl(item));
      }
    } catch {
      // fallback to single image string behavior
    }
  }

  return isHttpUrl(trimmed) ? [trimmed] : [];
};

export const serializeEventImages = (images: string[]): string | null => {
  const normalized = images
    .map((image) => image.trim())
    .filter((image) => image.length > 0 && isHttpUrl(image));

  if (normalized.length === 0) return null;
  if (normalized.length === 1) return normalized[0];

  return JSON.stringify(normalized);
};

export const getEventCoverImage = (rawImage: string | null | undefined, fallbackSeed: string): string => {
  const images = parseEventImages(rawImage);
  return images[0] || `https://picsum.photos/seed/${fallbackSeed}/800/600`;
};
