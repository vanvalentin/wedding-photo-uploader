import { useState } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { Lightbox } from './Lightbox';

interface MediaPreviewGridProps {
  items: MediaPreview[];
  pageSize: number;
  showLoadMore?: boolean;
}

export function MediaPreviewGrid({ items, pageSize, showLoadMore = true }: MediaPreviewGridProps) {
  const { t } = useI18n();
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [previewItem, setPreviewItem] = useState<MediaPreview | null>(null);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = showLoadMore && visibleCount < items.length;

  return (
    <>
      <div className="media-grid">
        {visibleItems.map((item) => (
          <div key={item.id} className="media-thumbnail complete preview-only">
            <button
              type="button"
              className="thumbnail-preview"
              onClick={() => setPreviewItem(item)}
              aria-label={item.name}
            >
              {item.isVideo && item.previewUrl.startsWith('blob:') ? (
                <>
                  <video src={item.previewUrl} muted playsInline preload="metadata" />
                  <span className="video-badge" aria-hidden="true">▶</span>
                </>
              ) : item.isVideo ? (
                <>
                  <img src={item.previewUrl} alt={item.name} loading="lazy" />
                  <span className="video-badge" aria-hidden="true">▶</span>
                </>
              ) : (
                <img src={item.previewUrl} alt={item.name} loading="lazy" />
              )}
            </button>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          className="load-more-button"
          onClick={() => setVisibleCount((count) => count + pageSize)}
        >
          {t.loadMore}
          <span className="load-more-count">
            ({visibleItems.length}/{items.length})
          </span>
        </button>
      )}

      <Lightbox item={previewItem} onClose={() => setPreviewItem(null)} />
    </>
  );
}
