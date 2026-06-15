import type { QueuedFile } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { ProgressBar } from './ProgressBar';

interface MediaThumbnailProps {
  item: QueuedFile;
  onPreview: (item: QueuedFile) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  disabled?: boolean;
}

export function MediaThumbnail({ item, onPreview, onRemove, onRetry, disabled }: MediaThumbnailProps) {
  const { t } = useI18n();
  const showProgress = item.status === 'uploading' || item.status === 'complete' || item.status === 'error';

  return (
    <div className={`media-thumbnail ${item.status}`}>
      <button
        type="button"
        className="thumbnail-preview"
        onClick={() => onPreview(item)}
        aria-label={item.file.name}
      >
        {item.isVideo ? (
          <>
            <video src={item.previewUrl} muted playsInline preload="metadata" />
            <span className="video-badge" aria-hidden="true">▶</span>
          </>
        ) : (
          <img src={item.previewUrl} alt={item.file.name} loading="lazy" />
        )}
      </button>

      {!disabled && item.status === 'pending' && (
        <button
          type="button"
          className="thumbnail-remove"
          onClick={() => onRemove(item.id)}
          aria-label={`${t.remove} ${item.file.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {showProgress && (
        <div className="thumbnail-progress">
          <ProgressBar progress={item.progress} status={item.status} label={t.progress} />
          <span className={`thumbnail-status ${item.status}`}>
            {item.status === 'uploading' && `${item.progress}%`}
            {item.status === 'complete' && t.uploadComplete}
            {item.status === 'error' && (
              <button type="button" className="retry-button" onClick={() => onRetry(item.id)}>
                {t.retry}
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
