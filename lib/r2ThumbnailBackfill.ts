import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { getSupabaseAdmin } from './supabase.js';
import { buildThumbnailKey, fetchR2Object, putR2Object } from './r2Storage.js';
import { updateMediaUploadThumbnail } from './mediaUploads.js';

const execFileAsync = promisify(execFile);
const THUMBNAIL_MAX_DIMENSION = 640;
const THUMBNAIL_QUALITY = 82;

interface ThumbnailBackfillRow {
  id: string;
  storage_key: string;
  file_name: string;
  mime_type: string | null;
  is_video: boolean;
}

export interface R2ThumbnailBackfillOptions {
  dryRun?: boolean;
  limit?: number;
  includeVideos?: boolean;
  onProgress?: (event: R2ThumbnailBackfillEvent) => void;
}

export type R2ThumbnailBackfillEvent =
  | { type: 'dry-run'; id: string; storageKey: string; thumbnailKey: string }
  | { type: 'thumbnail-start'; id: string; storageKey: string; thumbnailKey: string }
  | {
      type: 'thumbnail-complete';
      id: string;
      storageKey: string;
      thumbnailKey: string;
      fileSize: number;
    }
  | { type: 'skip-video'; id: string; storageKey: string }
  | { type: 'error'; id: string; storageKey: string; message: string };

export interface R2ThumbnailBackfillResult {
  dryRun: boolean;
  scanned: number;
  generated: number;
  skippedVideos: number;
  failed: number;
}

function contentTypeForRow(row: ThumbnailBackfillRow, objectContentType: string): string {
  return row.mime_type || objectContentType || 'application/octet-stream';
}

async function generateImageThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: THUMBNAIL_MAX_DIMENSION,
      height: THUMBNAIL_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: THUMBNAIL_QUALITY, mozjpeg: true })
    .toBuffer();
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes('quicktime')) return '.mov';
  if (contentType.includes('webm')) return '.webm';
  if (contentType.includes('x-msvideo')) return '.avi';
  return '.mp4';
}

async function generateVideoThumbnail(buffer: Buffer, contentType: string): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), 'wedding-thumb-'));
  const inputPath = path.join(dir, `input${extensionForContentType(contentType)}`);
  const outputPath = path.join(dir, 'thumbnail.jpg');

  try {
    await writeFile(inputPath, new Uint8Array(buffer));
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss',
      '1',
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=if(gt(iw,ih),640,-2):if(gt(iw,ih),-2,640)',
      '-q:v',
      '4',
      outputPath,
    ]);
    return readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function fetchRows(limit?: number): Promise<ThumbnailBackfillRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('media_uploads')
    .select('id, storage_key, file_name, mime_type, is_video')
    .eq('storage_provider', 'r2')
    .is('thumbnail_storage_key', null)
    .order('uploaded_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch missing thumbnails: ${error.message}`);
  }

  return data ?? [];
}

export async function backfillR2Thumbnails(
  options: R2ThumbnailBackfillOptions = {}
): Promise<R2ThumbnailBackfillResult> {
  const dryRun = options.dryRun ?? false;
  const includeVideos = options.includeVideos ?? true;
  const rows = await fetchRows(options.limit);
  const result: R2ThumbnailBackfillResult = {
    dryRun,
    scanned: rows.length,
    generated: 0,
    skippedVideos: 0,
    failed: 0,
  };

  for (const row of rows) {
    const thumbnailKey = buildThumbnailKey(row.storage_key);

    if (dryRun) {
      options.onProgress?.({
        type: 'dry-run',
        id: row.id,
        storageKey: row.storage_key,
        thumbnailKey,
      });
      continue;
    }

    if (row.is_video && !includeVideos) {
      result.skippedVideos += 1;
      options.onProgress?.({ type: 'skip-video', id: row.id, storageKey: row.storage_key });
      continue;
    }

    try {
      options.onProgress?.({
        type: 'thumbnail-start',
        id: row.id,
        storageKey: row.storage_key,
        thumbnailKey,
      });

      const object = await fetchR2Object(row.storage_key);
      const contentType = contentTypeForRow(row, object.metadata.contentType);
      const thumbnail = row.is_video
        ? await generateVideoThumbnail(object.buffer, contentType)
        : await generateImageThumbnail(object.buffer);

      await putR2Object({
        key: thumbnailKey,
        body: thumbnail,
        contentType: 'image/jpeg',
        contentLength: thumbnail.length,
        metadata: {
          original_key: row.storage_key,
          original_name: row.file_name,
        },
      });

      await updateMediaUploadThumbnail(row.id, {
        storageProvider: 'r2',
        storageKey: thumbnailKey,
        mimeType: 'image/jpeg',
        fileSize: thumbnail.length,
      });

      result.generated += 1;
      options.onProgress?.({
        type: 'thumbnail-complete',
        id: row.id,
        storageKey: row.storage_key,
        thumbnailKey,
        fileSize: thumbnail.length,
      });
    } catch (error) {
      result.failed += 1;
      options.onProgress?.({
        type: 'error',
        id: row.id,
        storageKey: row.storage_key,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}
