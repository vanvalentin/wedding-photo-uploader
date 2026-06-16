import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { verifyAdminSecret, isAdminConfigured } from '../../lib/adminAuth.js';
import { getAdminUploadItems } from '../../lib/adminGallery.js';
import {
  isMediaRegistryConfigured,
  patchMediaUpload,
} from '../../lib/mediaUploads.js';

const patchUploadSchema = z
  .object({
    id: z.string().uuid(),
    takenAt: z.union([z.string().min(1), z.null()]).optional(),
    reviewed: z.boolean().optional(),
  })
  .refine((data) => data.takenAt !== undefined || data.reviewed !== undefined, {
    message: 'Provide takenAt and/or reviewed',
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
      message: 'Set SUPABASE_SECRET_KEY to enable admin uploads',
    });
    return;
  }

  if (req.method === 'GET') {
    try {
      const items = await getAdminUploadItems();
      res.status(200).json({ items });
    } catch (error) {
      console.error('Admin uploads error:', error);
      res.status(500).json({
        error: 'Failed to load uploads',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  if (req.method === 'PATCH') {
    const parsed = patchUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      await patchMediaUpload(parsed.data.id, {
        takenAt: parsed.data.takenAt,
        reviewed: parsed.data.reviewed,
      });
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Admin patch upload error:', error);
      res.status(400).json({
        error: 'Failed to update upload',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  res.setHeader('Allow', 'GET, PATCH');
  res.status(405).json({ error: 'Method not allowed' });
}
