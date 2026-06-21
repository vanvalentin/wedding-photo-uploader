import { getSupabaseAdmin, isSupabaseAdminConfigured, MEDIA_UPLOADS_QUERY_LIMIT } from './supabase.js';
import { normalizeTimestamp } from './normalizeTimestamp.js';
import { deleteDriveFile } from './googleDrive.js';
import { deleteR2Object, isR2ObjectKey } from './r2Storage.js';
import { fetchPrivateAlbumStorageIdentityKeys } from './privateAlbums.js';

export type StorageProvider = 'google_drive' | 'r2';

export function mediaUploadStorageIdentityKey(row: {
  drive_file_id: string;
  storage_provider?: StorageProvider | null;
  storage_key?: string | null;
}): string {
  const provider = row.storage_provider ?? 'google_drive';
  const key = row.storage_key ?? row.drive_file_id;
  return `${provider}:${key}`;
}

export async function fetchGuestMediaUploadRows(
  limit = MEDIA_UPLOADS_QUERY_LIMIT
): Promise<MediaUploadRow[]> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase admin is required to fetch guest uploads');
  }

  const [uploads, albumStorageKeys] = await Promise.all([
    fetchMediaUploads(limit),
    fetchPrivateAlbumStorageIdentityKeys(),
  ]);

  return uploads.filter(
    (row) => !albumStorageKeys.has(mediaUploadStorageIdentityKey(row))
  );
}

export interface MediaUploadRow {
  id: string;
  drive_file_id: string;
  storage_provider: StorageProvider;
  storage_key: string;
  file_name: string;
  guest_name: string | null;
  mime_type: string | null;
  is_video: boolean;
  file_size: number | null;
  thumbnail_storage_provider: StorageProvider | null;
  thumbnail_storage_key: string | null;
  thumbnail_mime_type: string | null;
  thumbnail_file_size: number | null;
  taken_at: string | null;
  uploaded_at: string;
  reviewed: boolean;
}

export interface InsertMediaUploadInput {
  driveFileId: string;
  storageProvider?: StorageProvider;
  storageKey?: string;
  fileName: string;
  guestName?: string | null;
  mimeType?: string | null;
  isVideo: boolean;
  fileSize?: number | null;
  thumbnailStorageProvider?: StorageProvider | null;
  thumbnailStorageKey?: string | null;
  thumbnailMimeType?: string | null;
  thumbnailFileSize?: number | null;
  takenAt?: string | null;
}

export interface StorageIdentityInput {
  driveFileId?: string;
  storageProvider?: StorageProvider;
  storageKey?: string;
}

function resolveStorageIdentity(input: StorageIdentityInput | string): {
  driveFileId: string;
  storageProvider: StorageProvider;
  storageKey: string;
} {
  if (typeof input === 'string') {
    return {
      driveFileId: input,
      storageProvider: 'google_drive',
      storageKey: input,
    };
  }

  const storageProvider = input.storageProvider ?? 'google_drive';
  const storageKey = input.storageKey ?? input.driveFileId;
  const driveFileId = input.driveFileId ?? storageKey;

  if (!storageKey || !driveFileId) {
    throw new Error('Missing storage identity');
  }

  return { driveFileId, storageProvider, storageKey };
}

function storageIdentityKey(row: {
  drive_file_id: string;
  storage_provider?: StorageProvider | null;
  storage_key?: string | null;
}): string {
  return `${row.storage_provider ?? 'google_drive'}:${row.storage_key ?? row.drive_file_id}`;
}

type StorageFilterBuilder<T> = T & {
  eq: (column: string, value: string) => StorageFilterBuilder<T>;
};

function applyStorageFilter<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  identity: { driveFileId: string; storageProvider: StorageProvider; storageKey: string }
): T {
  const builder = query as StorageFilterBuilder<T>;

  return builder
    .eq('storage_provider', identity.storageProvider)
    .eq('storage_key', identity.storageKey) as T;
}

export async function mediaUploadExists(input: StorageIdentityInput | string): Promise<boolean> {
  const identity = resolveStorageIdentity(input);
  const supabase = getSupabaseAdmin();
  const query = supabase
    .from('media_uploads')
    .select('id');
  const { data, error } = await applyStorageFilter(query, identity).maybeSingle();

  if (error) {
    throw new Error(`Failed to check media upload: ${error.message}`);
  }

  return Boolean(data);
}

export async function getRegisteredDriveFileIds(driveFileIds: string[]): Promise<Set<string>> {
  if (driveFileIds.length === 0) return new Set();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('media_uploads')
    .select('drive_file_id')
    .in('drive_file_id', driveFileIds);

  if (error) {
    throw new Error(`Failed to check media uploads: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.drive_file_id));
}

export async function insertMediaUploadsBatch(inputs: InsertMediaUploadInput[]): Promise<number> {
  if (inputs.length === 0) return 0;

  const supabase = getSupabaseAdmin();
  const rows = inputs.map((input) => {
    const identity = resolveStorageIdentity(input);
    return {
      drive_file_id: identity.driveFileId,
      storage_provider: identity.storageProvider,
      storage_key: identity.storageKey,
      file_name: input.fileName,
      guest_name: input.guestName ?? null,
      mime_type: input.mimeType ?? null,
      is_video: input.isVideo,
      file_size: input.fileSize ?? null,
      thumbnail_storage_provider: input.thumbnailStorageKey
        ? input.thumbnailStorageProvider ?? identity.storageProvider
        : null,
      thumbnail_storage_key: input.thumbnailStorageKey ?? null,
      thumbnail_mime_type: input.thumbnailMimeType ?? null,
      thumbnail_file_size: input.thumbnailFileSize ?? null,
      taken_at: normalizeTimestamp(input.takenAt),
    };
  });

  const { data, error } = await supabase.from('media_uploads').insert(rows).select('id');

  if (error) {
    throw new Error(`Failed to insert media uploads: ${error.message}`);
  }

  return data?.length ?? 0;
}

export async function updateTakenAtBatch(
  updates: Array<{ driveFileId: string; takenAt: string | null }>
): Promise<number> {
  const rows = updates
    .map((row) => ({
      driveFileId: row.driveFileId,
      takenAt: normalizeTimestamp(row.takenAt),
    }))
    .filter((row): row is { driveFileId: string; takenAt: string } => Boolean(row.takenAt));

  if (rows.length === 0) return 0;

  const supabase = getSupabaseAdmin();
  let updated = 0;

  for (const row of rows) {
    const { error } = await supabase
      .from('media_uploads')
      .update({ taken_at: row.takenAt })
      .eq('drive_file_id', row.driveFileId);

    if (error) {
      throw new Error(`Failed to update taken_at: ${error.message}`);
    }

    updated += 1;
  }

  return updated;
}

export async function updateMediaUploadThumbnail(
  id: string,
  thumbnail: {
    storageProvider: StorageProvider;
    storageKey: string;
    mimeType: string;
    fileSize: number;
  }
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('media_uploads')
    .update({
      thumbnail_storage_provider: thumbnail.storageProvider,
      thumbnail_storage_key: thumbnail.storageKey,
      thumbnail_mime_type: thumbnail.mimeType,
      thumbnail_file_size: thumbnail.fileSize,
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update media thumbnail: ${error.message}`);
  }
}

export async function insertMediaUpload(input: InsertMediaUploadInput): Promise<MediaUploadRow> {
  const identity = resolveStorageIdentity(input);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('media_uploads')
    .insert({
      drive_file_id: identity.driveFileId,
      storage_provider: identity.storageProvider,
      storage_key: identity.storageKey,
      file_name: input.fileName,
      guest_name: input.guestName ?? null,
      mime_type: input.mimeType ?? null,
      is_video: input.isVideo,
      file_size: input.fileSize ?? null,
      thumbnail_storage_provider: input.thumbnailStorageKey
        ? input.thumbnailStorageProvider ?? identity.storageProvider
        : null,
      thumbnail_storage_key: input.thumbnailStorageKey ?? null,
      thumbnail_mime_type: input.thumbnailMimeType ?? null,
      thumbnail_file_size: input.thumbnailFileSize ?? null,
      taken_at: normalizeTimestamp(input.takenAt),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to insert media upload: ${error.message}`);
  }

  return data;
}

export async function patchMediaUpload(
  id: string,
  updates: { takenAt?: string | null; reviewed?: boolean }
): Promise<void> {
  if (updates.takenAt === undefined && updates.reviewed === undefined) {
    throw new Error('No updates provided');
  }

  const supabase = getSupabaseAdmin();

  const { data: row, error: fetchError } = await supabase
    .from('media_uploads')
    .select('drive_file_id, storage_provider, storage_key, thumbnail_storage_provider, thumbnail_storage_key')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to load media upload: ${fetchError.message}`);
  }

  if (!row) {
    throw new Error('Media upload not found');
  }

  const payload: Record<string, unknown> = {};

  if (updates.takenAt !== undefined) {
    payload.taken_at = updates.takenAt === null ? null : normalizeTimestamp(updates.takenAt);
  }

  if (updates.reviewed !== undefined) {
    payload.reviewed = updates.reviewed;
  }

  const { error } = await supabase.from('media_uploads').update(payload).eq('id', id);

  if (error) {
    throw new Error(`Failed to update media upload: ${error.message}`);
  }

  if (updates.takenAt !== undefined) {
    const normalized = updates.takenAt === null ? null : normalizeTimestamp(updates.takenAt);
    const identity = resolveStorageIdentity({
      driveFileId: row.drive_file_id,
      storageProvider: row.storage_provider,
      storageKey: row.storage_key,
    });
    const query = supabase
      .from('curated_gallery')
      .update({ taken_at: normalized });
    const { error: curatedError } = await applyStorageFilter(query, identity);

    if (curatedError) {
      throw new Error(`Failed to sync curated taken date: ${curatedError.message}`);
    }
  }
}

export async function patchMediaUploadsBulk(
  ids: string[],
  updates: { takenAt: string | null }
): Promise<number> {
  if (ids.length === 0) return 0;

  const supabase = getSupabaseAdmin();
  const normalized = updates.takenAt === null ? null : normalizeTimestamp(updates.takenAt);

  const { data: rows, error: fetchError } = await supabase
    .from('media_uploads')
    .select('id, drive_file_id, storage_provider, storage_key')
    .in('id', ids);

  if (fetchError) {
    throw new Error(`Failed to load media uploads: ${fetchError.message}`);
  }

  const foundIds = (rows ?? []).map((row) => row.id);
  if (foundIds.length === 0) {
    throw new Error('No matching uploads found');
  }

  const { error } = await supabase
    .from('media_uploads')
    .update({ taken_at: normalized })
    .in('id', foundIds);

  if (error) {
    throw new Error(`Failed to update media uploads: ${error.message}`);
  }

  const identities = new Map(
    (rows ?? []).map((row) => [
      storageIdentityKey(row),
      resolveStorageIdentity({
        driveFileId: row.drive_file_id,
        storageProvider: row.storage_provider,
        storageKey: row.storage_key,
      }),
    ])
  );

  for (const identity of identities.values()) {
    const query = supabase
      .from('curated_gallery')
      .update({ taken_at: normalized });
    const { error: curatedError } = await applyStorageFilter(query, identity);

    if (curatedError) {
      throw new Error(`Failed to sync curated taken dates: ${curatedError.message}`);
    }
  }

  return foundIds.length;
}

export async function fetchMediaUploads(
  limit = MEDIA_UPLOADS_QUERY_LIMIT
): Promise<MediaUploadRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('media_uploads')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch media uploads: ${error.message}`);
  }

  return data ?? [];
}

export async function insertCuratedItem(input: {
  driveFileId: string;
  storageProvider?: StorageProvider;
  storageKey?: string;
  caption?: string | null;
  sortOrder?: number;
  isVideo?: boolean;
  takenAt?: string | null;
}): Promise<void> {
  const identity = resolveStorageIdentity(input);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('curated_gallery').insert({
    drive_file_id: identity.driveFileId,
    storage_provider: identity.storageProvider,
    storage_key: identity.storageKey,
    caption: input.caption ?? null,
    sort_order: input.sortOrder ?? 0,
    is_video: input.isVideo ?? false,
    taken_at: normalizeTimestamp(input.takenAt),
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('This file is already in the curated gallery');
    }
    throw new Error(`Failed to add curated item: ${error.message}`);
  }
}

export async function deleteMediaUploadCompletely(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: row, error: fetchError } = await supabase
    .from('media_uploads')
    .select('drive_file_id, storage_provider, storage_key, thumbnail_storage_provider, thumbnail_storage_key')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to load media upload: ${fetchError.message}`);
  }

  if (!row) {
    throw new Error('Media upload not found');
  }

  const identity = resolveStorageIdentity({
    driveFileId: row.drive_file_id,
    storageProvider: row.storage_provider,
    storageKey: row.storage_key,
  });

  const hasDistinctDriveFileId =
    row.drive_file_id !== row.storage_key && !isR2ObjectKey(row.drive_file_id);

  if (identity.storageProvider === 'r2' || isR2ObjectKey(identity.storageKey)) {
    await deleteR2Object(identity.storageKey);
  }

  if (row.thumbnail_storage_provider === 'r2' && row.thumbnail_storage_key) {
    await deleteR2Object(row.thumbnail_storage_key);
  }

  if (identity.storageProvider === 'google_drive' && !isR2ObjectKey(identity.driveFileId)) {
    await deleteDriveFile(identity.driveFileId);
  } else if (hasDistinctDriveFileId) {
    await deleteDriveFile(row.drive_file_id);
  }

  const curatedQuery = supabase
    .from('curated_gallery')
    .delete();
  const { error: curatedError } = await applyStorageFilter(curatedQuery, identity);

  if (curatedError) {
    throw new Error(`Failed to remove curated entry: ${curatedError.message}`);
  }

  const { error } = await supabase.from('media_uploads').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to remove media upload: ${error.message}`);
  }
}

export async function deleteCuratedItem(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('curated_gallery').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to remove curated item: ${error.message}`);
  }
}

export async function updateCuratedItem(
  id: string,
  updates: { caption?: string | null; sortOrder?: number }
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const payload: Record<string, unknown> = {};

  if ('caption' in updates) payload.caption = updates.caption ?? null;
  if (typeof updates.sortOrder === 'number') payload.sort_order = updates.sortOrder;

  const { error } = await supabase.from('curated_gallery').update(payload).eq('id', id);

  if (error) {
    throw new Error(`Failed to update curated item: ${error.message}`);
  }
}

export function isMediaRegistryConfigured(): boolean {
  return isSupabaseAdminConfigured();
}
