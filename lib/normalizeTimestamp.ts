const PARIS_TIME_ZONE = 'Europe/Paris';

/**
 * EXIF / camera timestamps have no timezone. Treat them as Paris local time
 * and convert to UTC for timestamptz storage.
 */
export function parisLocalDateTimeToUtcIso(localDateTime: string): string {
  const normalized = localDateTime.trim().replace(' ', 'T');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return localDateTime;

  const [, y, mo, d, hh, mm, ss] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(hh);
  const minute = Number(mm);
  const second = Number(ss);

  let utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  for (let attempt = 0; attempt < 4; attempt++) {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: PARIS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(utcGuess));

    const parts = formatted.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/);
    if (!parts) break;

    const [, fDay, fMonth, fYear, fHour, fMinute, fSecond] = parts;
    const parisInstantAsUtc = Date.UTC(
      Number(fYear),
      Number(fMonth) - 1,
      Number(fDay),
      Number(fHour),
      Number(fMinute),
      Number(fSecond)
    );
    const targetUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const diff = targetUtc - parisInstantAsUtc;
    utcGuess += diff;
    if (diff === 0) break;
  }

  return new Date(utcGuess).toISOString();
}

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
    const normalized = `${exifMatch[1]}-${exifMatch[2]}-${exifMatch[3]}${exifMatch[4]}`;
    if (/(Z|[+-]\d{2}:?\d{2})$/.test(normalized)) {
      return normalized.replace(' ', 'T');
    }
    return parisLocalDateTimeToUtcIso(normalized);
  }

  // Naive datetime without timezone — assume Paris local (typical for EXIF after hyphen fix)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return parisLocalDateTimeToUtcIso(trimmed);
  }

  const naiveIso = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (naiveIso) {
    const seconds = naiveIso[3] ?? '00';
    return parisLocalDateTimeToUtcIso(`${naiveIso[1]} ${naiveIso[2]}:${seconds}`);
  }

  return trimmed;
}
