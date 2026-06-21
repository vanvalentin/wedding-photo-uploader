import { useMemo, useState } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import {
  BulkDownloadError,
  bulkDownloadMedia,
  MAX_ZIP_PHOTOS,
  type BulkDownloadProgress,
} from '../utils/bulkDownload';

interface MediaSelectionBarProps {
  selectedItems: MediaPreview[];
  visibleCount: number;
  onSelectAllVisible: () => void;
  onCancel: () => void;
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function formatProgress(t: {
  downloadingProgress: string;
  zippingProgress: string;
}, progress: BulkDownloadProgress): string {
  if (progress.phase === 'zipping') {
    return t.zippingProgress;
  }

  return t.downloadingProgress
    .replace('{current}', String(progress.current))
    .replace('{total}', String(progress.total));
}

export function MediaSelectionBar({
  selectedItems,
  visibleCount,
  onSelectAllVisible,
  onCancel,
}: MediaSelectionBarProps) {
  const { t } = useI18n();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<BulkDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPhotos = useMemo(
    () => selectedItems.filter((item) => !item.isVideo),
    [selectedItems]
  );
  const hasPhotos = selectedPhotos.length > 0;
  const exceedsZipLimit = selectedPhotos.length > MAX_ZIP_PHOTOS;

  const resolveErrorMessage = (err: unknown): string => {
    if (err instanceof BulkDownloadError) {
      if (err.code === 'too_many') {
        return t.downloadZipTooMany.replace('{max}', String(MAX_ZIP_PHOTOS));
      }
      if (err.code === 'too_large') {
        return t.downloadZipTooLarge;
      }
    }

    return err instanceof Error ? err.message : t.error;
  };

  const handleDownload = async () => {
    if (!hasPhotos || downloading || exceedsZipLimit) return;

    setDownloading(true);
    setError(null);
    setProgress({ phase: 'fetching', current: 0, total: selectedPhotos.length });

    try {
      await bulkDownloadMedia(selectedPhotos, setProgress);
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };

  return (
    <div className="media-selection-bar" role="toolbar" aria-label={t.selectedCount.replace('{count}', String(selectedItems.length))}>
      <div className="media-selection-bar-main">
        <span className="media-selection-bar-count">
          {downloading && progress
            ? formatProgress(t, progress)
            : t.selectedCount.replace('{count}', String(selectedItems.length))}
        </span>
        <div className="media-selection-bar-actions">
          <button
            type="button"
            className="media-selection-bar-link"
            onClick={onSelectAllVisible}
            disabled={downloading || visibleCount === 0}
          >
            {t.selectAll}
          </button>
          <button
            type="button"
            className="media-selection-bar-link"
            onClick={onCancel}
            disabled={downloading}
          >
            {t.cancelSelection}
          </button>
        </div>
      </div>

      <button
        type="button"
        className="media-selection-bar-download"
        onClick={handleDownload}
        disabled={!hasPhotos || downloading || exceedsZipLimit}
      >
        <DownloadIcon />
        <span>{selectedPhotos.length > 1 ? t.downloadSelectedZip : t.downloadSelected}</span>
      </button>

      {exceedsZipLimit && !downloading && (
        <p className="media-selection-bar-error">
          {t.downloadZipTooMany.replace('{max}', String(MAX_ZIP_PHOTOS))}
        </p>
      )}

      {error && <p className="media-selection-bar-error">{error}</p>}
    </div>
  );
}
