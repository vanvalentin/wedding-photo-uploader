import { useMemo } from 'react';
import type { MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { useCuratedGallery } from '../hooks/useCuratedGallery';
import { pickRandomItems } from '../utils/shuffleArray';
import { HighlightsCarousel, HIGHLIGHTS_CAROUSEL_SIZE } from './HighlightsCarousel';
import { HighlightsCarouselSkeleton } from './HighlightsCarouselSkeleton';

export function CuratedGallery() {
  const { t } = useI18n();
  const { items, loading, error } = useCuratedGallery();

  const carouselItems: MediaPreview[] = useMemo(() => {
    const photos = items.filter((item) => !item.isVideo);
    return pickRandomItems(photos, HIGHLIGHTS_CAROUSEL_SIZE).map((item) => ({
      id: item.id,
      previewUrl: item.thumbnailUrl,
      viewUrl: item.viewUrl,
      name: item.name,
      isVideo: false,
      caption: item.caption,
    }));
  }, [items]);

  if (loading) {
    return (
      <section className="curated-gallery" aria-busy="true" aria-label={t.curatedGalleryLoading}>
        <h2 className="curated-gallery-title">{t.curatedGalleryTitle}</h2>
        <HighlightsCarouselSkeleton />
      </section>
    );
  }

  if (error || carouselItems.length === 0) {
    return null;
  }

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
