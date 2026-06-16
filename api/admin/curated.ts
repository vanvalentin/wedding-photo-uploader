import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { verifyAdminSecret, isAdminConfigured } from '../../lib/adminAuth.js';
import { getAdminCuratedItems } from '../../lib/adminGallery.js';
import {
  deleteCuratedItem,
  insertCuratedItem,
  isMediaRegistryConfigured,
} from '../../lib/mediaUploads.js';

const addCuratedSchema = z.object({
  driveFileId: z.string().min(1),
  caption: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isVideo: z.boolean().optional(),
  takenAt: z.string().datetime().optional(),
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

  if (!isMediaRegistryConfigured()) {
    res.status(503).json({
      error: 'Media registry unavailable',
      message: 'Set SUPABASE_SERVICE_ROLE_KEY to manage curated gallery',
    });
    return;
  }

  if (req.method === 'GET') {
    try {
      const items = await getAdminCuratedItems();
      res.status(200).json({ items });
    } catch (error) {
      console.error('Admin curated list error:', error);
      res.status(500).json({
        error: 'Failed to load curated gallery',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  if (req.method === 'POST') {
    const parsed = addCuratedSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      await insertCuratedItem({
        driveFileId: parsed.data.driveFileId,
        caption: parsed.data.caption,
        sortOrder: parsed.data.sortOrder,
        isVideo: parsed.data.isVideo,
        takenAt: parsed.data.takenAt ?? null,
      });
      res.status(201).json({ ok: true });
    } catch (error) {
      console.error('Admin curated add error:', error);
      res.status(400).json({
        error: 'Failed to add curated item',
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
      await deleteCuratedItem(id);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Admin curated delete error:', error);
      res.status(500).json({
        error: 'Failed to remove curated item',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
}
