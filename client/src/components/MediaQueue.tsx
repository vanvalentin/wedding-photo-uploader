import { useState } from 'react';
import type { QueuedFile, MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { MediaThumbnail } from './MediaThumbnail';
import { Lightbox } from './Lightbox';

interface MediaQueueProps {
  queue: QueuedFile[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  isUploading: boolean;
}

export function MediaQueue({ queue, onRemove, onRetry, isUploading }: MediaQueueProps) {
  const { t } = useI18n();
  const [previewItem, setPreviewItem] = useState<MediaPreview | null>(null);

  if (queue.length === 0) {
    return <p className="queue-empty">{t.queueEmpty}</p>;
  }

  return (
    <>
      <h2 className="queue-title">
        {t.queueTitle}
        <span className="queue-count">{queue.length}</span>
      </h2>
      <div className="media-grid">
        {queue.map((item) => (
          <MediaThumbnail
            key={item.id}
            item={item}
            onPreview={(item) =>
              setPreviewItem({
                id: item.id,
                previewUrl: item.previewUrl,
                name: item.file.name,
                isVideo: item.isVideo,
              })
            }
            onRemove={onRemove}
            onRetry={onRetry}
            disabled={isUploading}
          />
        ))}
      </div>
      <Lightbox item={previewItem} onClose={() => setPreviewItem(null)} />
    </>
  );
}
