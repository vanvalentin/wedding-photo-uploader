import type { CuratedGalleryItem } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface CuratedGalleryResponse {
  items: CuratedGalleryItem[];
  configured: boolean;
}

export async function fetchCuratedGallery(): Promise<CuratedGalleryResponse> {
  const response = await fetch(`${API_BASE}/api/gallery/curated`);

  if (!response.ok) {
    throw new Error(`Failed to load gallery (${response.status})`);
  }

  return response.json();
}
