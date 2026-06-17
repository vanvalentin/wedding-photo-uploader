import { useMemo, useState } from 'react';
import type { MediaPreview, PublicMediaGalleryItem } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { useAllMediaGallery } from '../hooks/useAllMediaGallery';
import { MediaPreviewGrid } from './MediaPreviewGrid';

type GalleryTab = 'photos' | 'videos';

const ALL_MEDIA_PAGE_SIZE = 12;

function toPreviewItems(items: PublicMediaGalleryItem[]): MediaPreview[] {
  return items.map((item) => ({
    id: item.id,
    previewUrl: item.thumbnailUrl,
    viewUrl: item.viewUrl,
    name: item.fileName,
    isVideo: item.isVideo,
  }));
}

export function AllMediaGallerySection() {
  const { t } = useI18n();
  const { items, loading, error } = useAllMediaGallery();
  const [tab, setTab] = useState<GalleryTab>('photos');

  const photos = useMemo(() => items.filter((item) => !item.isVideo), [items]);
  const videos = useMemo(() => items.filter((item) => item.isVideo), [items]);
  const activeItems = tab === 'photos' ? photos : videos;
  const previewItems = useMemo(() => toPreviewItems(activeItems), [activeItems]);

  return (
    <section className="highlights-section all-media-section">
      <h2 className="highlights-section-title">{t.allMediaTitle}</h2>
      <p className="highlights-section-subtitle">{t.allMediaSubtitle}</p>

      <div className="gallery-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={tab === 'photos' ? 'active' : ''}
          aria-selected={tab === 'photos'}
          onClick={() => setTab('photos')}
        >
          {t.photosTab} ({photos.length})
        </button>
        <button
          type="button"
          role="tab"
          className={tab === 'videos' ? 'active' : ''}
          aria-selected={tab === 'videos'}
          onClick={() => setTab('videos')}
        >
          {t.videosTab} ({videos.length})
        </button>
      </div>

      {loading && <p className="curated-gallery-loading">{t.allMediaLoading}</p>}
      {error && <p className="admin-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="curated-gallery-loading">{t.allMediaEmpty}</p>
      )}
      {!loading && items.length > 0 && previewItems.length === 0 && (
        <p className="curated-gallery-loading">
          {tab === 'photos' ? t.allMediaNoPhotos : t.allMediaNoVideos}
        </p>
      )}
      {!loading && previewItems.length > 0 && (
        <MediaPreviewGrid
          key={tab}
          items={previewItems}
          pageSize={ALL_MEDIA_PAGE_SIZE}
          showLoadMore={false}
          loadMoreOnScroll
        />
      )}
    </section>
  );
}
