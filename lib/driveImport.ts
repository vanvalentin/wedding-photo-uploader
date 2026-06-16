import { listFolderMediaFiles, type FolderMediaFile } from './googleDrive.js';
import {
  getRegisteredDriveFileIds,
  insertMediaUploadsBatch,
  updateTakenAtBatch,
  type InsertMediaUploadInput,
} from './mediaUploads.js';
import { isSupabaseAdminConfigured } from './supabase.js';

export interface DriveImportResult {
  totalInDrive: number;
  imported: number;
  skipped: number;
}

export interface DriveImportBatchResult {
  imported: number;
  skipped: number;
  processedInBatch: number;
  nextPageToken: string | null;
  done: boolean;
}

function toInsertInput(file: FolderMediaFile): InsertMediaUploadInput {
  return {
    driveFileId: file.id,
    fileName: file.name,
    guestName: null,
    mimeType: file.mimeType,
    isVideo: file.mimeType.startsWith('video/'),
    fileSize: file.size ? Number(file.size) : null,
    takenAt: file.imageMediaMetadata?.time ?? file.createdTime ?? null,
  };
}

export async function importDriveFolderBatch(
  pageToken?: string
): Promise<DriveImportBatchResult> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('SUPABASE_SECRET_KEY is required for Drive import');
  }

  const page = await listFolderMediaFiles(pageToken);
  const files = page.files;

  if (files.length === 0) {
    return {
      imported: 0,
      skipped: 0,
      processedInBatch: 0,
      nextPageToken: page.nextPageToken ?? null,
      done: !page.nextPageToken,
    };
  }

  const registeredIds = await getRegisteredDriveFileIds(files.map((file) => file.id));
  const toInsert = files.filter((file) => !registeredIds.has(file.id)).map(toInsertInput);
  const imported = await insertMediaUploadsBatch(toInsert);

  const toRefreshTakenAt = files
    .filter((file) => registeredIds.has(file.id))
    .map((file) => ({
      driveFileId: file.id,
      takenAt: file.imageMediaMetadata?.time ?? file.createdTime ?? null,
    }));
  await updateTakenAtBatch(toRefreshTakenAt);

  return {
    imported,
    skipped: files.length - imported,
    processedInBatch: files.length,
    nextPageToken: page.nextPageToken ?? null,
    done: !page.nextPageToken,
  };
}

export async function importDriveFolderToRegistry(): Promise<DriveImportResult> {
  let imported = 0;
  let skipped = 0;
  let totalInDrive = 0;
  let pageToken: string | undefined;

  do {
    const batch = await importDriveFolderBatch(pageToken);
    imported += batch.imported;
    skipped += batch.skipped;
    totalInDrive += batch.processedInBatch;
    pageToken = batch.nextPageToken ?? undefined;
  } while (pageToken);

  return {
    totalInDrive,
    imported,
    skipped,
  };
}
