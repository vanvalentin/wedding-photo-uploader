import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MediaPreview } from '../types';
import {
  accessPrivateAlbum,
  clearAlbumPassword,
  getStoredAlbumPassword,
  type PrivateAlbumGalleryItem,
} from '../services/privateAlbumService';
import { MediaPreviewGrid } from './MediaPreviewGrid';
import { LanguageToggle } from './LanguageToggle';

interface PrivateAlbumGalleryProps {
  slug: string;
  onLogout: () => void;
}

const PAGE_SIZE = 12;

export function PrivateAlbumGallery({ slug, onLogout }: PrivateAlbumGalleryProps) {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<PrivateAlbumGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlbum = useCallback(async () => {
    setLoading(true);
    setError(null);

    const password = getStoredAlbumPassword(slug);
    if (!password) {
      onLogout();
      return;
    }

    try {
      const result = await accessPrivateAlbum(slug, password);
      setTitle(result.title);
      setItems(result.items);
    } catch (err) {
      clearAlbumPassword(slug);
      setError(err instanceof Error ? err.message : 'Failed to load photos');
      onLogout();
    } finally {
      setLoading(false);
    }
  }, [slug, onLogout]);

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

  const handleLogout = () => {
    clearAlbumPassword(slug);
    onLogout();
  };

  return (
    <div className="app gallery-page">
      <header className="header">
        <div className="header-top">
          <button type="button" className="highlights-back-link" onClick={handleLogout}>
            Sign out
          </button>
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
