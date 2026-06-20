import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processUploadComplete } from '../../lib/uploadComplete.js';

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

  const result = await processUploadComplete(req.body);

  if (!result.ok) {
    res.status(result.status).json({
      error: result.error,
      ...(result.message ? { message: result.message } : {}),
      ...(result.details ? { details: result.details } : {}),
    });
    return;
  }

  res.status(200).json({
    driveFileId: result.driveFileId,
    alreadyRegistered: result.alreadyRegistered,
  });
}
