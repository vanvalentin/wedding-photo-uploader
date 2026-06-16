import { useEffect, useState } from 'react';
import type { CuratedGalleryItem, MediaPreview } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { fetchCuratedGallery } from '../services/galleryService';
import { MediaPreviewGrid } from './MediaPreviewGrid';

const CURATED_PAGE_SIZE = 9;

export function CuratedGallery() {
  const { t } = useI18n();
  const [items, setItems] = useState<CuratedGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGallery() {
      try {
        const response = await fetchCuratedGallery();
        if (!cancelled) {
          setItems(response.items);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load gallery');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGallery();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const previewItems: MediaPreview[] = items.map((item) => ({
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
      <MediaPreviewGrid items={previewItems} pageSize={CURATED_PAGE_SIZE} />
    </section>
  );
}
