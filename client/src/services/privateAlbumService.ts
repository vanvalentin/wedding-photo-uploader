const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface PrivateAlbumGalleryItem {
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

export interface PrivateAlbumAccessResponse {
  title: string;
  slug: string;
  items: PrivateAlbumGalleryItem[];
}

async function parseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return body.message ?? body.error ?? `Request failed (${response.status})`;
}

export async function fetchPrivateAlbum(slug: string): Promise<PrivateAlbumAccessResponse | null> {
  const response = await fetch(
    `${API_BASE}/api/albums/access?slug=${encodeURIComponent(slug)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export function parseAlbumSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/album\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
