import { getSupabaseAdmin, isSupabaseAdminConfigured } from './supabase.js';
import { normalizeTimestamp } from './normalizeTimestamp.js';

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
