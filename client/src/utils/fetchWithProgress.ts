export type FetchProgress = number | null;

export async function fetchBlobWithProgress(
  url: string,
  onProgress: (progress: FetchProgress) => void,
  signal?: AbortSignal
): Promise<Blob> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch (${response.status})`);
  }

  const contentType = response.headers.get('Content-Type') ?? 'application/octet-stream';
  const total = Number(response.headers.get('Content-Length') ?? 0);

  if (!response.body || total <= 0) {
    const blob = await response.blob();
    onProgress(100);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(Math.min(99, Math.round((loaded / total) * 100)));
  }

  onProgress(100);
  return new Blob(chunks as BlobPart[], { type: contentType });
}
