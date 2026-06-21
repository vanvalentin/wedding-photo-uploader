import { useEffect, useRef, useState } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { Lightbox } from './Lightbox';
import { GalleryMediaThumb } from './GalleryMediaThumb';

interface MediaPreviewGridProps {
  items: MediaPreview[];
  pageSize: number;
  showLoadMore?: boolean;
  loadMoreOnScroll?: boolean;
}

export function MediaPreviewGrid({
  items,
  pageSize,
  showLoadMore = true,
  loadMoreOnScroll = false,
}: MediaPreviewGridProps) {
  const { t } = useI18n();
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  useEffect(() => {
    if (!loadMoreOnScroll || !hasMore) return;

    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + pageSize, items.length));
        }
      },
      { rootMargin: '240px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreOnScroll, hasMore, items.length, pageSize]);

  const openPreview = (item: MediaPreview) => {
    const index = items.findIndex((entry) => entry.id === item.id);
    if (index >= 0) setPreviewIndex(index);
  };

  return (
    <>
      <div className="media-grid">
        {visibleItems.map((item) => (
          <div key={item.id} className="media-thumbnail complete preview-only">
            <button
              type="button"
              className="thumbnail-preview"
              onClick={() => openPreview(item)}
              aria-label={item.name}
            >
              <GalleryMediaThumb item={item} />
            </button>
          </div>
        ))}
      </div>

      {hasMore && loadMoreOnScroll && (
        <div ref={loadMoreRef} className="infinite-scroll-sentinel" aria-hidden="true" />
      )}

      {hasMore && showLoadMore && !loadMoreOnScroll && (
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

      {hasMore && loadMoreOnScroll && (
        <p className="gallery-loading-more">{t.loadingMore}</p>
      )}

      <Lightbox
        items={items}
        activeIndex={previewIndex}
        onActiveIndexChange={setPreviewIndex}
      />
    </>
  );
}
