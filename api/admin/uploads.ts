import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminSecret, isAdminConfigured } from '../../lib/adminAuth.js';
import { getAdminUploadItems } from '../../lib/adminGallery.js';
import { isMediaRegistryConfigured } from '../../lib/mediaUploads.js';

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

  if (!isAdminConfigured()) {
    res.status(503).json({ error: 'Admin access is not configured' });
    return;
  }

  if (!verifyAdminSecret(req.headers)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!isMediaRegistryConfigured()) {
    res.status(503).json({
      error: 'Media registry unavailable',
      message: 'Set SUPABASE_SECRET_KEY to enable admin uploads',
    });
    return;
  }

  try {
    const items = await getAdminUploadItems();
    res.status(200).json({ items });
  } catch (error) {
    console.error('Admin uploads error:', error);
    res.status(500).json({
      error: 'Failed to load uploads',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
