import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { useCuratedGallery } from '../hooks/useCuratedGallery';
import { HighlightsCarousel, HIGHLIGHTS_CAROUSEL_SIZE } from './HighlightsCarousel';

export function CuratedGallery() {
  const { t } = useI18n();
  const { items, loading, error } = useCuratedGallery();

  if (loading) {
    return (
      <section className="curated-gallery" aria-busy="true">
        <h2 className="curated-gallery-title">{t.curatedGalleryTitle}</h2>
        <p className="curated-gallery-loading">{t.curatedGalleryLoading}</p>
      </section>
    );
  }

  if (error || items.length === 0) {
    return null;
  }

  const carouselItems: MediaPreview[] = items.slice(0, HIGHLIGHTS_CAROUSEL_SIZE).map((item) => ({
    id: item.id,
    previewUrl: item.thumbnailUrl,
    viewUrl: item.viewUrl,
    name: item.name,
    isVideo: item.isVideo,
    caption: item.caption,
  }));

  return (
    <section className="curated-gallery">
      <h2 className="curated-gallery-title">{t.curatedGalleryTitle}</h2>
      <p className="curated-gallery-subtitle">{t.curatedGallerySubtitle}</p>
      <HighlightsCarousel items={carouselItems} />
      <div className="curated-gallery-footer">
        <a href="/highlights" className="curated-see-more">
          {t.curatedSeeMore}
        </a>
      </div>
    </section>
  );
}
