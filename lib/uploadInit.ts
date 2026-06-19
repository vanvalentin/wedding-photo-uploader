import { z } from 'zod';
import { config, type StorageProvider } from './config.js';
import { createResumableUploadSession } from './googleDrive.js';
import { createPresignedR2Upload } from './r2Storage.js';

const initUploadSchema = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024 * 1024),
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

export type UploadInitSuccess = {
  ok: true;
  sessionUri: string;
  fileName: string;
  storageProvider: StorageProvider;
  storageKey?: string;
  uploadMethod: 'drive_resumable' | 'single_put';
};

export type UploadInitError = {
  ok: false;
  status: number;
  error: string;
  message?: string;
  details?: Record<string, string[] | undefined>;
};

export async function processUploadInit(body: unknown): Promise<UploadInitSuccess | UploadInitError> {
  const parsed = initUploadSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid request',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const { fileName, mimeType, fileSize, guestName } = parsed.data;
  const finalFileName = buildFileName(fileName, guestName);

  try {
    if (config.storageProvider === 'r2') {
      const target = await createPresignedR2Upload({
        fileName: finalFileName,
        mimeType,
        guestName,
      });

      return {
        ok: true,
        sessionUri: target.uploadUrl,
        fileName: target.fileName,
        storageProvider: 'r2',
        storageKey: target.objectKey,
        uploadMethod: 'single_put',
      };
    }

    const session = await createResumableUploadSession({
      fileName: finalFileName,
      mimeType,
      fileSize,
      guestName,
    });

    return {
      ok: true,
      sessionUri: session.sessionUri,
      fileName: session.fileName,
      storageProvider: 'google_drive',
      uploadMethod: 'drive_resumable',
    };
  } catch (error) {
    console.error('Upload init error:', error);
    return {
      ok: false,
      status: 500,
      error: 'Failed to initiate upload session',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
