import type { MediaPreview } from '../types';

interface GalleryMediaThumbProps {
  item: MediaPreview;
  alt?: string;
}

export function GalleryMediaThumb({ item, alt = '' }: GalleryMediaThumbProps) {
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
