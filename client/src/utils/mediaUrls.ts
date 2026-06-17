import type { MediaPreview } from '../types';

export function resolveViewUrl(item: MediaPreview): string {
  if (item.viewUrl) return item.viewUrl;
  if (item.previewUrl.includes('/api/media/thumbnail')) {
    return item.previewUrl.replace('/api/media/thumbnail', '/api/media/view');
  }
  return item.previewUrl;
}

export function resolveDownloadUrl(item: MediaPreview): string {
  const viewUrl = resolveViewUrl(item);
  if (viewUrl.startsWith('blob:')) return viewUrl;

  const url = new URL(viewUrl, window.location.origin);
  url.searchParams.set('download', '1');
  return url.pathname + url.search;
}
