import { Router } from 'express';
import { getCuratedGalleryItems } from '../../../lib/gallery.js';
import { isSupabaseConfigured } from '../../../lib/supabase.js';
import { fetchDriveMedia, fetchDriveThumbnail, getDriveFileMetadata } from '../../../lib/googleDrive.js';

export const galleryRouter = Router();

galleryRouter.get('/curated', async (_req, res) => {
  if (!isSupabaseConfigured()) {
    res.json({ items: [], configured: false });
    return;
  }

  try {
    const items = await getCuratedGalleryItems();
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ items, configured: true });
  } catch (error) {
    console.error('Curated gallery error:', error);
    res.status(500).json({
      error: 'Failed to load curated gallery',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const mediaRouter = Router();

mediaRouter.get('/thumbnail', async (req, res) => {
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
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Thumbnail proxy error:', error);
    res.status(500).json({
      error: 'Failed to load thumbnail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

mediaRouter.get('/view', async (req, res) => {
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
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="${metadata.name.replace(/"/g, '')}"`);
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Media view proxy error:', error);
    res.status(500).json({
      error: 'Failed to load media',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
