import type { MediaPreview } from '../types';

interface GalleryMediaThumbProps {
  item: MediaPreview;
  alt?: string;
}

function videoPreviewSrc(item: MediaPreview): string | null {
  if (item.viewUrl) return item.viewUrl;
  if (item.previewUrl.startsWith('blob:')) return item.previewUrl;
  return null;
}

export function GalleryMediaThumb({ item, alt = '' }: GalleryMediaThumbProps) {
  const videoSrc = item.isVideo ? videoPreviewSrc(item) : null;

  if (item.isVideo && videoSrc) {
    return (
      <>
        <video src={videoSrc} muted playsInline preload="metadata" aria-hidden="true" />
        <span className="video-badge" aria-hidden="true">
          ▶
        </span>
      </>
    );
  }

  return (
    <>
      <img src={item.previewUrl} alt={alt || item.name} loading="lazy" />
      {item.isVideo && (
        <span className="video-badge" aria-hidden="true">
          ▶
        </span>
      )}
    </>
  );
}
