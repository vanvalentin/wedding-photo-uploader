import { getSupabaseAdmin, isSupabaseAdminConfigured } from './supabase.js';
import type { StorageProvider } from './mediaUploads.js';
import { toMediaThumbnailUrl, toMediaUrl } from './mediaUrls.js';

export interface PrivateAlbumRow {
  id: string;
  slug: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface PrivateAlbumItemRow {
  id: string;
  album_id: string;
  drive_file_id: string;
  storage_provider: StorageProvider;
  storage_key: string;
  file_name: string;
  mime_type: string | null;
  is_video: boolean;
  sort_order: number;
  taken_at: string | null;
  created_at: string;
}

export interface PrivateAlbumSummary {
  id: string;
  slug: string;
  title: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateAlbumGalleryItem {
  id: string;
  driveFileId: string;
  storageProvider: StorageProvider;
  storageKey: string;
  fileName: string;
  isVideo: boolean;
  takenAt: string | null;
  thumbnailUrl: string;
  viewUrl: string;
}

export interface PrivateAlbumGallery {
  title: string;
  slug: string;
  items: PrivateAlbumGalleryItem[];
}

function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isPrivateAlbumsConfigured(): boolean {
  return isSupabaseAdminConfigured();
}

export function privateAlbumStorageIdentityKey(
  storageProvider: StorageProvider,
  storageKey: string
): string {
  return `${storageProvider}:${storageKey}`;
}

export async function fetchPrivateAlbumStorageIdentityKeys(): Promise<Set<string>> {
  if (!isPrivateAlbumsConfigured()) {
    return new Set();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('private_album_items')
    .select('storage_provider, storage_key');

  if (error) {
    throw new Error(`Failed to fetch private album items: ${error.message}`);
  }

  return new Set(
    (data ?? []).map((row) =>
      privateAlbumStorageIdentityKey(row.storage_provider as StorageProvider, row.storage_key)
    )
  );
}

export async function listPrivateAlbums(): Promise<PrivateAlbumSummary[]> {
  const supabase = getSupabaseAdmin();

  const { data: albums, error } = await supabase
    .from('private_albums')
    .select('id, slug, title, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list private albums: ${error.message}`);
  }

  const { data: counts, error: countError } = await supabase
    .from('private_album_items')
    .select('album_id');

  if (countError) {
    throw new Error(`Failed to count album items: ${countError.message}`);
  }

  const countByAlbum = new Map<string, number>();
  for (const row of counts ?? []) {
    countByAlbum.set(row.album_id, (countByAlbum.get(row.album_id) ?? 0) + 1);
  }

  return (albums ?? []).map((album) => ({
    id: album.id,
    slug: album.slug,
    title: album.title,
    itemCount: countByAlbum.get(album.id) ?? 0,
    createdAt: album.created_at,
    updatedAt: album.updated_at,
  }));
}

export async function getPrivateAlbumBySlug(slug: string): Promise<PrivateAlbumRow | null> {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeSlug(slug);

  const { data, error } = await supabase
    .from('private_albums')
    .select('*')
    .eq('slug', normalized)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch private album: ${error.message}`);
  }

  return data;
}

export async function createPrivateAlbum(input: {
  slug: string;
  title: string;
}): Promise<PrivateAlbumSummary> {
  const supabase = getSupabaseAdmin();
  const slug = normalizeSlug(input.slug);

  if (!slug) {
    throw new Error('Album URL slug is required');
  }

  if (!input.title.trim()) {
    throw new Error('Album title is required');
  }

  const { data, error } = await supabase
    .from('private_albums')
    .insert({
      slug,
      title: input.title.trim(),
    })
    .select('id, slug, title, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('An album with this URL already exists');
    }
    throw new Error(`Failed to create private album: ${error.message}`);
  }

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    itemCount: 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updatePrivateAlbum(input: {
  id: string;
  slug?: string;
  title?: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const updates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (input.slug !== undefined) {
    const slug = normalizeSlug(input.slug);
    if (!slug) {
      throw new Error('Album URL slug is required');
    }
    updates.slug = slug;
  }

  if (input.title !== undefined) {
    if (!input.title.trim()) {
      throw new Error('Album title is required');
    }
    updates.title = input.title.trim();
  }

  const { error } = await supabase.from('private_albums').update(updates).eq('id', input.id);

  if (error) {
    if (error.code === '23505') {
      throw new Error('An album with this URL already exists');
    }
    throw new Error(`Failed to update private album: ${error.message}`);
  }
}

export async function deletePrivateAlbum(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('private_albums').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete private album: ${error.message}`);
  }
}

export async function listPrivateAlbumItems(albumId: string): Promise<PrivateAlbumGalleryItem[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('private_album_items')
    .select('*')
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to list album items: ${error.message}`);
  }

  const storageKeys = [...new Set((data ?? []).map((row) => row.storage_key))];
  const thumbnailByIdentity = new Map<string, { provider: StorageProvider; key: string }>();

  if (storageKeys.length > 0) {
    const { data: uploads, error: uploadsError } = await supabase
      .from('media_uploads')
      .select('storage_provider, storage_key, thumbnail_storage_provider, thumbnail_storage_key')
      .in('storage_key', storageKeys);

    if (uploadsError) {
      throw new Error(`Failed to load album thumbnails: ${uploadsError.message}`);
    }

    for (const upload of uploads ?? []) {
      if (upload.thumbnail_storage_provider && upload.thumbnail_storage_key) {
        thumbnailByIdentity.set(`${upload.storage_provider}:${upload.storage_key}`, {
          provider: upload.thumbnail_storage_provider,
          key: upload.thumbnail_storage_key,
        });
      }
    }
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    driveFileId: row.drive_file_id,
    storageProvider: row.storage_provider,
    storageKey: row.storage_key,
    fileName: row.file_name,
    isVideo: row.is_video,
    takenAt: row.taken_at,
    thumbnailUrl: toMediaThumbnailUrl(
      row.storage_provider,
      row.storage_key,
      row.is_video,
      thumbnailByIdentity.get(`${row.storage_provider}:${row.storage_key}`)
    ),
    viewUrl: toMediaUrl('view', row.storage_provider, row.storage_key),
  }));
}

export async function getPrivateAlbumGallery(slug: string): Promise<PrivateAlbumGallery | null> {
  const album = await getPrivateAlbumBySlug(slug);
  if (!album) {
    return null;
  }

  const items = await listPrivateAlbumItems(album.id);
  return {
    title: album.title,
    slug: album.slug,
    items,
  };
}

export async function addPrivateAlbumItem(input: {
  albumId: string;
  driveFileId: string;
  storageProvider?: StorageProvider;
  storageKey?: string;
  fileName: string;
  mimeType?: string | null;
  isVideo?: boolean;
  takenAt?: string | null;
  sortOrder?: number;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const storageProvider = input.storageProvider ?? 'r2';
  const storageKey = input.storageKey ?? input.driveFileId;

  const { error } = await supabase.from('private_album_items').insert({
    album_id: input.albumId,
    drive_file_id: input.driveFileId,
    storage_provider: storageProvider,
    storage_key: storageKey,
    file_name: input.fileName,
    mime_type: input.mimeType ?? null,
    is_video: input.isVideo ?? false,
    taken_at: input.takenAt ?? null,
    sort_order: input.sortOrder ?? 0,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('This photo is already in the album');
    }
    throw new Error(`Failed to add album item: ${error.message}`);
  }

  await supabase
    .from('private_albums')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.albumId);
}

export async function addPrivateAlbumItemFromUpload(
  albumId: string,
  uploadId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: upload, error: uploadError } = await supabase
    .from('media_uploads')
    .select('*')
    .eq('id', uploadId)
    .maybeSingle();

  if (uploadError) {
    throw new Error(`Failed to fetch upload: ${uploadError.message}`);
  }

  if (!upload) {
    throw new Error('Upload not found');
  }

  await addPrivateAlbumItem({
    albumId,
    driveFileId: upload.drive_file_id,
    storageProvider: upload.storage_provider,
    storageKey: upload.storage_key,
    fileName: upload.file_name,
    mimeType: upload.mime_type,
    isVideo: upload.is_video,
    takenAt: upload.taken_at,
  });
}

export async function deletePrivateAlbumItem(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: item, error: fetchError } = await supabase
    .from('private_album_items')
    .select('album_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch album item: ${fetchError.message}`);
  }

  const { error } = await supabase.from('private_album_items').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete album item: ${error.message}`);
  }

  if (item?.album_id) {
    await supabase
      .from('private_albums')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', item.album_id);
  }
}

export { normalizeSlug };
