import type { QueuedFile } from '../types';
import { SUCCESS_GALLERY_PAGE_SIZE } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { MediaPreviewGrid } from './MediaPreviewGrid';

interface ThankYouScreenProps {
  completedItems: QueuedFile[];
  onUploadMore: () => void;
}

function formatUploadSummary(
  photoCount: number,
  videoCount: number,
  t: ReturnType<typeof useI18n>['t']
): string {
  const parts: string[] = [];

  if (photoCount > 0) {
    parts.push(
      photoCount === 1
        ? t.uploadSummaryOnePhoto
        : t.uploadSummaryPhotos.replace('{count}', String(photoCount))
    );
  }

  if (videoCount > 0) {
    parts.push(
      videoCount === 1
        ? t.uploadSummaryOneVideo
        : t.uploadSummaryVideos.replace('{count}', String(videoCount))
    );
  }

  return parts.join(` ${t.uploadSummaryAnd} `);
}

export function ThankYouScreen({ completedItems, onUploadMore }: ThankYouScreenProps) {
  const { t } = useI18n();

  const photoCount = completedItems.filter((item) => !item.isVideo).length;
  const videoCount = completedItems.filter((item) => item.isVideo).length;
  const previewItems = completedItems.map((item) => ({
    id: item.id,
    previewUrl: item.previewUrl,
    name: item.file.name,
    isVideo: item.isVideo,
  }));

  return (
    <section className="thank-you" aria-live="polite">
      <div className="thank-you-icon" aria-hidden="true">♥</div>
      <h2>{t.thankYou}</h2>
      <p>{t.thankYouSubtitle}</p>

      <p className="upload-summary">{formatUploadSummary(photoCount, videoCount, t)}</p>

      {previewItems.length > 0 && (
        <div className="thank-you-gallery">
          <h3 className="thank-you-gallery-title">{t.yourUploadedMemories}</h3>
          <MediaPreviewGrid items={previewItems} pageSize={SUCCESS_GALLERY_PAGE_SIZE} />
        </div>
      )}

      <button type="button" className="upload-button thank-you-button" onClick={onUploadMore}>
        {t.uploadMore}
      </button>
    </section>
  );
}
