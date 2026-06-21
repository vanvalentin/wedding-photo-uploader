import { fetchDriveMedia } from './googleDrive.js';
import { buildFlatUploadKey, headR2Object, putR2Object } from './r2Storage.js';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from './supabase.js';

export interface DriveToR2MigrationOptions {
  dryRun?: boolean;
  limit?: number;
  batchSize?: number;
  onProgress?: (event: DriveToR2ProgressEvent) => void;
}

export type DriveToR2ProgressEvent =
  | {
      type: 'skip-r2';
      fileName: string;
      storageKey: string;
    }
  | {
      type: 'dry-run';
      fileName: string;
      driveFileId: string;
      storageKey: string;
    }
  | {
      type: 'copy-start';
      fileName: string;
      driveFileId: string;
      storageKey: string;
    }
  | {
      type: 'copy-complete';
      fileName: string;
      driveFileId: string;
      storageKey: string;
      alreadyInR2: boolean;
    }
  | {
      type: 'error';
      fileName: string;
      driveFileId: string;
      message: string;
    };

export interface DriveToR2MigrationResult {
  processed: number;
  copied: number;
  alreadyInR2: number;
  skippedAlreadyR2: number;
  updatedMediaRows: number;
  updatedCuratedRows: number;
  failed: number;
  dryRun: boolean;
}

interface DriveMediaUploadRow {
  id: string;
  drive_file_id: string;
  storage_provider: 'google_drive' | 'r2';
  storage_key: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
}

const DEFAULT_BATCH_SIZE = 25;

function isMissingR2ObjectError(error: unknown): boolean {
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return candidate.name === 'NotFound' || candidate.$metadata?.httpStatusCode === 404;
}

async function r2ObjectExists(key: string): Promise<boolean> {
  try {
    await headR2Object(key);
    return true;
  } catch (error) {
    if (isMissingR2ObjectError(error)) return false;
    throw error;
  }
}

async function fetchDriveRows(limit: number, offset = 0): Promise<DriveMediaUploadRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('media_uploads')
    .select('id, drive_file_id, storage_provider, storage_key, file_name, mime_type, file_size')
    .eq('storage_provider', 'google_drive')
    .order('uploaded_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to load Drive uploads: ${error.message}`);
  }

  return data ?? [];
}

async function updateStorageMetadata(row: DriveMediaUploadRow, storageKey: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { error: mediaError } = await supabase
    .from('media_uploads')
    .update({
      storage_provider: 'r2',
      storage_key: storageKey,
    })
    .eq('id', row.id)
    .eq('storage_provider', 'google_drive');

  if (mediaError) {
    throw new Error(`Failed to update media upload ${row.id}: ${mediaError.message}`);
  }

  const { data: curatedRows, error: curatedFetchError } = await supabase
    .from('curated_gallery')
    .select('id')
    .eq('drive_file_id', row.drive_file_id)
    .eq('storage_provider', 'google_drive');

  if (curatedFetchError) {
    throw new Error(`Failed to load curated rows for ${row.drive_file_id}: ${curatedFetchError.message}`);
  }

  if (!curatedRows || curatedRows.length === 0) {
    return 0;
  }

  const { error: curatedUpdateError } = await supabase
    .from('curated_gallery')
    .update({
      storage_provider: 'r2',
      storage_key: storageKey,
    })
    .in(
      'id',
      curatedRows.map((item) => item.id)
    );

  if (curatedUpdateError) {
    throw new Error(`Failed to update curated rows for ${row.drive_file_id}: ${curatedUpdateError.message}`);
  }

  return curatedRows.length;
}

async function copyDriveRowToR2(row: DriveMediaUploadRow): Promise<{
  storageKey: string;
  alreadyInR2: boolean;
}> {
  const storageKey = buildFlatUploadKey(row.file_name);
  const alreadyInR2 = await r2ObjectExists(storageKey);

  if (alreadyInR2) {
    return { storageKey, alreadyInR2 };
  }

  const driveResponse = await fetchDriveMedia(row.drive_file_id);
  if (!driveResponse.ok) {
    const body = await driveResponse.text().catch(() => '');
    throw new Error(`Drive download failed (${driveResponse.status}): ${body}`);
  }

  const bodyBuffer = Buffer.from(await driveResponse.arrayBuffer());
  if (bodyBuffer.length === 0) {
    throw new Error('Drive returned an empty response body');
  }

  await putR2Object({
    key: storageKey,
    body: bodyBuffer,
    contentType: driveResponse.headers.get('content-type') ?? row.mime_type,
    contentLength: bodyBuffer.length,
    metadata: {
      original_name: row.file_name,
      migrated_from: 'google_drive',
      drive_file_id: row.drive_file_id,
    },
  });

  return { storageKey, alreadyInR2 };
}

export async function migrateDriveUploadsToR2(
  options: DriveToR2MigrationOptions = {}
): Promise<DriveToR2MigrationResult> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('SUPABASE_SECRET_KEY is required for Drive to R2 migration');
  }

  const dryRun = options.dryRun ?? false;
  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);
  const limit = options.limit && options.limit > 0 ? options.limit : Number.POSITIVE_INFINITY;
  const result: DriveToR2MigrationResult = {
    processed: 0,
    copied: 0,
    alreadyInR2: 0,
    skippedAlreadyR2: 0,
    updatedMediaRows: 0,
    updatedCuratedRows: 0,
    failed: 0,
    dryRun,
  };
  let dryRunOffset = 0;

  while (result.processed < limit) {
    const remaining = limit - result.processed;
    const rows = await fetchDriveRows(
      Math.min(batchSize, remaining),
      dryRun ? dryRunOffset : 0
    );
    if (rows.length === 0) break;
    if (dryRun) dryRunOffset += rows.length;

    for (const row of rows) {
      if (result.processed >= limit) break;

      result.processed += 1;

      if (row.storage_provider !== 'google_drive') {
        result.skippedAlreadyR2 += 1;
        options.onProgress?.({
          type: 'skip-r2',
          fileName: row.file_name,
          storageKey: row.storage_key,
        });
        continue;
      }

      const storageKey = buildFlatUploadKey(row.file_name);

      if (dryRun) {
        options.onProgress?.({
          type: 'dry-run',
          fileName: row.file_name,
          driveFileId: row.drive_file_id,
          storageKey,
        });
        continue;
      }

      options.onProgress?.({
        type: 'copy-start',
        fileName: row.file_name,
        driveFileId: row.drive_file_id,
        storageKey,
      });

      try {
        const copied = await copyDriveRowToR2(row);
        if (copied.alreadyInR2) {
          result.alreadyInR2 += 1;
        } else {
          result.copied += 1;
        }

        const updatedCurated = await updateStorageMetadata(row, copied.storageKey);
        result.updatedMediaRows += 1;
        result.updatedCuratedRows += updatedCurated;

        options.onProgress?.({
          type: 'copy-complete',
          fileName: row.file_name,
          driveFileId: row.drive_file_id,
          storageKey: copied.storageKey,
          alreadyInR2: copied.alreadyInR2,
        });
      } catch (error) {
        result.failed += 1;
        options.onProgress?.({
          type: 'error',
          fileName: row.file_name,
          driveFileId: row.drive_file_id,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (rows.length < batchSize) break;
  }

  return result;
}
