import { useEffect, useState } from 'react';
import type { CuratedGalleryItem } from '../types';
import { fetchCuratedGallery } from '../services/galleryService';

export function useCuratedGallery() {
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

  return { items, loading, error };
}
