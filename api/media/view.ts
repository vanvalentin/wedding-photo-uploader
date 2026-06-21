import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseMediaIdentifier, proxyMedia } from '../../lib/mediaProxy.js';
import { getPublicR2ObjectUrl } from '../../lib/mediaUrls.js';

function requestRange(req: VercelRequest): string | undefined {
  return typeof req.headers.range === 'string' ? req.headers.range : undefined;
}

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

  const download = req.query.download === '1' || req.query.download === 'true';
  const publicR2Url = identifier.provider === 'r2' ? getPublicR2ObjectUrl(identifier.key) : null;
  if (publicR2Url) {
    res.redirect(307, publicR2Url);
    return;
  }

  try {
    await proxyMedia(identifier, res, { download, range: requestRange(req) });
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
