const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface AdminPrivateAlbum {
  id: string;
  slug: string;
  title: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPrivateAlbumItem {
  id: string;
  driveFileId: string;
  storageProvider: 'google_drive' | 'r2';
  storageKey: string;
  fileName: string;
  isVideo: boolean;
  takenAt: string | null;
  thumbnailUrl: string;
  viewUrl: string;
}

export interface AlbumUploadInitResponse {
  sessionUri: string;
  fileName: string;
  storageProvider: 'google_drive' | 'r2';
  storageKey?: string;
  uploadMethod: 'single_put' | 'drive_resumable';
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

export async function fetchAdminAlbums(secret: string): Promise<AdminPrivateAlbum[]> {
  const response = await fetch(`${API_BASE}/api/admin/albums`, {
    headers: adminHeaders(secret),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { items: AdminPrivateAlbum[] };
  return body.items;
}

export async function createPrivateAlbum(
  secret: string,
  input: { slug: string; title: string; password: string }
): Promise<AdminPrivateAlbum> {
  const response = await fetch(`${API_BASE}/api/admin/albums`, {
    method: 'POST',
    headers: adminHeaders(secret),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { album: AdminPrivateAlbum };
  return body.album;
}

export async function deletePrivateAlbum(secret: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/albums?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: adminHeaders(secret),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function fetchAdminAlbumItems(
  secret: string,
  albumId: string
): Promise<AdminPrivateAlbumItem[]> {
  const response = await fetch(
    `${API_BASE}/api/admin/album-items?albumId=${encodeURIComponent(albumId)}`,
    { headers: adminHeaders(secret) }
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { items: AdminPrivateAlbumItem[] };
  return body.items;
}

export async function addAlbumItemFromLibrary(
  secret: string,
  albumId: string,
  mediaUploadId: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/album-items`, {
    method: 'POST',
    headers: adminHeaders(secret),
    body: JSON.stringify({ source: 'library', albumId, mediaUploadId }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function addAlbumItemFromUpload(
  secret: string,
  input: {
    albumId: string;
    driveFileId: string;
    storageProvider: 'google_drive' | 'r2';
    storageKey: string;
    fileName: string;
    mimeType?: string;
    isVideo?: boolean;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/album-items`, {
    method: 'POST',
    headers: adminHeaders(secret),
    body: JSON.stringify({ source: 'upload', ...input }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function deletePrivateAlbumItem(secret: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/album-items?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: adminHeaders(secret),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function initAlbumUpload(
  secret: string,
  input: {
    albumId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }
): Promise<AlbumUploadInitResponse> {
  const response = await fetch(`${API_BASE}/api/admin/album-upload/init`, {
    method: 'POST',
    headers: adminHeaders(secret),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
