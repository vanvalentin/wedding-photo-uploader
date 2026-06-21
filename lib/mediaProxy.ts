import type { ServerResponse } from 'node:http';
import {
  fetchDriveMedia,
  fetchDrivePreview,
  fetchDriveThumbnail,
  getDriveFileMetadata,
} from './googleDrive.js';
import { fetchR2Object, headR2Object } from './r2Storage.js';
import type { StorageProvider } from './mediaUploads.js';

function safeFilename(name: string): string {
  return name.replace(/"/g, '').replace(/[^\w\s.-]/g, '_') || 'download';
}

export interface MediaIdentifier {
  provider: StorageProvider;
  key: string;
}

export function parseMediaIdentifier(query: {
  provider?: unknown;
  key?: unknown;
  fileId?: unknown;
}): MediaIdentifier | null {
  const key =
    typeof query.key === 'string'
      ? query.key
      : typeof query.fileId === 'string'
        ? query.fileId
        : null;

  if (!key) return null;

  const provider =
    query.provider === 'r2'
      ? 'r2'
      : 'google_drive';

  return { provider, key };
}

function videoPlaceholder(): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#1f2937"/>
  <circle cx="320" cy="180" r="58" fill="rgba(255,255,255,0.18)"/>
  <path d="M304 145v70l58-35z" fill="white"/>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

function bufferBody(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

export async function fetchMediaThumbnail(identifier: MediaIdentifier): Promise<Response> {
  if (identifier.provider === 'google_drive') {
    return fetchDriveThumbnail(identifier.key);
  }

  const metadata = await headR2Object(identifier.key);
  if (metadata.contentType.startsWith('video/')) {
    return videoPlaceholder();
  }

  const object = await fetchR2Object(identifier.key);
  return new Response(bufferBody(object.buffer), {
    status: 200,
    headers: {
      'Content-Type': object.metadata.contentType,
      'Content-Length': String(object.buffer.length),
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

export async function fetchMediaPreview(identifier: MediaIdentifier): Promise<Response> {
  if (identifier.provider === 'google_drive') {
    return fetchDrivePreview(identifier.key);
  }

  return fetchMediaThumbnail(identifier);
}

export async function proxyMedia(
  identifier: MediaIdentifier,
  res: ServerResponse,
  options: { download?: boolean } = {}
): Promise<void> {
  if (identifier.provider === 'r2') {
    const object = await fetchR2Object(identifier.key);
    const filename = safeFilename(object.metadata.fileName);
    const disposition = options.download ? 'attachment' : 'inline';

    res.statusCode = 200;
    res.setHeader('Content-Type', object.metadata.contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Content-Length', String(object.buffer.length));
    res.end(object.buffer);
    return;
  }

  const [metadata, mediaResponse] = await Promise.all([
    getDriveFileMetadata(identifier.key),
    fetchDriveMedia(identifier.key),
  ]);

  if (!mediaResponse.ok) {
    res.statusCode = mediaResponse.status;
    res.end(JSON.stringify({ error: 'Failed to fetch media' }));
    return;
  }

  const contentType = mediaResponse.headers.get('Content-Type') ?? metadata.mimeType;
  const buffer = Buffer.from(await mediaResponse.arrayBuffer());
  const filename = safeFilename(metadata.name);
  const disposition = options.download ? 'attachment' : 'inline';

  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  res.setHeader('Content-Length', String(buffer.length));
  res.end(buffer);
}

export async function proxyDriveMedia(
  fileId: string,
  res: ServerResponse,
  options: { download?: boolean } = {}
): Promise<void> {
  await proxyMedia({ provider: 'google_drive', key: fileId }, res, options);
}
