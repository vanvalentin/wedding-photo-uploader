import { Router } from 'express';
import { getAllMediaGalleryItems, getCuratedGalleryItems } from '../../../lib/gallery.js';
import { isSupabaseConfigured } from '../../../lib/supabase.js';
import {
  fetchMediaPreview,
  fetchMediaThumbnail,
  parseMediaIdentifier,
  proxyMedia,
} from '../../../lib/mediaProxy.js';
import { getPublicR2ObjectUrl } from '../../../lib/mediaUrls.js';
import { headR2Object } from '../../../lib/r2Storage.js';

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

galleryRouter.get('/all', async (_req, res) => {
  if (!isSupabaseConfigured()) {
    res.json({ items: [], configured: false });
    return;
  }

  try {
    const items = await getAllMediaGalleryItems();
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ items, configured: true });
  } catch (error) {
    console.error('All media gallery error:', error);
    res.status(500).json({
      error: 'Failed to load gallery',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const mediaRouter = Router();

mediaRouter.get('/thumbnail', async (req, res) => {
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

    const thumbnailResponse = await fetchMediaThumbnail(identifier);
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

mediaRouter.get('/preview', async (req, res) => {
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
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Preview proxy error:', error);
    res.status(500).json({
      error: 'Failed to load preview',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

mediaRouter.get('/view', async (req, res) => {
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
    await proxyMedia(identifier, res, {
      download,
      range: typeof req.headers.range === 'string' ? req.headers.range : undefined,
    });
  } catch (error) {
    console.error('Media view proxy error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to load media',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});
