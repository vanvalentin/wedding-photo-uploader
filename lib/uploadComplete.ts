import { z } from 'zod';
import { findRecentFileInFolder } from './googleDrive.js';
import { insertMediaUpload, mediaUploadExists } from './mediaUploads.js';
import { isSupabaseConfigured } from './supabase.js';

const uploadCompleteSchema = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024 * 1024),
  guestName: z.string().max(100).optional(),
  isVideo: z.boolean().optional(),
});

export type UploadCompleteSuccess = {
  ok: true;
  driveFileId: string;
  alreadyRegistered: boolean;
};

export type UploadCompleteError = {
  ok: false;
  status: number;
  error: string;
  message?: string;
  details?: Record<string, string[] | undefined>;
};

const RETRY_DELAYS_MS = [0, 1500, 3000];

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processUploadComplete(
  body: unknown
): Promise<UploadCompleteSuccess | UploadCompleteError> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'Upload registry unavailable',
      message: 'Supabase is not configured',
    };
  }

  const parsed = uploadCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid request',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const { fileName, mimeType, fileSize, guestName, isVideo } = parsed.data;

  try {
    let driveFile = null;

    for (const delayMs of RETRY_DELAYS_MS) {
      if (delayMs > 0) {
        await sleep(delayMs);
      }

      driveFile = await findRecentFileInFolder(fileName, { fileSize });
      if (driveFile) break;
    }

    if (!driveFile) {
      return {
        ok: false,
        status: 404,
        error: 'Drive file not found',
        message: `Could not locate "${fileName}" in the upload folder yet. Try again shortly.`,
      };
    }

    const alreadyRegistered = await mediaUploadExists(driveFile.id);
    if (alreadyRegistered) {
      return {
        ok: true,
        driveFileId: driveFile.id,
        alreadyRegistered: true,
      };
    }

    const takenAt =
      driveFile.imageMediaMetadata?.time ?? driveFile.createdTime ?? null;

    await insertMediaUpload({
      driveFileId: driveFile.id,
      fileName: driveFile.name,
      guestName: guestName?.trim() || null,
      mimeType,
      isVideo: isVideo ?? driveFile.mimeType.startsWith('video/'),
      fileSize,
      takenAt,
    });

    return {
      ok: true,
      driveFileId: driveFile.id,
      alreadyRegistered: false,
    };
  } catch (error) {
    console.error('Upload complete error:', error);
    return {
      ok: false,
      status: 500,
      error: 'Failed to register upload',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
