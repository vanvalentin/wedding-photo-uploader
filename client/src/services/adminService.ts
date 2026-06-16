const API_BASE = import.meta.env.VITE_API_URL ?? '';
export const ADMIN_SECRET_STORAGE_KEY = 'wedding-admin-secret';

export interface AdminMediaUploadItem {
  id: string;
  driveFileId: string;
  fileName: string;
  guestName: string | null;
  mimeType: string | null;
  isVideo: boolean;
  fileSize: number | null;
  takenAt: string | null;
  uploadedAt: string;
  thumbnailUrl: string;
  viewUrl: string;
  isCurated: boolean;
}

export interface AdminCuratedItem {
  id: string;
  driveFileId: string;
  caption: string | null;
  sortOrder: number;
  isVideo: boolean;
  takenAt: string | null;
  createdAt: string;
  fileName: string | null;
  thumbnailUrl: string;
  viewUrl: string;
}

function adminHeaders(secret: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Secret': secret,
  };
}

async function parseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return body.message ?? body.error ?? `Request failed (${response.status})`;
}

export async function verifyAdminAccess(secret: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/admin/uploads`, {
    headers: adminHeaders(secret),
  });
  return response.ok;
}

export async function fetchAdminUploads(secret: string): Promise<AdminMediaUploadItem[]> {
  const response = await fetch(`${API_BASE}/api/admin/uploads`, {
    headers: adminHeaders(secret),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { items: AdminMediaUploadItem[] };
  return body.items;
}

export async function fetchAdminCurated(secret: string): Promise<AdminCuratedItem[]> {
  const response = await fetch(`${API_BASE}/api/admin/curated`, {
    headers: adminHeaders(secret),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { items: AdminCuratedItem[] };
  return body.items;
}

export async function addCuratedItem(
  secret: string,
  input: {
    driveFileId: string;
    caption?: string;
    sortOrder?: number;
    isVideo?: boolean;
    takenAt?: string | null;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/curated`, {
    method: 'POST',
    headers: adminHeaders(secret),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function removeCuratedItem(secret: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/curated?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: adminHeaders(secret),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export function getStoredAdminSecret(): string | null {
  return sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY);
}

export function storeAdminSecret(secret: string): void {
  sessionStorage.setItem(ADMIN_SECRET_STORAGE_KEY, secret);
}

export function clearAdminSecret(): void {
  sessionStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);
}
