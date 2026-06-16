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

/** Value for `<input type="datetime-local">` in Paris time. */
export function toParisDateTimeLocalInput(value: string | null | undefined): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const datePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  const [day, month, year] = datePart.split('/');
  return `${year}-${month}-${day}T${timePart}`;
}

export type AdminSortField = 'taken' | 'uploaded';
export type AdminSortDirection = 'desc' | 'asc';
export type AdminReviewFilter = 'all' | 'unreviewed' | 'reviewed';

export function filterByReviewStatus<T extends { reviewed: boolean }>(
  items: T[],
  filter: AdminReviewFilter
): T[] {
  if (filter === 'reviewed') return items.filter((item) => item.reviewed);
  if (filter === 'unreviewed') return items.filter((item) => !item.reviewed);
  return items;
}

export function sortByMediaDate<T extends { takenAt: string | null }>(
  items: T[],
  field: AdminSortField,
  direction: AdminSortDirection,
  uploadedAtKey: keyof T
): T[] {
  const multiplier = direction === 'desc' ? -1 : 1;

  return [...items].sort((a, b) => {
    if (field === 'uploaded') {
      const aTime = new Date(String(a[uploadedAtKey])).getTime();
      const bTime = new Date(String(b[uploadedAtKey])).getTime();
      return multiplier * (aTime - bTime);
    }

    const aTaken = a.takenAt ? new Date(a.takenAt).getTime() : null;
    const bTaken = b.takenAt ? new Date(b.takenAt).getTime() : null;

    if (aTaken === null && bTaken === null) return 0;
    if (aTaken === null) return 1;
    if (bTaken === null) return -1;
    return multiplier * (aTaken - bTaken);
  });
}
