import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { verifyAdminSecret, isAdminConfigured } from '../../../lib/adminAuth.js';
import { getAdminCuratedItems, getAdminUploadItems } from '../../../lib/adminGallery.js';
import { importDriveFolderBatch } from '../../../lib/driveImport.js';
import {
  deleteCuratedItem,
  deleteMediaUploadCompletely,
  insertCuratedItem,
  isMediaRegistryConfigured,
  patchMediaUpload,
  patchMediaUploadsBulk,
} from '../../../lib/mediaUploads.js';
import {
  addPrivateAlbumItem,
  addPrivateAlbumItemFromUpload,
  createPrivateAlbum,
  deletePrivateAlbum,
  deletePrivateAlbumItem,
  isPrivateAlbumsConfigured,
  listPrivateAlbumItems,
  listPrivateAlbums,
  updatePrivateAlbum,
} from '../../../lib/privateAlbums.js';
import { config } from '../../../lib/config.js';
import { createPresignedR2Upload } from '../../../lib/r2Storage.js';
import { createResumableUploadSession } from '../../../lib/googleDrive.js';

export const adminRouter = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (!isAdminConfigured()) {
    res.status(503).json({ error: 'Admin access is not configured' });
    return false;
  }

  if (!verifyAdminSecret(req.headers)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  if (!isMediaRegistryConfigured()) {
    res.status(503).json({
      error: 'Media registry unavailable',
      message: 'Set SUPABASE_SECRET_KEY to enable admin features',
    });
    return false;
  }

  return true;
}

adminRouter.get('/uploads', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const items = await getAdminUploadItems();
    res.json({ items });
  } catch (error) {
    console.error('Admin uploads error:', error);
    res.status(500).json({
      error: 'Failed to load uploads',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.get('/curated', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const items = await getAdminCuratedItems();
    res.json({ items });
  } catch (error) {
    console.error('Admin curated list error:', error);
    res.status(500).json({
      error: 'Failed to load curated gallery',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const addCuratedSchema = z.object({
  driveFileId: z.string().min(1),
  storageProvider: z.enum(['google_drive', 'r2']).optional(),
  storageKey: z.string().min(1).max(2000).optional(),
  caption: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isVideo: z.boolean().optional(),
  takenAt: z.union([z.string().min(1), z.null()]).optional(),
});

const patchUploadSchema = z
  .object({
    id: z.string().uuid(),
    takenAt: z.union([z.string().min(1), z.null()]).optional(),
    reviewed: z.boolean().optional(),
  })
  .refine((data) => data.takenAt !== undefined || data.reviewed !== undefined, {
    message: 'Provide takenAt and/or reviewed',
  });

const bulkPatchUploadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  takenAt: z.union([z.string().min(1), z.null()]),
});

adminRouter.patch('/uploads', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const bulkParsed = bulkPatchUploadSchema.safeParse(req.body);
  if (bulkParsed.success) {
    try {
      const updated = await patchMediaUploadsBulk(bulkParsed.data.ids, {
        takenAt: bulkParsed.data.takenAt,
      });
      res.json({ ok: true, updated });
    } catch (error) {
      console.error('Admin bulk patch upload error:', error);
      res.status(400).json({
        error: 'Failed to update uploads',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  const parsed = patchUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    await patchMediaUpload(parsed.data.id, {
      takenAt: parsed.data.takenAt,
      reviewed: parsed.data.reviewed,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin patch upload error:', error);
    res.status(400).json({
      error: 'Failed to update upload',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.delete('/uploads', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) {
    res.status(400).json({ error: 'Missing id query parameter' });
    return;
  }

  try {
    await deleteMediaUploadCompletely(id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin delete upload error:', error);
    res.status(400).json({
      error: 'Failed to delete upload',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.post('/curated', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const parsed = addCuratedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    await insertCuratedItem({
      driveFileId: parsed.data.driveFileId,
      storageProvider: parsed.data.storageProvider,
      storageKey: parsed.data.storageKey,
      caption: parsed.data.caption,
      sortOrder: parsed.data.sortOrder,
      isVideo: parsed.data.isVideo,
      takenAt: parsed.data.takenAt ?? null,
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Admin curated add error:', error);
    res.status(400).json({
      error: 'Failed to add curated item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.delete('/curated', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) {
    res.status(400).json({ error: 'Missing id query parameter' });
    return;
  }

  try {
    await deleteCuratedItem(id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin curated delete error:', error);
    res.status(500).json({
      error: 'Failed to remove curated item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.post('/import-drive', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const pageToken =
    typeof req.body?.pageToken === 'string' ? req.body.pageToken : undefined;

  try {
    const result = await importDriveFolderBatch(pageToken);
    res.json(result);
  } catch (error) {
    console.error('Drive import error:', error);
    res.status(500).json({
      error: 'Failed to import from Drive',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const createAlbumSchema = z.object({
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
});

const updateAlbumSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
});

const addAlbumItemSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('upload'),
    albumId: z.string().uuid(),
    driveFileId: z.string().min(1),
    storageProvider: z.enum(['google_drive', 'r2']).optional(),
    storageKey: z.string().min(1).max(2000).optional(),
    fileName: z.string().min(1).max(500),
    mimeType: z.string().max(200).optional(),
    isVideo: z.boolean().optional(),
    takenAt: z.union([z.string().min(1), z.null()]).optional(),
  }),
  z.object({
    source: z.literal('library'),
    albumId: z.string().uuid(),
    mediaUploadId: z.string().uuid(),
  }),
]);

const albumUploadInitSchema = z.object({
  albumId: z.string().uuid(),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024 * 1024),
});

function sanitizeAlbumFileName(name: string): string {
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : '';
  const sanitizedBase = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 200);
  return `${sanitizedBase}${ext}`;
}

adminRouter.get('/albums', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums unavailable' });
    return;
  }

  try {
    const items = await listPrivateAlbums();
    res.json({ items });
  } catch (error) {
    console.error('Admin albums list error:', error);
    res.status(500).json({
      error: 'Failed to load albums',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.post('/albums', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums unavailable' });
    return;
  }

  const parsed = createAlbumSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const album = await createPrivateAlbum(parsed.data);
    res.status(201).json({ album });
  } catch (error) {
    console.error('Admin album create error:', error);
    res.status(400).json({
      error: 'Failed to create album',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.patch('/albums', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums unavailable' });
    return;
  }

  const parsed = updateAlbumSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    await updatePrivateAlbum(parsed.data);
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin album update error:', error);
    res.status(400).json({
      error: 'Failed to update album',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.delete('/albums', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums unavailable' });
    return;
  }

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) {
    res.status(400).json({ error: 'Missing id query parameter' });
    return;
  }

  try {
    await deletePrivateAlbum(id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin album delete error:', error);
    res.status(500).json({
      error: 'Failed to delete album',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.get('/album-items', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums unavailable' });
    return;
  }

  const albumId = typeof req.query.albumId === 'string' ? req.query.albumId : null;
  if (!albumId) {
    res.status(400).json({ error: 'Missing albumId query parameter' });
    return;
  }

  try {
    const items = await listPrivateAlbumItems(albumId);
    res.json({ items });
  } catch (error) {
    console.error('Admin album items list error:', error);
    res.status(500).json({
      error: 'Failed to load album items',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.post('/album-items', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums unavailable' });
    return;
  }

  const parsed = addAlbumItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    if (parsed.data.source === 'library') {
      await addPrivateAlbumItemFromUpload(parsed.data.albumId, parsed.data.mediaUploadId);
    } else {
      await addPrivateAlbumItem({
        albumId: parsed.data.albumId,
        driveFileId: parsed.data.driveFileId,
        storageProvider: parsed.data.storageProvider,
        storageKey: parsed.data.storageKey,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        isVideo: parsed.data.isVideo,
        takenAt: parsed.data.takenAt ?? null,
      });
    }
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Admin album item add error:', error);
    res.status(400).json({
      error: 'Failed to add album item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.delete('/album-items', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!isPrivateAlbumsConfigured()) {
    res.status(503).json({ error: 'Private albums unavailable' });
    return;
  }

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) {
    res.status(400).json({ error: 'Missing id query parameter' });
    return;
  }

  try {
    await deletePrivateAlbumItem(id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin album item delete error:', error);
    res.status(500).json({
      error: 'Failed to remove album item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

adminRouter.post('/album-upload/init', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const parsed = albumUploadInitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { albumId, fileName, mimeType, fileSize } = parsed.data;
  const finalFileName = sanitizeAlbumFileName(fileName);
  const albumPrefix = `albums/${albumId}`;

  try {
    if (config.storageProvider === 'r2') {
      const target = await createPresignedR2Upload({
        fileName: finalFileName,
        mimeType,
        keyPrefix: albumPrefix,
      });

      res.json({
        sessionUri: target.uploadUrl,
        fileName: target.fileName,
        storageProvider: 'r2',
        storageKey: target.objectKey,
        uploadMethod: 'single_put',
      });
      return;
    }

    const session = await createResumableUploadSession({
      fileName: finalFileName,
      mimeType,
      fileSize,
    });

    res.json({
      sessionUri: session.sessionUri,
      fileName: session.fileName,
      storageProvider: 'google_drive',
      uploadMethod: 'drive_resumable',
    });
  } catch (error) {
    console.error('Album upload init error:', error);
    res.status(500).json({
      error: 'Failed to initiate upload',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
