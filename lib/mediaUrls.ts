import { config } from './config.js';
import type { StorageProvider } from './mediaUploads.js';

type MediaVariant = 'thumbnail' | 'preview' | 'view';

function encodeObjectKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export function toMediaUrl(
  variant: MediaVariant,
  provider: StorageProvider,
  key: string
): string {
  if (provider === 'r2' && config.r2.publicUrl) {
    return `${config.r2.publicUrl}/${encodeObjectKey(key)}`;
  }

  const params = new URLSearchParams({
    provider,
    key,
  });
  return `/api/media/${variant}?${params.toString()}`;
}

export function toMediaThumbnailUrl(
  provider: StorageProvider,
  key: string,
  isVideo: boolean,
  thumbnail?: {
    provider?: StorageProvider | null;
    key?: string | null;
  }
): string {
  if (thumbnail?.provider && thumbnail.key) {
    return toMediaUrl('thumbnail', thumbnail.provider, thumbnail.key);
  }

  if (provider === 'r2' && config.r2.publicUrl && isVideo) {
    const params = new URLSearchParams({
      provider,
      key,
    });
    return `/api/media/thumbnail?${params.toString()}`;
  }

  return toMediaUrl('thumbnail', provider, key);
}
