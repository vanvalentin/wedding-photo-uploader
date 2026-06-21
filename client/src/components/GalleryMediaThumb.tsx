import type { MediaPreview } from '../types';
import { resolveViewUrl } from '../utils/mediaUrls';

interface GalleryMediaThumbProps {
  item: MediaPreview;
  alt?: string;
}

export function GalleryMediaThumb({ item, alt = '' }: GalleryMediaThumbProps) {
  if (item.isVideo) {
    return (
      <>
        <video
          src={resolveViewUrl(item)}
          muted
          playsInline
          preload="metadata"
          aria-label={alt || item.name}
        />
        <span className="video-badge" aria-hidden="true">
          ▶
        </span>
      </>
    );
  }

  return <img src={item.previewUrl} alt={alt || item.name} loading="lazy" />;
}
