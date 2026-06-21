import type { MediaPreview } from '../types';
import { resolveDownloadUrl } from './mediaUrls';

async function downloadMediaItem(item: MediaPreview): Promise<void> {
  const url = resolveDownloadUrl(item);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${item.name}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = item.name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

export async function bulkDownloadMedia(
  items: MediaPreview[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  const photos = items.filter((item) => !item.isVideo);
  if (photos.length === 0) return;

  for (let index = 0; index < photos.length; index += 1) {
    await downloadMediaItem(photos[index]!);
    onProgress?.(index + 1, photos.length);
    if (index < photos.length - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    }
  }
}
