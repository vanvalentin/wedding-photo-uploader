const PARIS_TIME_ZONE = 'Europe/Paris';

export function formatParisDateTime(value: string | null | undefined): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('fr-FR', {
    timeZone: PARIS_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** Prefer photo taken time (EXIF); fall back to upload/registry time. */
export function formatMediaDateLabel(
  takenAt: string | null | undefined,
  fallbackAt: string
): string {
  if (takenAt) {
    return `Prise le ${formatParisDateTime(takenAt)}`;
  }
  return `Importée le ${formatParisDateTime(fallbackAt)}`;
}
