import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MediaPreview } from '../types';
import {
  fetchPrivateAlbum,
  type PrivateAlbumGalleryItem,
} from '../services/privateAlbumService';
import { MediaPreviewGrid } from './MediaPreviewGrid';
import { LanguageToggle } from './LanguageToggle';

interface PrivateAlbumGalleryProps {
  slug: string;
}

const PAGE_SIZE = 12;

export function PrivateAlbumGallery({ slug }: PrivateAlbumGalleryProps) {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<PrivateAlbumGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadAlbum = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const result = await fetchPrivateAlbum(slug);
      if (!result) {
        setNotFound(true);
        return;
      }

      setTitle(result.title);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadAlbum();
  }, [loadAlbum]);

  const previewItems: MediaPreview[] = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        previewUrl: item.thumbnailUrl,
        viewUrl: item.viewUrl,
        name: item.fileName,
        isVideo: item.isVideo,
      })),
    [items]
  );

  if (notFound) {
    return (
      <div className="app gallery-page">
        <main className="main">
          <div className="admin-login">
            <h1>Album not found</h1>
            <p className="admin-login-subtitle">This link may be incorrect or the album was removed.</p>
            <a href="/" className="admin-back-link">
              ← Back to home
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app gallery-page">
      <header className="header">
        <div className="header-top">
          <a href="/" className="highlights-back-link">
            ← Home
          </a>
          <LanguageToggle />
        </div>
        <div className="header-content">
          <h1 className="header-title highlights-page-title">{title || 'Your Photos'}</h1>
          <p className="header-subtitle">Your personal photo collection</p>
        </div>
      </header>

      <main className="main">
        {loading && <p className="curated-gallery-loading">Loading your photos…</p>}
        {error && <p className="admin-error">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="curated-gallery-loading">No photos in this album yet.</p>
        )}
        {!loading && previewItems.length > 0 && (
          <MediaPreviewGrid
            items={previewItems}
            pageSize={PAGE_SIZE}
            showLoadMore={false}
            loadMoreOnScroll
          />
        )}
      </main>

      <footer className="footer">
        <p>♥</p>
      </footer>
    </div>
  );
}
