import {
  fetchCuratedGallery,
  fetchPublicMediaUploads,
  isSupabaseConfigured,
} from './supabase.js';
import { getDriveFileMetadata } from './googleDrive.js';

export interface CuratedGalleryItem {
  id: string;
  driveFileId: string;
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
  fileName: string;
  guestName: string | null;
  isVideo: boolean;
  takenAt: string | null;
  uploadedAt: string;
  thumbnailUrl: string;
  viewUrl: string;
}

function toThumbnailUrl(driveFileId: string): string {
  return `/api/media/thumbnail?fileId=${encodeURIComponent(driveFileId)}`;
}

function toViewUrl(driveFileId: string): string {
  return `/api/media/view?fileId=${encodeURIComponent(driveFileId)}`;
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
    try {
      const metadata = await getDriveFileMetadata(row.drive_file_id);
      const takenAt =
        row.taken_at ??
        metadata.imageMediaMetadata?.time ??
        metadata.createdTime ??
        null;

      items.push({
        id: row.id,
        driveFileId: row.drive_file_id,
        caption: row.caption,
        sortOrder: row.sort_order,
        isVideo: row.is_video || metadata.mimeType.startsWith('video/'),
        takenAt,
        name: metadata.name,
        thumbnailUrl: toThumbnailUrl(row.drive_file_id),
        viewUrl: toViewUrl(row.drive_file_id),
      });
    } catch (error) {
      console.warn(`Skipping curated item ${row.drive_file_id}:`, error);
    }
  }

  return sortByTakenDateDesc(items);
}

export async function getAllMediaGalleryItems(): Promise<PublicMediaGalleryItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const rows = await fetchPublicMediaUploads();

  return rows.map((row) => ({
    id: row.id,
    driveFileId: row.drive_file_id,
    fileName: row.file_name,
    guestName: row.guest_name,
    isVideo: row.is_video,
    takenAt: row.taken_at,
    uploadedAt: row.uploaded_at,
    thumbnailUrl: toThumbnailUrl(row.drive_file_id),
    viewUrl: toViewUrl(row.drive_file_id),
  }));
}
