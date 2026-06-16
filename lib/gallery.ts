import { fetchCuratedGallery, isSupabaseConfigured } from './supabase.js';
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
        thumbnailUrl: `/api/media/thumbnail?fileId=${encodeURIComponent(row.drive_file_id)}`,
        viewUrl: `/api/media/view?fileId=${encodeURIComponent(row.drive_file_id)}`,
      });
    } catch (error) {
      console.warn(`Skipping curated item ${row.drive_file_id}:`, error);
    }
  }

  return items;
}
