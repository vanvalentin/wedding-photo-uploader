import { useEffect, useRef, useState } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLongPress } from '../hooks/useLongPress';
import { useMediaSelection } from '../hooks/useMediaSelection';
import { Lightbox } from './Lightbox';
import { GalleryMediaThumb } from './GalleryMediaThumb';
import { MediaSelectionBar } from './MediaSelectionBar';

interface MediaPreviewGridProps {
  items: MediaPreview[];
  pageSize: number;
  showLoadMore?: boolean;
  loadMoreOnScroll?: boolean;
  selectable?: boolean;
}

interface MediaPreviewGridItemProps {
  item: MediaPreview;
  isSelected: boolean;
  isSelecting: boolean;
  selectionEnabled: boolean;
  onOpenPreview: (item: MediaPreview) => void;
  onLongPressSelect: (item: MediaPreview) => void;
  onToggleSelect: (item: MediaPreview) => void;
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12l5 5L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MediaPreviewGridItem({
  item,
  isSelected,
  isSelecting,
  selectionEnabled,
  onOpenPreview,
  onLongPressSelect,
  onToggleSelect,
}: MediaPreviewGridItemProps) {
  const { longPressHandlers, consumeLongPress } = useLongPress({
    disabled: !selectionEnabled || isSelecting,
    onLongPress: () => onLongPressSelect(item),
  });

  const handleClick = () => {
    if (consumeLongPress()) return;
    if (isSelecting) {
      onToggleSelect(item);
      return;
    }
    onOpenPreview(item);
  };

  return (
    <div
      className={`media-thumbnail complete preview-only${isSelected ? ' media-thumbnail--selected' : ''}`}
    >
      <button
        type="button"
        className="thumbnail-preview"
        onClick={handleClick}
        aria-label={item.name}
        aria-pressed={isSelecting ? isSelected : undefined}
        {...(selectionEnabled ? longPressHandlers : {})}
      >
        <GalleryMediaThumb item={item} />
        {isSelecting && (
          <span className={`media-selection-check${isSelected ? ' media-selection-check--active' : ''}`}>
            {isSelected && <CheckIcon />}
          </span>
        )}
      </button>
    </div>
  );
}

export function MediaPreviewGrid({
  items,
  pageSize,
  showLoadMore = true,
  loadMoreOnScroll = false,
  selectable = false,
}: MediaPreviewGridProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const selectionEnabled = selectable && isMobile;
  const {
    selectedIds,
    isSelecting,
    enterSelectionMode,
    exitSelectionMode,
    toggle,
    selectAll,
    isSelected,
  } = useMediaSelection();
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  useEffect(() => {
    exitSelectionMode();
  }, [items, exitSelectionMode]);

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

  const handleLongPressSelect = (item: MediaPreview) => {
    enterSelectionMode();
    toggle(item.id);
  };

  const handleToggleSelect = (item: MediaPreview) => {
    toggle(item.id);
  };

  const handleSelectAllVisible = () => {
    selectAll(visibleItems.map((item) => item.id));
  };

  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  return (
    <>
      {selectionEnabled && !isSelecting && (
        <p className="media-selection-hint">{t.selectionModeHint}</p>
      )}

      <div className={`media-grid${isSelecting ? ' media-grid--selecting' : ''}`}>
        {visibleItems.map((item) => (
          <MediaPreviewGridItem
            key={item.id}
            item={item}
            isSelected={isSelected(item.id)}
            isSelecting={isSelecting}
            selectionEnabled={selectionEnabled}
            onOpenPreview={openPreview}
            onLongPressSelect={handleLongPressSelect}
            onToggleSelect={handleToggleSelect}
          />
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

      {selectionEnabled && isSelecting && (
        <MediaSelectionBar
          selectedItems={selectedItems}
          visibleCount={visibleItems.length}
          onSelectAllVisible={handleSelectAllVisible}
          onCancel={exitSelectionMode}
        />
      )}

      <Lightbox
        items={items}
        activeIndex={previewIndex}
        onActiveIndexChange={setPreviewIndex}
      />
    </>
  );
}
