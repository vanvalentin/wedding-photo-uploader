import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { verifyAdminSecret, isAdminConfigured } from '../../../lib/adminAuth.js';
import { createPresignedR2Upload } from '../../../lib/r2Storage.js';

const initSchema = z.object({
  albumId: z.string().uuid(),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024 * 1024),
});

function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : '';
  const sanitizedBase = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 200);
  return `${sanitizedBase}${ext}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
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

  const parsed = initSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { albumId, fileName, mimeType } = parsed.data;
  const finalFileName = sanitizeFileName(fileName);
  const albumPrefix = `albums/${albumId}`;

  try {
    const target = await createPresignedR2Upload({
      fileName: finalFileName,
      mimeType,
      keyPrefix: albumPrefix,
    });

    res.status(200).json({
      sessionUri: target.uploadUrl,
      fileName: target.fileName,
      storageProvider: 'r2',
      storageKey: target.objectKey,
      uploadMethod: 'single_put',
      thumbnailUpload: target.thumbnailUpload
        ? {
            uploadUrl: target.thumbnailUpload.uploadUrl,
            storageKey: target.thumbnailUpload.objectKey,
            mimeType: target.thumbnailUpload.mimeType,
          }
        : undefined,
    });
  } catch (error) {
    console.error('Album upload init error:', error);
    res.status(500).json({
      error: 'Failed to initiate upload',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
