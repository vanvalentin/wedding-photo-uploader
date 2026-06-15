function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export type GoogleAuthMode = 'oauth' | 'service_account';

function resolveAuthMode(): GoogleAuthMode {
  if (process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    return 'oauth';
  }
  if (
    process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  ) {
    return 'service_account';
  }
  throw new Error(
    'Missing Google credentials. Set OAuth vars (recommended for personal Drive) or service account vars (Shared Drives only). See README.'
  );
}

const authMode = resolveAuthMode();

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  googleDriveFolderId: requireEnv('GOOGLE_DRIVE_FOLDER_ID'),
  googleAuthMode: authMode,
  googleOAuth:
    authMode === 'oauth'
      ? {
          clientId: requireEnv('GOOGLE_OAUTH_CLIENT_ID'),
          clientSecret: requireEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
          refreshToken: requireEnv('GOOGLE_OAUTH_REFRESH_TOKEN'),
        }
      : null,
  googleServiceAccount:
    authMode === 'service_account'
      ? {
          clientEmail: requireEnv('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL'),
          privateKey: requireEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n'),
        }
      : null,
};
