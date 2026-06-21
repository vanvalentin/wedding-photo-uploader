import { useMemo, useState } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { useAllMediaGallery } from '../hooks/useAllMediaGallery';
import { LanguageToggle } from './LanguageToggle';
import { MediaPreviewGrid } from './MediaPreviewGrid';

type GalleryTab = 'photos' | 'videos';

const ALL_MEDIA_PAGE_SIZE = 12;

export function GalleryPage() {
  const { t } = useI18n();
  const { items, loading, error } = useAllMediaGallery();
  const [tab, setTab] = useState<GalleryTab>('photos');

  const photos = useMemo(() => items.filter((item) => !item.isVideo), [items]);
  const videos = useMemo(() => items.filter((item) => item.isVideo), [items]);
  const activeItems = tab === 'photos' ? photos : videos;

  const previewItems: MediaPreview[] = useMemo(
    () =>
      activeItems.map((item) => ({
        id: item.id,
        previewUrl: item.thumbnailUrl,
        viewUrl: item.viewUrl,
        name: item.fileName,
        isVideo: item.isVideo,
      })),
    [activeItems]
  );

  return (
    <div className="app gallery-page">
      <header className="header">
        <div className="header-top">
          <a href="/" className="highlights-back-link">
            {t.backToUpload}
          </a>
          <LanguageToggle />
        </div>
        <div className="header-content">
          <h1 className="header-title highlights-page-title">{t.allMediaTitle}</h1>
          <p className="header-subtitle">{t.allMediaSubtitle}</p>
        </div>
      </header>

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

      <main className="main">
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
            selectable
          />
        )}
        {!loading && items.length > 0 && (
          <div className="gallery-page-links">
            <a href="/highlights" className="curated-see-more curated-see-more-secondary">
              {t.viewHighlights}
            </a>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>♥</p>
      </footer>
    </div>
  );
}
