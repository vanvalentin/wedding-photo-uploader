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
