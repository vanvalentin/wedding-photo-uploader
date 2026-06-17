import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { useCuratedGallery } from '../hooks/useCuratedGallery';
import { LanguageToggle } from './LanguageToggle';
import { MediaPreviewGrid } from './MediaPreviewGrid';

const HIGHLIGHTS_PAGE_SIZE = 12;

export function HighlightsPage() {
  const { t } = useI18n();
  const { items, loading, error } = useCuratedGallery();

  const previewItems: MediaPreview[] = items.map((item) => ({
    id: item.id,
    previewUrl: item.thumbnailUrl,
    viewUrl: item.viewUrl,
    name: item.name,
    isVideo: item.isVideo,
    caption: item.caption,
  }));

  return (
    <div className="app highlights-page">
      <header className="header">
        <div className="header-top">
          <a href="/" className="highlights-back-link">
            {t.backToUpload}
          </a>
          <LanguageToggle />
        </div>
        <div className="header-content">
          <h1 className="header-title highlights-page-title">{t.curatedGalleryTitle}</h1>
          <p className="header-subtitle">{t.curatedGallerySubtitle}</p>
        </div>
      </header>

      <main className="main">
        {loading && <p className="curated-gallery-loading">{t.curatedGalleryLoading}</p>}
        {error && <p className="admin-error">{error}</p>}
        {!loading && !error && previewItems.length === 0 && (
          <p className="curated-gallery-loading">{t.curatedGalleryEmpty}</p>
        )}
        {!loading && previewItems.length > 0 && (
          <MediaPreviewGrid items={previewItems} pageSize={HIGHLIGHTS_PAGE_SIZE} />
        )}
      </main>

      <footer className="footer">
        <p>♥</p>
      </footer>
    </div>
  );
}
