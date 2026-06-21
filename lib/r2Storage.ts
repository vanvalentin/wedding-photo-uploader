import { randomUUID } from 'node:crypto';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
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

function toAsciiSafe(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function safeKeySegment(value: string): string {
  return (
    toAsciiSafe(value)
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 220) || 'upload'
  );
}

function safeMetadataValue(value: string): string {
  const ascii = toAsciiSafe(value);
  return /^[\x20-\x7E]*$/.test(ascii) ? ascii : encodeURIComponent(value);
}

export const R2_UPLOAD_PREFIX = 'uploads';

export function buildFlatUploadKey(fileName: string): string {
  return `${R2_UPLOAD_PREFIX}/${randomUUID()}-${safeKeySegment(fileName)}`;
}

/** @deprecated Use buildFlatUploadKey */
export function buildMigratedDriveObjectKey(_driveFileId: string, fileName: string): string {
  return buildFlatUploadKey(fileName);
}

export function isFlatUploadKey(key: string): boolean {
  const prefix = `${R2_UPLOAD_PREFIX}/`;
  if (!key.startsWith(prefix)) return false;
  return !key.slice(prefix.length).includes('/');
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
  const objectKey = buildFlatUploadKey(options.fileName);
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

export async function putR2Object(options: {
  key: string;
  body: PutObjectCommandInput['Body'];
  contentType?: string | null;
  contentLength?: number | null;
  metadata?: Record<string, string | null | undefined>;
}): Promise<void> {
  const r2 = requireR2Config();
  const metadata = Object.fromEntries(
    Object.entries(options.metadata ?? {})
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([key, value]) => [key, safeMetadataValue(value)])
  );

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: r2.bucketName,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType ?? undefined,
      ContentLength: options.contentLength ?? undefined,
      Metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    })
  );
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (body instanceof Uint8Array) return Buffer.from(body);

  const transformBody = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof transformBody.transformToByteArray === 'function') {
    return Buffer.from(await transformBody.transformToByteArray());
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(
      typeof chunk === 'string'
        ? new Uint8Array(Buffer.from(chunk))
        : new Uint8Array(chunk)
    );
  }

  const totalLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const buffer = Buffer.alloc(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
}

export async function fetchR2Object(key: string): Promise<{
  metadata: R2ObjectMetadata;
  buffer: Buffer;
  contentRange: string | null;
  acceptRanges: string | null;
}>;
export async function fetchR2Object(
  key: string,
  options: { range?: string }
): Promise<{
  metadata: R2ObjectMetadata;
  buffer: Buffer;
  contentRange: string | null;
  acceptRanges: string | null;
}>;
export async function fetchR2Object(
  key: string,
  options?: { range?: string }
): Promise<{
  metadata: R2ObjectMetadata;
  buffer: Buffer;
  contentRange: string | null;
  acceptRanges: string | null;
}> {
  const r2 = requireR2Config();
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: r2.bucketName,
      Key: key,
      Range: options?.range,
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
    contentRange: response.ContentRange ?? null,
    acceptRanges: response.AcceptRanges ?? null,
  };
}

function encodeCopySource(bucket: string, key: string): string {
  return encodeURIComponent(`${bucket}/${key}`);
}

export async function copyR2Object(sourceKey: string, destinationKey: string): Promise<void> {
  const r2 = requireR2Config();
  await getR2Client().send(
    new CopyObjectCommand({
      Bucket: r2.bucketName,
      CopySource: encodeCopySource(r2.bucketName, sourceKey),
      Key: destinationKey,
      MetadataDirective: 'COPY',
    })
  );
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
