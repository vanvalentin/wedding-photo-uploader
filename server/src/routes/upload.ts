import { Router } from 'express';
import { processUploadInit } from '../../../lib/uploadInit.js';

export const uploadRouter = Router();

uploadRouter.post('/init', async (req, res) => {
  const result = await processUploadInit(req.body);

  if (!result.ok) {
    res.status(result.status).json({
      error: result.error,
      ...(result.message ? { message: result.message } : {}),
      ...(result.details ? { details: result.details } : {}),
    });
    return;
  }

  res.json({
    sessionUri: result.sessionUri,
    fileName: result.fileName,
  });
});

uploadRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
