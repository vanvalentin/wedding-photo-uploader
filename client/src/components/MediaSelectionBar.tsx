import { useMemo, useState } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { bulkDownloadMedia } from '../utils/bulkDownload';

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

export function MediaSelectionBar({
  selectedItems,
  visibleCount,
  onSelectAllVisible,
  onCancel,
}: MediaSelectionBarProps) {
  const { t } = useI18n();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPhotos = useMemo(
    () => selectedItems.filter((item) => !item.isVideo),
    [selectedItems]
  );
  const hasPhotos = selectedPhotos.length > 0;

  const handleDownload = async () => {
    if (!hasPhotos || downloading) return;

    setDownloading(true);
    setError(null);
    setProgress({ current: 0, total: selectedPhotos.length });

    try {
      await bulkDownloadMedia(selectedPhotos, (current, total) => {
        setProgress({ current, total });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
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
            ? t.downloadingProgress
                .replace('{current}', String(progress.current))
                .replace('{total}', String(progress.total))
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
        disabled={!hasPhotos || downloading}
      >
        <DownloadIcon />
        <span>{t.downloadSelected}</span>
      </button>

      {error && <p className="media-selection-bar-error">{error}</p>}
    </div>
  );
}
