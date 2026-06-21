import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { verifyAdminSecret, isAdminConfigured } from '../../lib/adminAuth.js';
import {
  addPrivateAlbumItem,
  addPrivateAlbumItemFromUpload,
  deletePrivateAlbumItem,
  isPrivateAlbumsConfigured,
  listPrivateAlbumItems,
} from '../../lib/privateAlbums.js';

const addItemSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('upload'),
    albumId: z.string().uuid(),
    driveFileId: z.string().min(1),
    storageProvider: z.enum(['google_drive', 'r2']).optional(),
    storageKey: z.string().min(1).max(2000).optional(),
    fileName: z.string().min(1).max(500),
    mimeType: z.string().max(200).optional(),
    isVideo: z.boolean().optional(),
    takenAt: z.union([z.string().min(1), z.null()]).optional(),
  }),
  z.object({
    source: z.literal('library'),
    albumId: z.string().uuid(),
    mediaUploadId: z.string().uuid(),
  }),
]);

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
    const albumId = typeof req.query.albumId === 'string' ? req.query.albumId : null;
    if (!albumId) {
      res.status(400).json({ error: 'Missing albumId query parameter' });
      return;
    }

    try {
      const items = await listPrivateAlbumItems(albumId);
      res.status(200).json({ items });
    } catch (error) {
      console.error('Admin album items list error:', error);
      res.status(500).json({
        error: 'Failed to load album items',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  if (req.method === 'POST') {
    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      if (parsed.data.source === 'library') {
        await addPrivateAlbumItemFromUpload(parsed.data.albumId, parsed.data.mediaUploadId);
      } else {
        await addPrivateAlbumItem({
          albumId: parsed.data.albumId,
          driveFileId: parsed.data.driveFileId,
          storageProvider: parsed.data.storageProvider,
          storageKey: parsed.data.storageKey,
          fileName: parsed.data.fileName,
          mimeType: parsed.data.mimeType,
          isVideo: parsed.data.isVideo,
          takenAt: parsed.data.takenAt ?? null,
        });
      }
      res.status(201).json({ ok: true });
    } catch (error) {
      console.error('Admin album item add error:', error);
      res.status(400).json({
        error: 'Failed to add album item',
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
      await deletePrivateAlbumItem(id);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Admin album item delete error:', error);
      res.status(500).json({
        error: 'Failed to remove album item',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
}
