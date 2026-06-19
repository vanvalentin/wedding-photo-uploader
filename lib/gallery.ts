import {
  fetchCuratedGallery,
  fetchPublicMediaUploads,
  isSupabaseConfigured,
} from './supabase.js';
import { getDriveFileMetadata } from './googleDrive.js';
import { headR2Object } from './r2Storage.js';
import type { StorageProvider } from './mediaUploads.js';

export interface CuratedGalleryItem {
  id: string;
  driveFileId: string;
  storageProvider: StorageProvider;
  storageKey: string;
  caption: string | null;
  sortOrder: number;
  isVideo: boolean;
  takenAt: string | null;
  name: string;
  thumbnailUrl: string;
  viewUrl: string;
}

export interface PublicMediaGalleryItem {
  id: string;
  driveFileId: string;
  storageProvider: StorageProvider;
  storageKey: string;
  fileName: string;
  guestName: string | null;
  isVideo: boolean;
  takenAt: string | null;
  uploadedAt: string;
  thumbnailUrl: string;
  viewUrl: string;
}

function storageProvider(row: {
  storage_provider?: StorageProvider | null;
  storage_key?: string | null;
  drive_file_id: string;
}): { provider: StorageProvider; key: string } {
  return {
    provider: row.storage_provider ?? 'google_drive',
    key: row.storage_key ?? row.drive_file_id,
  };
}

function toMediaUrl(
  variant: 'thumbnail' | 'preview' | 'view',
  provider: StorageProvider,
  key: string
): string {
  const params = new URLSearchParams({
    provider,
    key,
  });
  return `/api/media/${variant}?${params.toString()}`;
}

export function sortByTakenDateDesc<T extends { takenAt: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = a.takenAt ? new Date(a.takenAt).getTime() : null;
    const bTime = b.takenAt ? new Date(b.takenAt).getTime() : null;

    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return bTime - aTime;
  });
}

export async function getCuratedGalleryItems(): Promise<CuratedGalleryItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const rows = await fetchCuratedGallery();
  const items: CuratedGalleryItem[] = [];

  for (const row of rows) {
    const identity = storageProvider(row);
    try {
      const metadata =
        identity.provider === 'r2'
          ? await headR2Object(identity.key)
          : await getDriveFileMetadata(identity.key);
      const takenAt =
        row.taken_at ??
        ('imageMediaMetadata' in metadata ? metadata.imageMediaMetadata?.time : null) ??
        ('createdTime' in metadata ? metadata.createdTime : null) ??
        ('lastModified' in metadata ? metadata.lastModified?.toISOString() : null) ??
        null;
      const mimeType =
        'mimeType' in metadata ? metadata.mimeType : metadata.contentType;

      items.push({
        id: row.id,
        driveFileId: row.drive_file_id,
        storageProvider: identity.provider,
        storageKey: identity.key,
        caption: row.caption,
        sortOrder: row.sort_order,
        isVideo: row.is_video || mimeType.startsWith('video/'),
        takenAt,
        name: 'name' in metadata ? metadata.name : metadata.fileName,
        thumbnailUrl: toMediaUrl('thumbnail', identity.provider, identity.key),
        viewUrl: toMediaUrl('view', identity.provider, identity.key),
      });
    } catch (error) {
      console.warn(`Skipping curated item ${identity.provider}:${identity.key}:`, error);
    }
  }

  return sortByTakenDateDesc(items);
}

export async function getAllMediaGalleryItems(): Promise<PublicMediaGalleryItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const rows = await fetchPublicMediaUploads();

  return rows.map((row) => {
    const identity = storageProvider(row);
    return {
      id: row.id,
      driveFileId: row.drive_file_id,
      storageProvider: identity.provider,
      storageKey: identity.key,
      fileName: row.file_name,
      guestName: row.guest_name,
      isVideo: row.is_video,
      takenAt: row.taken_at,
      uploadedAt: row.uploaded_at,
      thumbnailUrl: toMediaUrl('thumbnail', identity.provider, identity.key),
      viewUrl: toMediaUrl('view', identity.provider, identity.key),
    };
  });
}
