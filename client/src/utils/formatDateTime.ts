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
export type AdminUploaderFilter = 'all' | string;

export const ANONYMOUS_UPLOADER_PREFIX = '__anon__';
export const ANONYMOUS_SESSION_GAP_MS = 30 * 60 * 1000;

export interface AdminUploaderOption {
  value: string;
  label: string;
}

type UploadWithGuest = {
  id: string;
  guestName: string | null;
  uploadedAt: string;
};

export function isAnonymousUploaderFilter(filter: string): boolean {
  return filter.startsWith(ANONYMOUS_UPLOADER_PREFIX);
}

export function getAnonymousUploaderLabel(groupIndex: number): string {
  return `Anonymous ${groupIndex}`;
}

export function parseAnonymousUploaderIndex(filter: string): number | null {
  if (!isAnonymousUploaderFilter(filter)) return null;
  const index = Number.parseInt(filter.slice(ANONYMOUS_UPLOADER_PREFIX.length), 10);
  return Number.isFinite(index) && index > 0 ? index : null;
}

export function buildAnonymousUploaderGroups<T extends UploadWithGuest>(
  uploads: T[]
): Map<string, string> {
  const anonymousUploads = uploads
    .filter((upload) => !upload.guestName?.trim())
    .sort(
      (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );

  const groups = new Map<string, string>();
  let groupIndex = 1;
  let lastUploadTime: number | null = null;
  let currentGroupKey = `${ANONYMOUS_UPLOADER_PREFIX}${groupIndex}`;

  for (const upload of anonymousUploads) {
    const uploadTime = new Date(upload.uploadedAt).getTime();
    if (lastUploadTime !== null && uploadTime - lastUploadTime > ANONYMOUS_SESSION_GAP_MS) {
      groupIndex += 1;
      currentGroupKey = `${ANONYMOUS_UPLOADER_PREFIX}${groupIndex}`;
    }
    groups.set(upload.id, currentGroupKey);
    lastUploadTime = uploadTime;
  }

  return groups;
}

export function buildAdminUploaderOptions<T extends UploadWithGuest>(
  uploads: T[]
): AdminUploaderOption[] {
  const named = new Set<string>();
  for (const upload of uploads) {
    const name = upload.guestName?.trim();
    if (name) named.add(name);
  }

  const anonymousGroups = buildAnonymousUploaderGroups(uploads);
  const anonymousIndices = new Set<number>();
  for (const groupKey of anonymousGroups.values()) {
    const index = parseAnonymousUploaderIndex(groupKey);
    if (index) anonymousIndices.add(index);
  }

  return [
    ...[...named]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name })),
    ...[...anonymousIndices]
      .sort((a, b) => a - b)
      .map((index) => ({
        value: `${ANONYMOUS_UPLOADER_PREFIX}${index}`,
        label: getAnonymousUploaderLabel(index),
      })),
  ];
}

export function resolveUploaderLabel<T extends UploadWithGuest>(
  upload: T,
  anonymousGroups: Map<string, string>
): string | null {
  const name = upload.guestName?.trim();
  if (name) return name;

  const groupKey = anonymousGroups.get(upload.id);
  if (!groupKey) return null;

  const index = parseAnonymousUploaderIndex(groupKey);
  return index ? getAnonymousUploaderLabel(index) : null;
}

export function filterByReviewStatus<T extends { reviewed: boolean }>(
  items: T[],
  filter: AdminReviewFilter
): T[] {
  if (filter === 'reviewed') return items.filter((item) => item.reviewed);
  if (filter === 'unreviewed') return items.filter((item) => !item.reviewed);
  return items;
}

export function filterByUploader<T extends UploadWithGuest>(
  items: T[],
  filter: AdminUploaderFilter,
  anonymousGroups: Map<string, string>
): T[] {
  if (filter === 'all') return items;
  if (isAnonymousUploaderFilter(filter)) {
    return items.filter((item) => anonymousGroups.get(item.id) === filter);
  }
  return items.filter((item) => item.guestName === filter);
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
