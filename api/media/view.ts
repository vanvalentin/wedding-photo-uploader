import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchDriveMedia, getDriveFileMetadata } from '../../lib/googleDrive.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const fileId = typeof req.query.fileId === 'string' ? req.query.fileId : null;
  if (!fileId) {
    res.status(400).json({ error: 'Missing fileId query parameter' });
    return;
  }

  try {
    const metadata = await getDriveFileMetadata(fileId);
    const mediaResponse = await fetchDriveMedia(fileId);

    if (!mediaResponse.ok) {
      res.status(mediaResponse.status).json({ error: 'Failed to fetch media' });
      return;
    }

    const contentType = mediaResponse.headers.get('Content-Type') ?? metadata.mimeType;
    const buffer = Buffer.from(await mediaResponse.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.setHeader('Content-Disposition', `inline; filename="${metadata.name.replace(/"/g, '')}"`);
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Media view proxy error:', error);
    res.status(500).json({
      error: 'Failed to load media',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
