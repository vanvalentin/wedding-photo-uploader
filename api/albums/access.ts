import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  getPrivateAlbumInfo,
  isPrivateAlbumsConfigured,
  verifyPrivateAlbumAccess,
} from '../../lib/privateAlbums.js';

const accessSchema = z.object({
  slug: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums are not configured' });
    return;
  }

  if (req.method === 'GET') {
    const slug = typeof req.query.slug === 'string' ? req.query.slug : null;
    if (!slug) {
      res.status(400).json({ error: 'Missing slug query parameter' });
      return;
    }

    try {
      const info = await getPrivateAlbumInfo(slug);
      if (!info) {
        res.status(404).json({ error: 'Album not found' });
        return;
      }

      res.status(200).json({ exists: true, title: info.title });
    } catch (error) {
      console.error('Private album info error:', error);
      res.status(500).json({
        error: 'Failed to load album',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  if (req.method === 'POST') {
    const parsed = accessSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const result = await verifyPrivateAlbumAccess(parsed.data.slug, parsed.data.password);
      if (!result) {
        res.status(401).json({ error: 'Invalid password or album not found' });
        return;
      }

      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).json({
        title: result.album.title,
        slug: result.album.slug,
        items: result.items,
      });
    } catch (error) {
      console.error('Private album access error:', error);
      res.status(500).json({
        error: 'Failed to access album',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
}
