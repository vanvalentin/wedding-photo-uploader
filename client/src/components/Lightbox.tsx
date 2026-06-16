import { useEffect, useCallback } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface LightboxProps {
  item: MediaPreview | null;
  onClose: () => void;
}

export function Lightbox({ item, onClose }: LightboxProps) {
  const { t } = useI18n();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!item) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [item, handleKeyDown]);

  if (!item) return null;

  const viewUrl =
    item.viewUrl ??
    (item.previewUrl.includes('/api/media/thumbnail')
      ? item.previewUrl.replace('/api/media/thumbnail', '/api/media/view')
      : item.previewUrl);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={item.name}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label={t.close}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div className="lightbox-content" onClick={onClose}>
        {item.isVideo ? (
          <video
            src={viewUrl}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img src={viewUrl} alt={item.name} onClick={(e) => e.stopPropagation()} />
        )}
      </div>
      <p className="lightbox-filename">
        {item.caption ? item.caption : item.name}
      </p>
    </div>
  );
}
