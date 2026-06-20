import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchDriveThumbnail } from '../../lib/googleDrive.js';

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
    const thumbnailResponse = await fetchDriveThumbnail(fileId);
    if (!thumbnailResponse.ok) {
      res.status(thumbnailResponse.status).json({ error: 'Failed to fetch thumbnail' });
      return;
    }

    const contentType = thumbnailResponse.headers.get('Content-Type') ?? 'image/jpeg';
    const buffer = Buffer.from(await thumbnailResponse.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Thumbnail proxy error:', error);
    res.status(500).json({
      error: 'Failed to load thumbnail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
