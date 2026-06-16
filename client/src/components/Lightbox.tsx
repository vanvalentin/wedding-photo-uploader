import { useEffect, useCallback, useRef, type TouchEvent } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface LightboxProps {
  items: MediaPreview[];
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Lightbox({ items, activeIndex, onActiveIndexChange }: LightboxProps) {
  const { t } = useI18n();
  const touchStartX = useRef<number | null>(null);

  const item = activeIndex !== null ? items[activeIndex] ?? null : null;
  const hasPrevious = activeIndex !== null && activeIndex > 0;
  const hasNext = activeIndex !== null && activeIndex < items.length - 1;

  const onClose = useCallback(() => {
    onActiveIndexChange(null);
  }, [onActiveIndexChange]);

  const goPrevious = useCallback(() => {
    if (activeIndex === null || activeIndex <= 0) return;
    onActiveIndexChange(activeIndex - 1);
  }, [activeIndex, onActiveIndexChange]);

  const goNext = useCallback(() => {
    if (activeIndex === null || activeIndex >= items.length - 1) return;
    onActiveIndexChange(activeIndex + 1);
  }, [activeIndex, items.length, onActiveIndexChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrevious();
      if (e.key === 'ArrowRight') goNext();
    },
    [onClose, goPrevious, goNext]
  );

  useEffect(() => {
    if (activeIndex === null) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeIndex, handleKeyDown]);

  if (!item || activeIndex === null) return null;

  const viewUrl =
    item.viewUrl ??
    (item.previewUrl.includes('/api/media/thumbnail')
      ? item.previewUrl.replace('/api/media/thumbnail', '/api/media/view')
      : item.previewUrl);

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(delta) < 50) return;
    if (delta < 0) goNext();
    else goPrevious();
  };

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button type="button" className="lightbox-close" onClick={onClose} aria-label={t.close}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {hasPrevious && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-prev"
          onClick={(event) => {
            event.stopPropagation();
            goPrevious();
          }}
          aria-label={t.previousImage}
        >
          <ChevronIcon direction="left" />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-next"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          aria-label={t.nextImage}
        >
          <ChevronIcon direction="right" />
        </button>
      )}

      <div className="lightbox-content" onClick={onClose}>
        {item.isVideo ? (
          <video
            key={item.id}
            src={viewUrl}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img key={item.id} src={viewUrl} alt={item.name} onClick={(e) => e.stopPropagation()} />
        )}
      </div>

      <p className="lightbox-filename">
        {items.length > 1 && (
          <span className="lightbox-counter">
            {activeIndex + 1} / {items.length}
            {' · '}
          </span>
        )}
        {item.caption ? item.caption : item.name}
      </p>
    </div>
  );
}
