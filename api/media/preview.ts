import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchMediaPreview, parseMediaIdentifier } from '../../lib/mediaProxy.js';
import { getPublicR2ObjectUrl } from '../../lib/mediaUrls.js';
import { headR2Object } from '../../lib/r2Storage.js';

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

  const identifier = parseMediaIdentifier(req.query);
  if (!identifier) {
    res.status(400).json({ error: 'Missing key or fileId query parameter' });
    return;
  }

  try {
    const publicR2Url = identifier.provider === 'r2' ? getPublicR2ObjectUrl(identifier.key) : null;
    if (publicR2Url) {
      const metadata = await headR2Object(identifier.key);
      if (!metadata.contentType.startsWith('video/')) {
        res.redirect(307, publicR2Url);
        return;
      }
    }

    const previewResponse = await fetchMediaPreview(identifier);
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
