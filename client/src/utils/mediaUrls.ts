import type { MediaPreview } from '../types';

export function resolveViewUrl(item: MediaPreview): string {
  if (item.viewUrl) return item.viewUrl;
  if (item.previewUrl.includes('/api/media/thumbnail')) {
    return item.previewUrl.replace('/api/media/thumbnail', '/api/media/view');
  }
  return item.previewUrl;
}

export function resolveMediumPreviewUrl(item: MediaPreview): string | null {
  const viewUrl = resolveViewUrl(item);
  if (viewUrl.startsWith('blob:')) return null;

  if (viewUrl.includes('/api/media/view')) {
    return viewUrl.replace('/api/media/view', '/api/media/preview');
  }

  const match = viewUrl.match(/fileId=([^&]+)/);
  if (match) {
    return `/api/media/preview?fileId=${encodeURIComponent(match[1]!)}`;
  }

  return null;
}

export function resolveDownloadUrl(item: MediaPreview): string {
  const viewUrl = resolveViewUrl(item);
  if (viewUrl.startsWith('blob:')) return viewUrl;

  const url = new URL(viewUrl, window.location.origin);
  url.searchParams.set('download', '1');
  return url.pathname + url.search;
}
