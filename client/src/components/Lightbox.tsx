import { useEffect, useCallback, useRef, useState, type TouchEvent } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { resolveDownloadUrl, resolveViewUrl } from '../utils/mediaUrls';

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

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0l4-4m-4 4l-4-4M5 19h14"
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
  const [fullLoaded, setFullLoaded] = useState(false);

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

  useEffect(() => {
    setFullLoaded(false);
  }, [item?.id]);

  useEffect(() => {
    if (activeIndex === null) return;

    for (const offset of [-1, 1]) {
      const neighbor = items[activeIndex + offset];
      if (!neighbor || neighbor.isVideo) continue;

      const url = resolveViewUrl(neighbor);
      if (url.startsWith('blob:')) continue;

      const img = new Image();
      img.src = url;
    }
  }, [activeIndex, items]);

  if (!item || activeIndex === null) return null;

  const viewUrl = resolveViewUrl(item);
  const downloadUrl = resolveDownloadUrl(item);
  const showImageProgressive = !item.isVideo && !viewUrl.startsWith('blob:');

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

      {!item.isVideo && (
        <a
          href={downloadUrl}
          download={item.name}
          className="lightbox-download"
          aria-label={t.downloadImage}
          onClick={(event) => event.stopPropagation()}
        >
          <DownloadIcon />
          <span>{t.downloadImage}</span>
        </a>
      )}

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
        ) : showImageProgressive ? (
          <div className="lightbox-image-stack" onClick={(e) => e.stopPropagation()}>
            {!fullLoaded && (
              <>
                <img
                  src={item.previewUrl}
                  alt=""
                  className="lightbox-image lightbox-image-preview"
                  aria-hidden="true"
                />
                <div className="lightbox-loading" aria-live="polite">
                  <span className="spinner" aria-hidden="true" />
                  {t.loadingPreview}
                </div>
              </>
            )}
            <img
              key={item.id}
              src={viewUrl}
              alt={item.name}
              className={`lightbox-image lightbox-image-full${fullLoaded ? ' is-loaded' : ''}`}
              onLoad={() => setFullLoaded(true)}
            />
          </div>
        ) : (
          <img
            key={item.id}
            src={viewUrl}
            alt={item.name}
            onClick={(e) => e.stopPropagation()}
          />
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
