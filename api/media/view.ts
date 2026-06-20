import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyDriveMedia } from '../../lib/mediaProxy.js';

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

  const download = req.query.download === '1' || req.query.download === 'true';

  try {
    await proxyDriveMedia(fileId, res, { download });
  } catch (error) {
    console.error('Media view proxy error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to load media',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
