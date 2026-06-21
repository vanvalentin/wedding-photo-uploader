import { zipSync } from 'fflate';
import type { MediaPreview } from '../types';
import { resolveDownloadUrl } from './mediaUrls';

export const MAX_ZIP_PHOTOS = 30;
export const MAX_ZIP_BYTES = 100 * 1024 * 1024;

export type BulkDownloadErrorCode = 'too_many' | 'too_large' | 'fetch_failed';

export class BulkDownloadError extends Error {
  readonly code: BulkDownloadErrorCode;

  constructor(code: BulkDownloadErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'BulkDownloadError';
    this.code = code;
  }
}

export type BulkDownloadProgress = {
  phase: 'fetching' | 'zipping';
  current: number;
  total: number;
};

function uniqueFilename(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }

  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex >= 0 ? name.slice(0, dotIndex) : name;
  const extension = dotIndex >= 0 ? name.slice(dotIndex) : '';
  let index = 2;

  while (used.has(`${base} (${index})${extension}`)) {
    index += 1;
  }

  const unique = `${base} (${index})${extension}`;
  used.add(unique);
  return unique;
}

async function fetchPhotoBytes(item: MediaPreview): Promise<Uint8Array> {
  const url = resolveDownloadUrl(item);
  const response = await fetch(url);
  if (!response.ok) {
    throw new BulkDownloadError('fetch_failed', `Failed to download ${item.name}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function triggerDownload(bytes: Uint8Array, filename: string, type: string): void {
  const blob = new Blob([bytes.slice()], { type });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

function buildZipFilename(): string {
  return `photos-${new Date().toISOString().slice(0, 10)}.zip`;
}

export async function bulkDownloadMedia(
  items: MediaPreview[],
  onProgress?: (progress: BulkDownloadProgress) => void
): Promise<void> {
  const photos = items.filter((item) => !item.isVideo);
  if (photos.length === 0) return;

  if (photos.length > MAX_ZIP_PHOTOS) {
    throw new BulkDownloadError('too_many');
  }

  if (photos.length === 1) {
    onProgress?.({ phase: 'fetching', current: 0, total: 1 });
    const bytes = await fetchPhotoBytes(photos[0]!);
    onProgress?.({ phase: 'fetching', current: 1, total: 1 });
    triggerDownload(bytes, photos[0]!.name, 'application/octet-stream');
    return;
  }

  const files: Record<string, Uint8Array> = {};
  const usedNames = new Set<string>();
  let totalBytes = 0;

  for (let index = 0; index < photos.length; index += 1) {
    const item = photos[index]!;
    onProgress?.({ phase: 'fetching', current: index, total: photos.length });

    const bytes = await fetchPhotoBytes(item);
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_ZIP_BYTES) {
      throw new BulkDownloadError('too_large');
    }

    files[uniqueFilename(item.name, usedNames)] = bytes;
    onProgress?.({ phase: 'fetching', current: index + 1, total: photos.length });
  }

  onProgress?.({ phase: 'zipping', current: photos.length, total: photos.length });
  const zipped = zipSync(files);
  triggerDownload(zipped, buildZipFilename(), 'application/zip');
}
