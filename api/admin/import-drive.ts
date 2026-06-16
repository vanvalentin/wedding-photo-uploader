import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminSecret, isAdminConfigured } from '../../lib/adminAuth.js';
import { importDriveFolderToRegistry } from '../../lib/driveImport.js';
import { isMediaRegistryConfigured } from '../../lib/mediaUploads.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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
      message: 'Set SUPABASE_SERVICE_ROLE_KEY to enable Drive import',
    });
    return;
  }

  try {
    const result = await importDriveFolderToRegistry();
    res.status(200).json(result);
  } catch (error) {
    console.error('Drive import error:', error);
    res.status(500).json({
      error: 'Failed to import from Drive',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
