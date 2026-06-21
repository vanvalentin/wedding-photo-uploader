import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { verifyAdminSecret, isAdminConfigured } from '../../lib/adminAuth.js';
import {
  createPrivateAlbum,
  deletePrivateAlbum,
  isPrivateAlbumsConfigured,
  listPrivateAlbums,
  updatePrivateAlbum,
} from '../../lib/privateAlbums.js';

const createAlbumSchema = z.object({
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
});

const updateAlbumSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (!isAdminConfigured()) {
    res.status(503).json({ error: 'Admin access is not configured' });
    return;
  }

  if (!verifyAdminSecret(req.headers)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({
      error: 'Private albums unavailable',
      message: 'Set SUPABASE_SECRET_KEY to manage private albums',
    });
    return;
  }

  if (req.method === 'GET') {
    try {
      const items = await listPrivateAlbums();
      res.status(200).json({ items });
    } catch (error) {
      console.error('Admin albums list error:', error);
      res.status(500).json({
        error: 'Failed to load albums',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  if (req.method === 'POST') {
    const parsed = createAlbumSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const album = await createPrivateAlbum(parsed.data);
      res.status(201).json({ album });
    } catch (error) {
      console.error('Admin album create error:', error);
      res.status(400).json({
        error: 'Failed to create album',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  if (req.method === 'PATCH') {
    const parsed = updateAlbumSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      await updatePrivateAlbum(parsed.data);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Admin album update error:', error);
      res.status(400).json({
        error: 'Failed to update album',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const id = typeof req.query.id === 'string' ? req.query.id : null;
    if (!id) {
      res.status(400).json({ error: 'Missing id query parameter' });
      return;
    }

    try {
      await deletePrivateAlbum(id);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Admin album delete error:', error);
      res.status(500).json({
        error: 'Failed to delete album',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
}
