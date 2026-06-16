import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCuratedGalleryItems } from '../../lib/gallery.js';
import { isSupabaseConfigured } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isSupabaseConfigured()) {
    res.status(200).json({ items: [], configured: false });
    return;
  }

  try {
    const items = await getCuratedGalleryItems();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ items, configured: true });
  } catch (error) {
    console.error('Curated gallery error:', error);
    res.status(500).json({
      error: 'Failed to load curated gallery',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
