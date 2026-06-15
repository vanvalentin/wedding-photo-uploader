import { useCallback, useRef, useState } from 'react';
import type { QueuedFile } from '../types';
import { ACCEPTED_TYPES, MAX_FILE_SIZE } from '../types';
import { initUploadSession, uploadFileResumable } from '../services/uploadService';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  // Fallback for HEIC and other types browsers may not report correctly
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'mp4', 'mov', 'webm', 'avi'].includes(ext);
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi'].includes(file.name.split('.').pop()?.toLowerCase() ?? '');
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
        const mimeType = item.file.type || (item.isVideo ? 'video/mp4' : 'image/jpeg');
        const { sessionUri } = await initUploadSession(
          item.file.name,
          mimeType,
          item.file.size,
          guestNameRef.current || undefined
        );

        await uploadFileResumable(item.file, sessionUri, (progress) => {
          updateFile(item.id, { progress });
        });

        updateFile(item.id, { status: 'complete', progress: 100, error: undefined });
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
        const mimeType = item.file.type || (item.isVideo ? 'video/mp4' : 'image/jpeg');
        const { sessionUri } = await initUploadSession(
          item.file.name,
          mimeType,
          item.file.size,
          guestNameRef.current || undefined
        );

        await uploadFileResumable(item.file, sessionUri, (progress) => {
          updateFile(id, { progress });
        });

        updateFile(id, { status: 'complete', progress: 100, error: undefined });
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
