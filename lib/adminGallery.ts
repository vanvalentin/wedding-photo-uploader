import { fetchMediaUploads, type MediaUploadRow } from './mediaUploads.js';
import { fetchCuratedGallery, type CuratedGalleryRow } from './supabase.js';
import type { StorageProvider } from './mediaUploads.js';

export interface AdminMediaUploadItem {
  id: string;
  driveFileId: string;
  storageProvider: StorageProvider;
  storageKey: string;
  fileName: string;
  guestName: string | null;
  mimeType: string | null;
  isVideo: boolean;
  fileSize: number | null;
  takenAt: string | null;
  uploadedAt: string;
  thumbnailUrl: string;
  viewUrl: string;
  isCurated: boolean;
  reviewed: boolean;
}

export interface AdminCuratedItem {
  id: string;
  driveFileId: string;
  storageProvider: StorageProvider;
  storageKey: string;
  caption: string | null;
  sortOrder: number;
  isVideo: boolean;
  takenAt: string | null;
  createdAt: string;
  fileName: string | null;
  thumbnailUrl: string;
  viewUrl: string;
}

function getStorageIdentity(row: {
  drive_file_id: string;
  storage_provider?: StorageProvider | null;
  storage_key?: string | null;
}): { provider: StorageProvider; key: string } {
  return {
    provider: row.storage_provider ?? 'google_drive',
    key: row.storage_key ?? row.drive_file_id,
  };
}

function storageIdentityKey(row: {
  drive_file_id: string;
  storage_provider?: StorageProvider | null;
  storage_key?: string | null;
}): string {
  const identity = getStorageIdentity(row);
  return `${identity.provider}:${identity.key}`;
}

function toMediaUrl(
  variant: 'thumbnail' | 'view',
  provider: StorageProvider,
  key: string
): string {
  const params = new URLSearchParams({ provider, key });
  return `/api/media/${variant}?${params.toString()}`;
}

export function mapUploadRow(
  row: MediaUploadRow,
  curatedDriveIds: Set<string>
): AdminMediaUploadItem {
  const identity = getStorageIdentity(row);
  return {
    id: row.id,
    driveFileId: row.drive_file_id,
    storageProvider: identity.provider,
    storageKey: identity.key,
    fileName: row.file_name,
    guestName: row.guest_name,
    mimeType: row.mime_type,
    isVideo: row.is_video,
    fileSize: row.file_size,
    takenAt: row.taken_at,
    uploadedAt: row.uploaded_at,
    thumbnailUrl: toMediaUrl('thumbnail', identity.provider, identity.key),
    viewUrl: toMediaUrl('view', identity.provider, identity.key),
    isCurated: curatedDriveIds.has(storageIdentityKey(row)),
    reviewed: row.reviewed ?? false,
  };
}

export function mapCuratedRow(row: CuratedGalleryRow): AdminCuratedItem {
  const identity = getStorageIdentity(row);
  return {
    id: row.id,
    driveFileId: row.drive_file_id,
    storageProvider: identity.provider,
    storageKey: identity.key,
    caption: row.caption,
    sortOrder: row.sort_order,
    isVideo: row.is_video,
    takenAt: row.taken_at,
    createdAt: row.created_at,
    fileName: null,
    thumbnailUrl: toMediaUrl('thumbnail', identity.provider, identity.key),
    viewUrl: toMediaUrl('view', identity.provider, identity.key),
  };
}

export async function getAdminUploadItems(): Promise<AdminMediaUploadItem[]> {
  const [uploads, curated] = await Promise.all([fetchMediaUploads(), fetchCuratedGallery()]);
  const curatedDriveIds = new Set(curated.map((item) => storageIdentityKey(item)));
  return uploads.map((row) => mapUploadRow(row, curatedDriveIds));
}

export async function getAdminCuratedItems(): Promise<AdminCuratedItem[]> {
  const [curated, uploads] = await Promise.all([fetchCuratedGallery(), fetchMediaUploads()]);
  const uploadNames = new Map(uploads.map((row) => [storageIdentityKey(row), row.file_name]));

  return curated.map((row) => ({
    ...mapCuratedRow(row),
    fileName: uploadNames.get(storageIdentityKey(row)) ?? null,
  }));
}
