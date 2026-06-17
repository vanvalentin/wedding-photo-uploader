import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ServerResponse } from 'node:http';
import { fetchDriveMedia, getDriveFileMetadata } from './googleDrive.js';

function safeFilename(name: string): string {
  return name.replace(/"/g, '').replace(/[^\w\s.-]/g, '_') || 'download';
}

export async function proxyDriveMedia(
  fileId: string,
  res: ServerResponse,
  options: { download?: boolean } = {}
): Promise<void> {
  const [metadata, mediaResponse] = await Promise.all([
    getDriveFileMetadata(fileId),
    fetchDriveMedia(fileId),
  ]);

  if (!mediaResponse.ok) {
    res.statusCode = mediaResponse.status;
    res.end(JSON.stringify({ error: 'Failed to fetch media' }));
    return;
  }

  const contentType = mediaResponse.headers.get('Content-Type') ?? metadata.mimeType;
  const contentLength = mediaResponse.headers.get('Content-Length');
  const filename = safeFilename(metadata.name);
  const disposition = options.download ? 'attachment' : 'inline';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  if (contentLength) {
    res.setHeader('Content-Length', contentLength);
  }

  if (!mediaResponse.body) {
    const buffer = Buffer.from(await mediaResponse.arrayBuffer());
    res.statusCode = 200;
    res.end(buffer);
    return;
  }

  res.statusCode = 200;
  await pipeline(Readable.fromWeb(mediaResponse.body as ReadableStream<Uint8Array>), res);
}
