import { CHUNK_SIZE } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface InitUploadResponse {
  sessionUri: string;
  fileName: string;
  storageProvider: 'google_drive' | 'r2';
  storageKey?: string;
  uploadMethod: 'drive_resumable' | 'single_put';
}

export async function initUploadSession(
  fileName: string,
  mimeType: string,
  fileSize: number,
  guestName?: string
): Promise<InitUploadResponse> {
  const response = await fetch(`${API_BASE}/api/upload/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, mimeType, fileSize, guestName }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `Server error (${response.status})`);
  }

  return response.json();
}

export interface ChunkUploadResult {
  done: boolean;
  uploadedBytes: number;
}

/**
 * Uploads a single chunk to the Google Drive resumable session URI.
 * The frontend talks directly to Google — no file bytes pass through our backend.
 */
export async function uploadChunk(
  sessionUri: string,
  chunk: Blob,
  start: number,
  end: number,
  total: number
): Promise<ChunkUploadResult> {
  const isFinalChunk = end >= total - 1;

  let response: Response;
  try {
    response = await fetch(sessionUri, {
      method: 'PUT',
      headers: {
        'Content-Length': String(chunk.size),
        'Content-Range': `bytes ${start}-${end}/${total}`,
      },
      body: chunk,
    });
  } catch {
    // Google often receives the file but the browser blocks reading the response (CORS).
    if (isFinalChunk) {
      return { done: true, uploadedBytes: total };
    }
    throw new Error('Network error during upload');
  }

  if (response.status === 308) {
    const rangeHeader = response.headers.get('Range');
    const uploadedBytes = rangeHeader
      ? parseInt(rangeHeader.split('-').pop() ?? String(end), 10) + 1
      : end + 1;
    return { done: false, uploadedBytes };
  }

  if (response.ok || response.status === 200 || response.status === 201) {
    return { done: true, uploadedBytes: total };
  }

  // Final chunk sent all bytes — treat unreadable responses as success (common with Drive CORS).
  if (isFinalChunk && (response.status === 0 || response.type === 'opaque')) {
    return { done: true, uploadedBytes: total };
  }

  const errorText = await response.text().catch(() => '');
  throw new Error(`Chunk upload failed (${response.status}): ${errorText}`);
}

export async function uploadFileResumable(
  file: File,
  sessionUri: string,
  onProgress: (progress: number) => void
): Promise<void> {
  const total = file.size;
  let offset = 0;

  while (offset < total) {
    const end = Math.min(offset + CHUNK_SIZE, total) - 1;
    const chunk = file.slice(offset, end + 1);

    const result = await uploadChunk(sessionUri, chunk, offset, end, total);
    offset = result.uploadedBytes;
    onProgress(Math.min(100, Math.round((offset / total) * 100)));

    if (result.done) break;
  }

  onProgress(100);
}

async function uploadFileSinglePut(
  file: File,
  uploadUrl: string,
  mimeType: string,
  onProgress: (progress: number) => void
): Promise<void> {
  onProgress(5);
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: file,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Upload failed (${response.status}): ${errorText}`);
  }

  onProgress(100);
}

export async function uploadFileToTarget(
  file: File,
  target: InitUploadResponse,
  mimeType: string,
  onProgress: (progress: number) => void
): Promise<void> {
  if (target.uploadMethod === 'single_put') {
    await uploadFileSinglePut(file, target.sessionUri, mimeType, onProgress);
    return;
  }

  await uploadFileResumable(file, target.sessionUri, onProgress);
}

export interface RegisterUploadCompleteInput {
  fileName: string;
  mimeType: string;
  fileSize: number;
  guestName?: string;
  isVideo?: boolean;
  storageProvider?: 'google_drive' | 'r2';
  storageKey?: string;
}

export async function registerUploadComplete(
  input: RegisterUploadCompleteInput
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/upload/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `Registration failed (${response.status})`);
  }
}
