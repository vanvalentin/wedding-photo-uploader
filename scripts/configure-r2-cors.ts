/**
 * Configure Cloudflare R2 bucket CORS for browser-direct uploads.
 *
 * Prerequisites:
 *   - .env or .env.local with R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *
 * Usage:
 *   npm run configure-r2-cors
 *   npm run configure-r2-cors -- --origin https://photos.winivalentin.us --origin http://localhost:5173
 */

import './loadEnv.js';
import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';
import { requireR2Config } from '../lib/config.js';

const DEFAULT_ORIGINS = ['https://photos.winivalentin.us', 'http://localhost:5173'];

function readOrigins(args: string[]): string[] {
  const origins: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--origin') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--origin requires a value');
      }
      origins.push(value);
      index += 1;
      continue;
    }

    if (arg.startsWith('--origin=')) {
      origins.push(arg.slice('--origin='.length));
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return origins.length > 0 ? origins : DEFAULT_ORIGINS;
}

function printHelp(): void {
  console.log(`
Configure Cloudflare R2 CORS for browser-direct uploads.

Usage:
  npm run configure-r2-cors -- [options]

Options:
  --origin <url>  Allowed website origin. Repeat for multiple origins.
  --help          Show this help.

Default origins:
  ${DEFAULT_ORIGINS.join('\n  ')}
`);
}

async function main(): Promise<void> {
  const origins = readOrigins(process.argv.slice(2));
  const r2 = requireR2Config();
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
    },
  });

  await client.send(
    new PutBucketCorsCommand({
      Bucket: r2.bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ['PUT', 'GET', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );

  console.log(`Configured CORS for R2 bucket "${r2.bucketName}"`);
  console.log(`Allowed origins: ${origins.join(', ')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
