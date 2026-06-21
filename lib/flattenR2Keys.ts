import {
  buildFlatUploadKey,
  copyR2Object,
  deleteR2Object,
  headR2Object,
  isFlatUploadKey,
} from './r2Storage.js';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from './supabase.js';

export interface FlattenR2KeysOptions {
  dryRun?: boolean;
  limit?: number;
  batchSize?: number;
  keepOldObjects?: boolean;
  onProgress?: (event: FlattenR2ProgressEvent) => void;
}

export type FlattenR2ProgressEvent =
  | {
      type: 'skip-flat';
      fileName: string;
      storageKey: string;
    }
  | {
      type: 'dry-run';
      fileName: string;
      oldKey: string;
      newKey: string;
    }
  | {
      type: 'move-start';
      fileName: string;
      oldKey: string;
      newKey: string;
    }
  | {
      type: 'move-complete';
      fileName: string;
      oldKey: string;
      newKey: string;
      deletedOld: boolean;
    }
  | {
      type: 'error';
      fileName: string;
      oldKey: string;
      message: string;
    };

export interface FlattenR2KeysResult {
  scanned: number;
  flattened: number;
  skippedFlat: number;
  updatedMediaRows: number;
  updatedCuratedRows: number;
  deletedOldObjects: number;
  failed: number;
  dryRun: boolean;
}

interface R2MediaUploadRow {
  id: string;
  drive_file_id: string;
  storage_key: string;
  file_name: string;
}

const DEFAULT_BATCH_SIZE = 25;

function isMissingR2ObjectError(error: unknown): boolean {
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return candidate.name === 'NotFound' || candidate.$metadata?.httpStatusCode === 404;
}

async function fetchR2Rows(limit: number, offset = 0): Promise<R2MediaUploadRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('media_uploads')
    .select('id, drive_file_id, storage_key, file_name')
    .eq('storage_provider', 'r2')
    .order('uploaded_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to load R2 uploads: ${error.message}`);
  }

  return data ?? [];
}

async function updateStorageKey(
  row: R2MediaUploadRow,
  newKey: string
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const oldKey = row.storage_key;

  const { error: mediaError } = await supabase
    .from('media_uploads')
    .update({ storage_key: newKey })
    .eq('id', row.id)
    .eq('storage_provider', 'r2')
    .eq('storage_key', oldKey);

  if (mediaError) {
    throw new Error(`Failed to update media upload ${row.id}: ${mediaError.message}`);
  }

  const { data: curatedRows, error: curatedFetchError } = await supabase
    .from('curated_gallery')
    .select('id')
    .eq('storage_provider', 'r2')
    .eq('storage_key', oldKey);

  if (curatedFetchError) {
    throw new Error(`Failed to load curated rows for ${oldKey}: ${curatedFetchError.message}`);
  }

  if (!curatedRows || curatedRows.length === 0) {
    return 0;
  }

  const { error: curatedUpdateError } = await supabase
    .from('curated_gallery')
    .update({ storage_key: newKey })
    .in(
      'id',
      curatedRows.map((item) => item.id)
    );

  if (curatedUpdateError) {
    throw new Error(`Failed to update curated rows for ${oldKey}: ${curatedUpdateError.message}`);
  }

  return curatedRows.length;
}

export async function flattenR2UploadKeys(
  options: FlattenR2KeysOptions = {}
): Promise<FlattenR2KeysResult> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('SUPABASE_SECRET_KEY is required to flatten R2 keys');
  }

  const dryRun = options.dryRun ?? false;
  const keepOldObjects = options.keepOldObjects ?? false;
  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);
  const limit = options.limit && options.limit > 0 ? options.limit : Number.POSITIVE_INFINITY;

  const result: FlattenR2KeysResult = {
    scanned: 0,
    flattened: 0,
    skippedFlat: 0,
    updatedMediaRows: 0,
    updatedCuratedRows: 0,
    deletedOldObjects: 0,
    failed: 0,
    dryRun,
  };

  let offset = 0;

  while (result.scanned < limit) {
    const remaining = limit - result.scanned;
    const rows = await fetchR2Rows(Math.min(batchSize, remaining), offset);
    if (rows.length === 0) break;
    offset += rows.length;

    for (const row of rows) {
      if (result.scanned >= limit) break;

      result.scanned += 1;

      if (isFlatUploadKey(row.storage_key)) {
        result.skippedFlat += 1;
        options.onProgress?.({
          type: 'skip-flat',
          fileName: row.file_name,
          storageKey: row.storage_key,
        });
        continue;
      }

      const newKey = buildFlatUploadKey(row.file_name);

      if (dryRun) {
        options.onProgress?.({
          type: 'dry-run',
          fileName: row.file_name,
          oldKey: row.storage_key,
          newKey,
        });
        continue;
      }

      options.onProgress?.({
        type: 'move-start',
        fileName: row.file_name,
        oldKey: row.storage_key,
        newKey,
      });

      try {
        await headR2Object(row.storage_key);
        await copyR2Object(row.storage_key, newKey);
        await headR2Object(newKey);

        const updatedCurated = await updateStorageKey(row, newKey);
        result.updatedMediaRows += 1;
        result.updatedCuratedRows += updatedCurated;
        result.flattened += 1;

        let deletedOld = false;
        if (!keepOldObjects) {
          await deleteR2Object(row.storage_key);
          deletedOld = true;
          result.deletedOldObjects += 1;
        }

        options.onProgress?.({
          type: 'move-complete',
          fileName: row.file_name,
          oldKey: row.storage_key,
          newKey,
          deletedOld,
        });
      } catch (error) {
        if (isMissingR2ObjectError(error)) {
          result.failed += 1;
          options.onProgress?.({
            type: 'error',
            fileName: row.file_name,
            oldKey: row.storage_key,
            message: `Source object not found in R2: ${row.storage_key}`,
          });
          continue;
        }

        result.failed += 1;
        options.onProgress?.({
          type: 'error',
          fileName: row.file_name,
          oldKey: row.storage_key,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (rows.length < batchSize) break;
  }

  return result;
}
