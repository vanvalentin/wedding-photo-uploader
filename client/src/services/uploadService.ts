import { CHUNK_SIZE } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface InitUploadResponse {
  sessionUri: string;
  fileName: string;
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
  const response = await fetch(sessionUri, {
    method: 'PUT',
    headers: {
      'Content-Length': String(chunk.size),
      'Content-Range': `bytes ${start}-${end}/${total}`,
    },
    body: chunk,
  });

  if (response.status === 308) {
    const range = response.headers.get('Range');
    const uploadedBytes = range ? parseInt(range.split('-')[1], 10) + 1 : end + 1;
    return { done: false, uploadedBytes };
  }

  if (response.status === 200 || response.status === 201) {
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
    onProgress(Math.round((offset / total) * 100));

    if (result.done) break;
  }
}
