import { config } from './config.js';
import type { StorageProvider } from './mediaUploads.js';

type MediaVariant = 'thumbnail' | 'preview' | 'view';

export function encodeObjectKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export function getPublicR2ObjectUrl(key: string): string | null {
  if (!config.r2.publicUrl) return null;
  return `${config.r2.publicUrl}/${encodeObjectKey(key)}`;
}

function videoPlaceholderDataUrl(): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">',
    '<rect width="640" height="360" fill="#1f2937"/>',
    '<circle cx="320" cy="180" r="58" fill="rgba(255,255,255,0.18)"/>',
    '<path d="M304 145v70l58-35z" fill="white"/>',
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function toMediaUrl(
  variant: MediaVariant,
  provider: StorageProvider,
  key: string
): string {
  const publicR2Url = provider === 'r2' ? getPublicR2ObjectUrl(key) : null;
  if (publicR2Url) {
    return publicR2Url;
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
  isVideo: boolean
): string {
  if (provider === 'r2' && config.r2.publicUrl && isVideo) {
    return videoPlaceholderDataUrl();
  }

  return toMediaUrl('thumbnail', provider, key);
}
