import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireR2Config } from './config.js';

let s3Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!s3Client) {
    const r2 = requireR2Config();
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
    });
  }

  return s3Client;
}

function safeKeySegment(value: string): string {
  return (
    value
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 220) || 'upload'
  );
}

function buildObjectKey(fileName: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `uploads/${year}/${month}/${day}/${randomUUID()}-${safeKeySegment(fileName)}`;
}

export interface PresignedR2Upload {
  uploadUrl: string;
  objectKey: string;
  fileName: string;
}

export async function createPresignedR2Upload(options: {
  fileName: string;
  mimeType: string;
  guestName?: string;
}): Promise<PresignedR2Upload> {
  const r2 = requireR2Config();
  const objectKey = buildObjectKey(options.fileName);
  const metadata: Record<string, string> = {
    original_name: options.fileName,
  };

  if (options.guestName?.trim()) {
    metadata.guest_name = options.guestName.trim().slice(0, 100);
  }

  const command = new PutObjectCommand({
    Bucket: r2.bucketName,
    Key: objectKey,
    ContentType: options.mimeType,
    Metadata: metadata,
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: r2.uploadUrlExpiresInSeconds,
  });

  return {
    uploadUrl,
    objectKey,
    fileName: options.fileName,
  };
}

export interface R2ObjectMetadata {
  key: string;
  fileName: string;
  contentType: string;
  contentLength: number | null;
  lastModified: Date | null;
}

function fileNameFromKey(key: string): string {
  return key.split('/').pop()?.replace(/^[0-9a-f-]{36}-/i, '') || key;
}

export async function headR2Object(key: string): Promise<R2ObjectMetadata> {
  const r2 = requireR2Config();
  const response = await getR2Client().send(
    new HeadObjectCommand({
      Bucket: r2.bucketName,
      Key: key,
    })
  );

  return {
    key,
    fileName: response.Metadata?.original_name ?? fileNameFromKey(key),
    contentType: response.ContentType ?? 'application/octet-stream',
    contentLength: response.ContentLength ?? null,
    lastModified: response.LastModified ?? null,
  };
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (body instanceof Uint8Array) return Buffer.from(body);

  const transformBody = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof transformBody.transformToByteArray === 'function') {
    return Buffer.from(await transformBody.transformToByteArray());
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function fetchR2Object(key: string): Promise<{
  metadata: R2ObjectMetadata;
  buffer: Buffer;
}> {
  const r2 = requireR2Config();
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: r2.bucketName,
      Key: key,
    })
  );

  const metadata: R2ObjectMetadata = {
    key,
    fileName: response.Metadata?.original_name ?? fileNameFromKey(key),
    contentType: response.ContentType ?? 'application/octet-stream',
    contentLength: response.ContentLength ?? null,
    lastModified: response.LastModified ?? null,
  };

  return {
    metadata,
    buffer: await bodyToBuffer(response.Body),
  };
}

export async function deleteR2Object(key: string): Promise<void> {
  const r2 = requireR2Config();
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: r2.bucketName,
      Key: key,
    })
  );
}
