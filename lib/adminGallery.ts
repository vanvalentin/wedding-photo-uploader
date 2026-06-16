import { fetchMediaUploads, type MediaUploadRow } from './mediaUploads.js';
import { fetchCuratedGallery, type CuratedGalleryRow } from './supabase.js';

export interface AdminMediaUploadItem {
  id: string;
  driveFileId: string;
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
}

export interface AdminCuratedItem {
  id: string;
  driveFileId: string;
  caption: string | null;
  sortOrder: number;
  isVideo: boolean;
  takenAt: string | null;
  createdAt: string;
  fileName: string | null;
  thumbnailUrl: string;
  viewUrl: string;
}

function toThumbnailUrl(driveFileId: string): string {
  return `/api/media/thumbnail?fileId=${encodeURIComponent(driveFileId)}`;
}

function toViewUrl(driveFileId: string): string {
  return `/api/media/view?fileId=${encodeURIComponent(driveFileId)}`;
}

export function mapUploadRow(
  row: MediaUploadRow,
  curatedDriveIds: Set<string>
): AdminMediaUploadItem {
  return {
    id: row.id,
    driveFileId: row.drive_file_id,
    fileName: row.file_name,
    guestName: row.guest_name,
    mimeType: row.mime_type,
    isVideo: row.is_video,
    fileSize: row.file_size,
    takenAt: row.taken_at,
    uploadedAt: row.uploaded_at,
    thumbnailUrl: toThumbnailUrl(row.drive_file_id),
    viewUrl: toViewUrl(row.drive_file_id),
    isCurated: curatedDriveIds.has(row.drive_file_id),
  };
}

export function mapCuratedRow(row: CuratedGalleryRow): AdminCuratedItem {
  return {
    id: row.id,
    driveFileId: row.drive_file_id,
    caption: row.caption,
    sortOrder: row.sort_order,
    isVideo: row.is_video,
    takenAt: row.taken_at,
    createdAt: row.created_at,
    fileName: null,
    thumbnailUrl: toThumbnailUrl(row.drive_file_id),
    viewUrl: toViewUrl(row.drive_file_id),
  };
}

export async function getAdminUploadItems(): Promise<AdminMediaUploadItem[]> {
  const [uploads, curated] = await Promise.all([fetchMediaUploads(), fetchCuratedGallery()]);
  const curatedDriveIds = new Set(curated.map((item) => item.drive_file_id));
  return uploads.map((row) => mapUploadRow(row, curatedDriveIds));
}

export async function getAdminCuratedItems(): Promise<AdminCuratedItem[]> {
  const [curated, uploads] = await Promise.all([fetchCuratedGallery(), fetchMediaUploads()]);
  const uploadNames = new Map(uploads.map((row) => [row.drive_file_id, row.file_name]));

  return curated.map((row) => ({
    ...mapCuratedRow(row),
    fileName: uploadNames.get(row.drive_file_id) ?? null,
  }));
}
