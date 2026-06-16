import { listAllFolderMediaFiles } from './googleDrive.js';
import { insertMediaUpload, mediaUploadExists } from './mediaUploads.js';
import { isSupabaseAdminConfigured } from './supabase.js';

export interface DriveImportResult {
  totalInDrive: number;
  imported: number;
  skipped: number;
}

export async function importDriveFolderToRegistry(): Promise<DriveImportResult> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('SUPABASE_SECRET_KEY is required for Drive import');
  }

  const driveFiles = await listAllFolderMediaFiles();
  let imported = 0;
  let skipped = 0;

  for (const file of driveFiles) {
    const exists = await mediaUploadExists(file.id);
    if (exists) {
      skipped += 1;
      continue;
    }

    const takenAt = file.imageMediaMetadata?.time ?? file.createdTime ?? null;

    await insertMediaUpload({
      driveFileId: file.id,
      fileName: file.name,
      guestName: null,
      mimeType: file.mimeType,
      isVideo: file.mimeType.startsWith('video/'),
      fileSize: file.size ? Number(file.size) : null,
      takenAt,
    });

    imported += 1;
  }

  return {
    totalInDrive: driveFiles.length,
    imported,
    skipped,
  };
}
