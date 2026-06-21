import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchDrivePreview } from '../../lib/googleDrive.js';

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
    const previewResponse = await fetchDrivePreview(fileId);
    if (!previewResponse.ok) {
      res.status(previewResponse.status).json({ error: 'Failed to fetch preview' });
      return;
    }

    const contentType = previewResponse.headers.get('Content-Type') ?? 'image/jpeg';
    const buffer = Buffer.from(await previewResponse.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Preview proxy error:', error);
    res.status(500).json({
      error: 'Failed to load preview',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
