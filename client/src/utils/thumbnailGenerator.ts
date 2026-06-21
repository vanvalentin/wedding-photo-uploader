const THUMBNAIL_MAX_DIMENSION = 640;
const THUMBNAIL_QUALITY = 0.82;

function drawScaledToCanvas(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const scale = Math.min(THUMBNAIL_MAX_DIMENSION / width, THUMBNAIL_MAX_DIMENSION / height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is unavailable');
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode thumbnail'));
        }
      },
      'image/jpeg',
      THUMBNAIL_QUALITY
    );
  });
}

async function generateImageThumbnail(file: File): Promise<Blob> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    });
    try {
      return await canvasToJpegBlob(drawScaledToCanvas(bitmap, bitmap.width, bitmap.height));
    } finally {
      bitmap.close();
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Failed to decode image'));
      element.src = objectUrl;
    });
    return await canvasToJpegBlob(drawScaledToCanvas(image, image.naturalWidth, image.naturalHeight));
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function waitForVideoEvent(video: HTMLVideoElement, event: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(event, onEvent);
      video.removeEventListener('error', onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to decode video'));
    };

    video.addEventListener(event, onEvent, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

async function generateVideoThumbnail(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.src = objectUrl;

  try {
    await waitForVideoEvent(video, 'loadedmetadata');
    const seekTarget = Number.isFinite(video.duration) && video.duration > 2 ? 1 : 0;
    if (seekTarget > 0) {
      video.currentTime = seekTarget;
      await waitForVideoEvent(video, 'seeked');
    } else if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForVideoEvent(video, 'loadeddata');
    }

    return await canvasToJpegBlob(
      drawScaledToCanvas(video, video.videoWidth || 16, video.videoHeight || 9)
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function generateMediaThumbnail(file: File, isVideo: boolean): Promise<Blob> {
  return isVideo ? generateVideoThumbnail(file) : generateImageThumbnail(file);
}
