import { getSupabaseAdmin, isSupabaseAdminConfigured } from './supabase.js';
import { normalizeTimestamp } from './normalizeTimestamp.js';
import { deleteDriveFile } from './googleDrive.js';

export interface MediaUploadRow {
  id: string;
  drive_file_id: string;
  file_name: string;
  guest_name: string | null;
  mime_type: string | null;
  is_video: boolean;
  file_size: number | null;
  taken_at: string | null;
  uploaded_at: string;
  reviewed: boolean;
}

export interface InsertMediaUploadInput {
  driveFileId: string;
  fileName: string;
  guestName?: string | null;
  mimeType?: string | null;
  isVideo: boolean;
  fileSize?: number | null;
  takenAt?: string | null;
}

export async function mediaUploadExists(driveFileId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('media_uploads')
    .select('id')
    .eq('drive_file_id', driveFileId)
    .maybeSingle();

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
  const rows = inputs.map((input) => ({
    drive_file_id: input.driveFileId,
    file_name: input.fileName,
    guest_name: input.guestName ?? null,
    mime_type: input.mimeType ?? null,
    is_video: input.isVideo,
    file_size: input.fileSize ?? null,
    taken_at: normalizeTimestamp(input.takenAt),
  }));

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

export async function insertMediaUpload(input: InsertMediaUploadInput): Promise<MediaUploadRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('media_uploads')
    .insert({
      drive_file_id: input.driveFileId,
      file_name: input.fileName,
      guest_name: input.guestName ?? null,
      mime_type: input.mimeType ?? null,
      is_video: input.isVideo,
      file_size: input.fileSize ?? null,
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
    .select('drive_file_id')
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
    const { error: curatedError } = await supabase
      .from('curated_gallery')
      .update({ taken_at: normalized })
      .eq('drive_file_id', row.drive_file_id);

    if (curatedError) {
      throw new Error(`Failed to sync curated taken date: ${curatedError.message}`);
    }
  }
}

export async function fetchMediaUploads(limit = 200): Promise<MediaUploadRow[]> {
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
  caption?: string | null;
  sortOrder?: number;
  isVideo?: boolean;
  takenAt?: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('curated_gallery').insert({
    drive_file_id: input.driveFileId,
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
    .select('drive_file_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to load media upload: ${fetchError.message}`);
  }

  if (!row) {
    throw new Error('Media upload not found');
  }

  await deleteDriveFile(row.drive_file_id);

  const { error: curatedError } = await supabase
    .from('curated_gallery')
    .delete()
    .eq('drive_file_id', row.drive_file_id);

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
