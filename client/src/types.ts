export type UploadStatus = 'pending' | 'uploading' | 'complete' | 'error';

export interface MediaPreview {
  id: string;
  previewUrl: string;
  viewUrl?: string;
  name: string;
  isVideo: boolean;
  caption?: string | null;
}

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

/** Number of thumbnails shown before "Load more" on the success screen */
export const SUCCESS_GALLERY_PAGE_SIZE = 12;

export interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB

/** Chunk size for resumable uploads — must be a multiple of 256 KB */
export const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB
