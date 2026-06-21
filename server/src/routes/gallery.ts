import { Router } from 'express';
import { z } from 'zod';
import { getAllMediaGalleryItems, getCuratedGalleryItems } from '../../../lib/gallery.js';
import { isSupabaseConfigured } from '../../../lib/supabase.js';
import {
  getPrivateAlbumInfo,
  isPrivateAlbumsConfigured,
  verifyPrivateAlbumAccess,
} from '../../../lib/privateAlbums.js';
import {
  fetchMediaPreview,
  fetchMediaThumbnail,
  parseMediaIdentifier,
  proxyMedia,
} from '../../../lib/mediaProxy.js';

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

const albumAccessSchema = z.object({
  slug: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const albumsRouter = Router();

albumsRouter.get('/access', async (req, res) => {
  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums are not configured' });
    return;
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug : null;
  if (!slug) {
    res.status(400).json({ error: 'Missing slug query parameter' });
    return;
  }

  try {
    const info = await getPrivateAlbumInfo(slug);
    if (!info) {
      res.status(404).json({ error: 'Album not found' });
      return;
    }

    res.json({ exists: true, title: info.title });
  } catch (error) {
    console.error('Private album info error:', error);
    res.status(500).json({
      error: 'Failed to load album',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

albumsRouter.post('/access', async (req, res) => {
  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums are not configured' });
    return;
  }

  const parsed = albumAccessSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const result = await verifyPrivateAlbumAccess(parsed.data.slug, parsed.data.password);
    if (!result) {
      res.status(401).json({ error: 'Invalid password or album not found' });
      return;
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.json({
      title: result.album.title,
      slug: result.album.slug,
      items: result.items,
    });
  } catch (error) {
    console.error('Private album access error:', error);
    res.status(500).json({
      error: 'Failed to access album',
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

  try {
    await proxyMedia(identifier, res, { download });
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
