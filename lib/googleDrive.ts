import { JWT, OAuth2Client } from 'google-auth-library';
import { config } from './config.js';

/** Minimal scope: create files in folders the authorized user owns */
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let jwtClient: JWT | null = null;
let oauth2Client: OAuth2Client | null = null;

function getJwtClient(): JWT {
  if (!config.googleServiceAccount) {
    throw new Error('Service account credentials are not configured');
  }
  if (!jwtClient) {
    jwtClient = new JWT({
      email: config.googleServiceAccount.clientEmail,
      key: config.googleServiceAccount.privateKey,
      scopes: [DRIVE_SCOPE],
    });
  }
  return jwtClient;
}

function getOAuth2Client(): OAuth2Client {
  if (!config.googleOAuth) {
    throw new Error('OAuth credentials are not configured');
  }
  if (!oauth2Client) {
    oauth2Client = new OAuth2Client(
      config.googleOAuth.clientId,
      config.googleOAuth.clientSecret
    );
    oauth2Client.setCredentials({
      refresh_token: config.googleOAuth.refreshToken,
    });
  }
  return oauth2Client;
}

export async function getAccessToken(): Promise<string> {
  const client =
    config.googleAuthMode === 'oauth' ? getOAuth2Client() : getJwtClient();

  const { token } = await client.getAccessToken();
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
        'Service accounts cannot store files on personal Google Drive (no storage quota). ' +
        'Use OAuth credentials instead (recommended) — see README. ' +
        'Service accounts only work with Google Workspace Shared Drives.'
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

export async function fetchDriveThumbnail(fileId: string): Promise<Response> {
  const accessToken = await getAccessToken();
  const metadata = await getDriveFileMetadata(fileId);

  if (metadata.thumbnailLink) {
    const thumbnailResponse = await fetch(metadata.thumbnailLink, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (thumbnailResponse.ok) {
      return thumbnailResponse;
    }
  }

  if (metadata.mimeType.startsWith('image/')) {
    return fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  throw new Error('No thumbnail available for this file');
}

export async function fetchDriveMedia(fileId: string): Promise<Response> {
  const accessToken = await getAccessToken();

  return fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}
