import { useCallback, useRef, useState } from 'react';
import type { QueuedFile } from '../types';
import { ACCEPTED_TYPES, MAX_FILE_SIZE } from '../types';
import {
  initUploadSession,
  registerUploadComplete,
  uploadFileToTarget,
  uploadThumbnailToTarget,
} from '../services/uploadService';
import { generateMediaThumbnail } from '../utils/thumbnailGenerator';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'mp4', 'mov', 'webm', 'avi'].includes(ext);
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi'].includes(file.name.split('.').pop()?.toLowerCase() ?? '');
}

async function uploadQueueItem(
  item: QueuedFile,
  guestName: string,
  updateFile: (id: string, updates: Partial<Pick<QueuedFile, 'status' | 'progress' | 'error'>>) => void
): Promise<void> {
  const mimeType = item.file.type || (item.isVideo ? 'video/mp4' : 'image/jpeg');
  const uploadTarget = await initUploadSession(
    item.file.name,
    mimeType,
    item.file.size,
    guestName || undefined
  );

  await uploadFileToTarget(item.file, uploadTarget, mimeType, (progress) => {
    updateFile(item.id, { progress });
  });

  let uploadedThumbnail:
    | { storageKey: string; mimeType: string; fileSize: number }
    | undefined;

  if (uploadTarget.thumbnailUpload) {
    try {
      const thumbnail = await generateMediaThumbnail(item.file, item.isVideo);
      await uploadThumbnailToTarget(thumbnail, uploadTarget.thumbnailUpload);
      uploadedThumbnail = {
        storageKey: uploadTarget.thumbnailUpload.storageKey,
        mimeType: uploadTarget.thumbnailUpload.mimeType,
        fileSize: thumbnail.size,
      };
    } catch (error) {
      console.warn('Thumbnail generation failed (upload still succeeded):', error);
    }
  }

  try {
    await registerUploadComplete({
      fileName: uploadTarget.fileName,
      mimeType,
      fileSize: item.file.size,
      guestName: guestName || undefined,
      isVideo: item.isVideo,
      storageProvider: uploadTarget.storageProvider,
      storageKey: uploadTarget.storageKey,
      thumbnailStorageKey: uploadedThumbnail?.storageKey,
      thumbnailMimeType: uploadedThumbnail?.mimeType,
      thumbnailFileSize: uploadedThumbnail?.fileSize,
    });
  } catch (error) {
    console.warn('Upload registry failed (upload still succeeded):', error);
  }

  updateFile(item.id, { status: 'complete', progress: 100, error: undefined });
}

export function useUploadQueue() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const guestNameRef = useRef('');

  const setGuestName = useCallback((name: string) => {
    guestNameRef.current = name;
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: QueuedFile[] = [];

    for (const file of Array.from(files)) {
      if (!isAcceptedFile(file)) continue;
      if (file.size > MAX_FILE_SIZE) continue;

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: generateId(),
        file,
        previewUrl,
        isVideo: isVideoFile(file),
        status: 'pending',
        progress: 0,
      });
    }

    if (newItems.length > 0) {
      setAllComplete(false);
      setQueue((prev) => [...prev, ...newItems]);
    }

    return newItems.length;
  }, []);

  const removeFile = useCallback((id: string) => {
    setQueue((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<Pick<QueuedFile, 'status' | 'progress' | 'error'>>) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const uploadAll = useCallback(async () => {
    const pending = queue.filter((f) => f.status === 'pending' || f.status === 'error');
    if (pending.length === 0) return;

    setIsUploading(true);
    setAllComplete(false);

    let allSucceeded = true;

    for (const item of pending) {
      updateFile(item.id, { status: 'uploading', progress: 0, error: undefined });

      try {
        await uploadQueueItem(item, guestNameRef.current, updateFile);
      } catch (err) {
        allSucceeded = false;
        updateFile(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    }

    setIsUploading(false);
    if (allSucceeded) {
      setAllComplete(true);
    }
  }, [queue, updateFile]);

  const retryFile = useCallback(
    async (id: string) => {
      const item = queue.find((f) => f.id === id);
      if (!item || isUploading) return;

      setIsUploading(true);
      updateFile(id, { status: 'uploading', progress: 0, error: undefined });

      try {
        await uploadQueueItem(item, guestNameRef.current, updateFile);
      } catch (err) {
        updateFile(id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [queue, isUploading, updateFile]
  );

  const hasUnsentFiles = queue.some((f) => f.status === 'pending' || f.status === 'error');
  const hasActiveGuard = isUploading || hasUnsentFiles;

  const resetForMoreUploads = useCallback(() => {
    setQueue((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setAllComplete(false);
    setIsUploading(false);
  }, []);

  return {
    queue,
    isUploading,
    allComplete,
    hasUnsentFiles,
    hasActiveGuard,
    addFiles,
    removeFile,
    uploadAll,
    retryFile,
    resetForMoreUploads,
    setGuestName,
  };
}
