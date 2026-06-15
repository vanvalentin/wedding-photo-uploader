import { Router } from 'express';
import { z } from 'zod';
import { createResumableUploadSession } from '../services/googleDrive.js';

export const uploadRouter = Router();

const initUploadSchema = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024 * 1024), // 5 GB max per file
  guestName: z.string().max(100).optional(),
});

function sanitizeGuestName(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
}

function buildFileName(originalName: string, guestName?: string): string {
  const lastDot = originalName.lastIndexOf('.');
  const base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const ext = lastDot > 0 ? originalName.slice(lastDot) : '';
  const sanitizedBase = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 200);

  if (guestName?.trim()) {
    const sanitizedGuest = sanitizeGuestName(guestName);
    if (sanitizedGuest) {
      return `${sanitizedGuest}_${sanitizedBase}${ext}`;
    }
  }

  return `${sanitizedBase}${ext}`;
}

uploadRouter.post('/init', async (req, res) => {
  try {
    const parsed = initUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { fileName, mimeType, fileSize, guestName } = parsed.data;
    const finalFileName = buildFileName(fileName, guestName);

    const session = await createResumableUploadSession({
      fileName: finalFileName,
      mimeType,
      fileSize,
      guestName,
    });

    res.json({
      sessionUri: session.sessionUri,
      fileName: session.fileName,
    });
  } catch (error) {
    console.error('Upload init error:', error);
    res.status(500).json({
      error: 'Failed to initiate upload session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

uploadRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
