import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPrivateAlbumGallery,
  isPrivateAlbumsConfigured,
} from '../../lib/privateAlbums.js';

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

  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums are not configured' });
    return;
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug : null;
  if (!slug) {
    res.status(400).json({ error: 'Missing slug query parameter' });
    return;
  }

  try {
    const album = await getPrivateAlbumGallery(slug);
    if (!album) {
      res.status(404).json({ error: 'Album not found' });
      return;
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json(album);
  } catch (error) {
    console.error('Private album access error:', error);
    res.status(500).json({
      error: 'Failed to load album',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
