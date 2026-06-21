export type StorageProvider = 'google_drive' | 'r2';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalPrivateKey(name: string): string | undefined {
  return process.env[name]?.replace(/\\n/g, '\n');
}

function parseStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (!provider) return 'google_drive';
  if (provider === 'google_drive' || provider === 'drive' || provider === 'google') {
    return 'google_drive';
  }
  if (provider === 'r2' || provider === 'cloudflare_r2') {
    return 'r2';
  }
  throw new Error(`Unsupported STORAGE_PROVIDER: ${process.env.STORAGE_PROVIDER}`);
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  storageProvider: parseStorageProvider(),
  googleDrive: {
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    privateKey: optionalPrivateKey('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'),
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL?.replace(/\/+$/, ''),
    uploadUrlExpiresInSeconds: Number(process.env.R2_UPLOAD_URL_EXPIRES_IN_SECONDS ?? 900),
  },
};

export function requireGoogleDriveConfig(): {
  folderId: string;
  clientEmail: string;
  privateKey: string;
} {
  return {
    folderId: requireEnv('GOOGLE_DRIVE_FOLDER_ID'),
    clientEmail: requireEnv('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL'),
    privateKey: requireEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n'),
  };
}

export function requireR2Config(): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
  uploadUrlExpiresInSeconds: number;
} {
  return {
    accountId: requireEnv('R2_ACCOUNT_ID'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucketName: requireEnv('R2_BUCKET_NAME'),
    publicUrl: config.r2.publicUrl,
    uploadUrlExpiresInSeconds: config.r2.uploadUrlExpiresInSeconds,
  };
}
