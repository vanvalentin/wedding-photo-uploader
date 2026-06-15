import { JWT } from 'google-auth-library';
import { config } from './config.js';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let authClient: JWT | null = null;

function getAuthClient(): JWT {
  if (!authClient) {
    authClient = new JWT({
      email: config.googleServiceAccount.clientEmail,
      key: config.googleServiceAccount.privateKey,
      scopes: [DRIVE_SCOPE],
    });
  }
  return authClient;
}

export async function getAccessToken(): Promise<string> {
  const client = getAuthClient();
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
    throw new Error(`Failed to initiate resumable upload (${response.status}): ${errorBody}`);
  }

  const sessionUri = response.headers.get('Location');
  if (!sessionUri) {
    throw new Error('Google Drive did not return a resumable session URI');
  }

  return { sessionUri, fileName };
}
