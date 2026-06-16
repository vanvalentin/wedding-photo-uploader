import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { verifyAdminSecret, isAdminConfigured } from '../../../lib/adminAuth.js';
import { getAdminCuratedItems, getAdminUploadItems } from '../../../lib/adminGallery.js';
import { importDriveFolderToRegistry } from '../../../lib/driveImport.js';
import {
  deleteCuratedItem,
  insertCuratedItem,
  isMediaRegistryConfigured,
} from '../../../lib/mediaUploads.js';

export const adminRouter = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (!isAdminConfigured()) {
    res.status(503).json({ error: 'Admin access is not configured' });
    return false;
  }

  if (!verifyAdminSecret(req.headers)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  if (!isMediaRegistryConfigured()) {
    res.status(503).json({
      error: 'Media registry unavailable',
      message: 'Set SUPABASE_SECRET_KEY to enable admin features',
    });
    return false;
  }

  return true;
}

adminRouter.get('/uploads', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const items = await getAdminUploadItems();
    res.json({ items });
  } catch (error) {
    console.error('Admin uploads error:', error);
    res.status(500).json({
      error: 'Failed to load uploads',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.get('/curated', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const items = await getAdminCuratedItems();
    res.json({ items });
  } catch (error) {
    console.error('Admin curated list error:', error);
    res.status(500).json({
      error: 'Failed to load curated gallery',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const addCuratedSchema = z.object({
  driveFileId: z.string().min(1),
  caption: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isVideo: z.boolean().optional(),
  takenAt: z.string().datetime().optional(),
});

adminRouter.post('/curated', async (req, res) => {
  if (!requireAdmin(req, res)) return;

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
});

adminRouter.delete('/curated', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) {
    res.status(400).json({ error: 'Missing id query parameter' });
    return;
  }

  try {
    await deleteCuratedItem(id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin curated delete error:', error);
    res.status(500).json({
      error: 'Failed to remove curated item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.post('/import-drive', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const result = await importDriveFolderToRegistry();
    res.json(result);
  } catch (error) {
    console.error('Drive import error:', error);
    res.status(500).json({
      error: 'Failed to import from Drive',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
