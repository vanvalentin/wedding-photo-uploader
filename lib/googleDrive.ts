import { JWT } from 'google-auth-library';
import { config } from './config.js';

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const DRIVE_SCOPES = [DRIVE_FILE_SCOPE, DRIVE_READONLY_SCOPE, DRIVE_SCOPE];

let jwtClient: JWT | null = null;

function getJwtClient(): JWT {
  if (!jwtClient) {
    jwtClient = new JWT({
      email: config.googleServiceAccount.clientEmail,
      key: config.googleServiceAccount.privateKey,
      scopes: DRIVE_SCOPES,
    });
  }
  return jwtClient;
}

export async function getAccessToken(): Promise<string> {
  const { token } = await getJwtClient().getAccessToken();
  if (!token) {
    throw new Error('Failed to obtain Google access token');
  }
  return token;
}

export interface ResumableSessionOptions {
  fileName: string;
  mimeType: string;
  fileSize: number;
  guestName?: string;
}

export interface ResumableSessionResult {
  sessionUri: string;
  fileName: string;
}

function parseDriveError(errorBody: string): string | null {
  try {
    const parsed = JSON.parse(errorBody) as {
      error?: { errors?: Array<{ reason?: string }>; message?: string };
    };
    const reason = parsed.error?.errors?.[0]?.reason;
    if (reason === 'storageQuotaExceeded') {
      return (
        'Upload failed: target folder must be in a Google Workspace Shared Drive. ' +
        'Service accounts cannot store files on personal My Drive. ' +
        'Add the service account as Content manager on the Shared Drive — see README.'
      );
    }
    return parsed.error?.message ?? null;
  } catch {
    return null;
  }
}

/**
 * Initiates a Google Drive resumable upload session.
 * Returns the session URI for the frontend to upload chunks directly.
 */
export async function createResumableUploadSession(
  options: ResumableSessionOptions
): Promise<ResumableSessionResult> {
  const { fileName, mimeType, fileSize, guestName } = options;
  const accessToken = await getAccessToken();

  const metadata: Record<string, unknown> = {
    name: fileName,
    parents: [config.googleDriveFolderId],
  };

  if (guestName?.trim()) {
    metadata.description = `Uploaded by ${guestName.trim()}`;
  }

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(fileSize),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    const friendly = parseDriveError(errorBody);
    throw new Error(
      friendly ?? `Failed to initiate resumable upload (${response.status}): ${errorBody}`
    );
  }

  const sessionUri = response.headers.get('Location');
  if (!sessionUri) {
    throw new Error('Google Drive did not return a resumable session URI');
  }

  return { sessionUri, fileName };
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  createdTime?: string;
  imageMediaMetadata?: {
    time?: string;
    width?: number;
    height?: number;
  };
  videoMediaMetadata?: {
    width?: number;
    height?: number;
    durationMillis?: string;
  };
}

export async function getDriveFileMetadata(fileId: string): Promise<DriveFileMetadata> {
  const accessToken = await getAccessToken();
  const fields = [
    'id',
    'name',
    'mimeType',
    'thumbnailLink',
    'createdTime',
    'imageMediaMetadata',
    'videoMediaMetadata',
  ].join(',');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch Drive file metadata (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<DriveFileMetadata>;
}

const DEFAULT_THUMBNAIL_SIZE = 220;
const DEFAULT_PREVIEW_SIZE = 1200;

function driveThumbnailUrl(thumbnailLink: string, maxSize: number): string {
  if (/=s\d+/.test(thumbnailLink)) {
    return thumbnailLink.replace(/=s\d+/, `=s${maxSize}`);
  }
  return `${thumbnailLink}=s${maxSize}`;
}

async function fetchDriveThumbnailSized(
  fileId: string,
  maxSize: number,
  options: { allowFullMediaFallback?: boolean } = {}
): Promise<Response> {
  const { allowFullMediaFallback = false } = options;
  const accessToken = await getAccessToken();
  const metadata = await getDriveFileMetadata(fileId);

  if (metadata.thumbnailLink) {
    const sizedUrl = driveThumbnailUrl(metadata.thumbnailLink, maxSize);
    const thumbnailResponse = await fetch(sizedUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (thumbnailResponse.ok) {
      return thumbnailResponse;
    }
  }

  if (allowFullMediaFallback && metadata.mimeType.startsWith('image/')) {
    return fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  throw new Error('No thumbnail available for this file');
}

export async function fetchDriveThumbnail(fileId: string): Promise<Response> {
  return fetchDriveThumbnailSized(fileId, DEFAULT_THUMBNAIL_SIZE, { allowFullMediaFallback: true });
}

export async function fetchDrivePreview(fileId: string): Promise<Response> {
  return fetchDriveThumbnailSized(fileId, DEFAULT_PREVIEW_SIZE);
}

export async function fetchDriveMedia(fileId: string): Promise<Response> {
  const accessToken = await getAccessToken();

  return fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function findRecentFileInFolder(
  fileName: string,
  options?: { fileSize?: number; maxAgeMs?: number }
): Promise<DriveFileMetadata | null> {
  const accessToken = await getAccessToken();
  const maxAgeMs = options?.maxAgeMs ?? 15 * 60 * 1000;
  const escapedName = escapeDriveQueryValue(fileName);
  const query = [
    `'${config.googleDriveFolderId}' in parents`,
    `name = '${escapedName}'`,
    'trashed = false',
  ].join(' and ');

  const fields = [
    'files(id,name,mimeType,thumbnailLink,createdTime,size,imageMediaMetadata,videoMediaMetadata)',
  ].join(',');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime desc&pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to search Drive folder (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as { files?: Array<DriveFileMetadata & { size?: string }> };
  const files = payload.files ?? [];
  if (files.length === 0) return null;

  const cutoff = Date.now() - maxAgeMs;
  const recentFiles = files.filter((file) => {
    if (!file.createdTime) return true;
    return new Date(file.createdTime).getTime() >= cutoff;
  });

  if (recentFiles.length === 0) return null;

  if (options?.fileSize) {
    const sizeMatch = recentFiles.find((file) => Number(file.size) === options.fileSize);
    if (sizeMatch) return sizeMatch;
  }

  return recentFiles[0] ?? null;
}

export interface FolderMediaFile extends DriveFileMetadata {
  size?: string;
}

export interface ListFolderMediaResult {
  files: FolderMediaFile[];
  nextPageToken?: string;
}

export async function listFolderMediaFiles(
  pageToken?: string,
  pageSize = 100
): Promise<ListFolderMediaResult> {
  const accessToken = await getAccessToken();
  const query = [
    `'${config.googleDriveFolderId}' in parents`,
    'trashed = false',
    "(mimeType contains 'image/' or mimeType contains 'video/')",
  ].join(' and ');

  const fields =
    'nextPageToken,files(id,name,mimeType,thumbnailLink,createdTime,size,imageMediaMetadata,videoMediaMetadata)';

  const params = new URLSearchParams({
    q: query,
    fields,
    orderBy: 'createdTime desc',
    pageSize: String(pageSize),
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to list Drive folder (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as {
    files?: FolderMediaFile[];
    nextPageToken?: string;
  };

  return {
    files: payload.files ?? [],
    nextPageToken: payload.nextPageToken,
  };
}

export async function listAllFolderMediaFiles(): Promise<FolderMediaFile[]> {
  const allFiles: FolderMediaFile[] = [];
  let pageToken: string | undefined;

  do {
    const page = await listFolderMediaFiles(pageToken);
    allFiles.push(...page.files);
    pageToken = page.nextPageToken;
  } while (pageToken);

  return allFiles;
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (response.status === 404) return;

  if (!response.ok) {
    const errorBody = await response.text();
    const friendly = parseDriveError(errorBody);
    throw new Error(
      friendly ?? `Failed to delete Drive file (${response.status}): ${errorBody}`
    );
  }
}
