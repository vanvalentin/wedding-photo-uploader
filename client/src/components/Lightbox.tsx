import { useEffect, useCallback, useRef, useState, type TouchEvent } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { fetchBlobWithProgress } from '../utils/fetchWithProgress';
import {
  isSameOriginMediaApiUrl,
  resolveDownloadUrl,
  resolveMediumPreviewUrl,
  resolveViewUrl,
} from '../utils/mediaUrls';

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
  const blobUrlRef = useRef<string | null>(null);
  const [fullReady, setFullReady] = useState(false);
  const [mediumPreviewReady, setMediumPreviewReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);

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
    setFullReady(false);
    setMediumPreviewReady(false);
    setLoadProgress(null);
    setFullImageUrl(null);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (!item || item.isVideo) return;

    const viewUrl = resolveViewUrl(item);
    const shouldFetchWithProgress = isSameOriginMediaApiUrl(viewUrl);

    if (!shouldFetchWithProgress) {
      setFullImageUrl(viewUrl);
      setFullReady(true);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    fetchBlobWithProgress(
      viewUrl,
      (progress) => {
        if (!cancelled) setLoadProgress(progress);
      },
      controller.signal
    )
      .then((blob) => {
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setFullImageUrl(blobUrl);
      })
      .catch((error) => {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return;
        setFullImageUrl(viewUrl);
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [item?.id, item?.isVideo]);

  if (!item || activeIndex === null) return null;

  const viewUrl = resolveViewUrl(item);
  const downloadUrl = resolveDownloadUrl(item);
  const shouldFetchWithProgress = !item.isVideo && isSameOriginMediaApiUrl(viewUrl);
  const mediumPreviewUrl = resolveMediumPreviewUrl(item);
  const visibleSrc =
    fullReady && fullImageUrl
      ? fullImageUrl
      : mediumPreviewReady && mediumPreviewUrl
        ? mediumPreviewUrl
        : item.previewUrl;
  const showFullLoadStatus = shouldFetchWithProgress && !fullReady;

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
        ) : (
          <div className="lightbox-image-wrap" onClick={(e) => e.stopPropagation()}>
            {shouldFetchWithProgress && mediumPreviewUrl && !mediumPreviewReady && (
              <img
                src={mediumPreviewUrl}
                alt=""
                className="lightbox-image-hidden"
                aria-hidden="true"
                onLoad={() => setMediumPreviewReady(true)}
              />
            )}
            {fullImageUrl && !fullReady && (
              <img
                src={fullImageUrl}
                alt=""
                className="lightbox-image-hidden"
                aria-hidden="true"
                onLoad={() => setFullReady(true)}
                onError={() => setFullReady(true)}
              />
            )}
            <img
              key={item.id}
              src={visibleSrc}
              alt={item.name}
              className={`lightbox-image${!fullReady && !mediumPreviewReady ? ' lightbox-image-soft' : ''}`}
            />
            {showFullLoadStatus && (
              <div className="lightbox-load-status" aria-live="polite">
                <span>{t.loadingPreview}</span>
                <div
                  className="lightbox-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={loadProgress ?? undefined}
                >
                  <div
                    className={`lightbox-progress-bar${loadProgress === null ? ' lightbox-progress-bar-indeterminate' : ''}`}
                    style={loadProgress !== null ? { width: `${loadProgress}%` } : undefined}
                  />
                </div>
              </div>
            )}
          </div>
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
