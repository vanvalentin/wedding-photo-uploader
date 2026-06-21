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

function albumPasswordKey(slug: string): string {
  return `private-album-password:${slug}`;
}

export function getStoredAlbumPassword(slug: string): string | null {
  return sessionStorage.getItem(albumPasswordKey(slug));
}

export function storeAlbumPassword(slug: string, password: string): void {
  sessionStorage.setItem(albumPasswordKey(slug), password);
}

export function clearAlbumPassword(slug: string): void {
  sessionStorage.removeItem(albumPasswordKey(slug));
}

async function parseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return body.message ?? body.error ?? `Request failed (${response.status})`;
}

export async function fetchAlbumInfo(slug: string): Promise<{ title: string } | null> {
  const response = await fetch(
    `${API_BASE}/api/albums/access?slug=${encodeURIComponent(slug)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { title: string };
  return { title: body.title };
}

export async function accessPrivateAlbum(
  slug: string,
  password: string
): Promise<PrivateAlbumAccessResponse> {
  const response = await fetch(`${API_BASE}/api/albums/access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, password }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export function parseAlbumSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/album\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
