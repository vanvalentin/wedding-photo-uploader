/**
 * Normalize EXIF / Drive timestamp strings for Postgres timestamptz.
 * Google Drive imageMediaMetadata.time uses EXIF format: "YYYY:MM:DD HH:MM:SS"
 */
export function normalizeTimestamp(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  const trimmed = value.trim();

  // EXIF date: YYYY:MM:DD HH:MM:SS (optional fractional seconds / timezone)
  const exifMatch = trimmed.match(
    /^(\d{4}):(\d{2}):(\d{2})( \d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)$/
  );
  if (exifMatch) {
    return `${exifMatch[1]}-${exifMatch[2]}-${exifMatch[3]}${exifMatch[4]}`;
  }

  return trimmed;
}
