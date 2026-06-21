/**
 * One-time/re-runnable CLI: generate small R2 thumbnail objects for existing
 * R2 uploads and update Supabase metadata.
 *
 * Prerequisites:
 *   - .env with R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *   - .env with SUPABASE_URL and SUPABASE_SECRET_KEY
 *   - Local ffmpeg on PATH for video thumbnails (or pass --skip-videos)
 *
 * Usage:
 *   npm run backfill-r2-thumbnails -- --dry-run --limit 5
 *   npm run backfill-r2-thumbnails
 */

import 'dotenv/config';
import {
  backfillR2Thumbnails,
  type R2ThumbnailBackfillOptions,
} from '../lib/r2ThumbnailBackfill.js';

function readFlagValue(args: string[], name: string): string | null {
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  if (prefixed) return prefixed.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] ?? null;

  return null;
}

function parsePositiveInteger(value: string | null, name: string): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function printHelp(): void {
  console.log(`
Generate R2 thumbnail objects for existing uploads.

Usage:
  npm run backfill-r2-thumbnails -- [options]

Options:
  --dry-run       Print planned thumbnails without downloading or updating Supabase
  --limit <n>     Maximum number of rows to process
  --skip-videos   Only backfill photo thumbnails; video thumbnails require ffmpeg
  --help          Show this help

Recommended first run:
  npm run backfill-r2-thumbnails -- --dry-run --limit 5
`);
}

function parseOptions(args: string[]): R2ThumbnailBackfillOptions {
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  return {
    dryRun: args.includes('--dry-run'),
    limit: parsePositiveInteger(readFlagValue(args, '--limit'), '--limit'),
    includeVideos: !args.includes('--skip-videos'),
  };
}

const options = parseOptions(process.argv.slice(2));

try {
  const result = await backfillR2Thumbnails({
    ...options,
    onProgress(event) {
      if (event.type === 'dry-run') {
        console.log(`[dry-run] ${event.storageKey} -> ${event.thumbnailKey}`);
        return;
      }

      if (event.type === 'thumbnail-start') {
        console.log(`[thumb] ${event.storageKey} -> ${event.thumbnailKey}`);
        return;
      }

      if (event.type === 'thumbnail-complete') {
        console.log(`[ok] ${event.thumbnailKey} (${event.fileSize} bytes)`);
        return;
      }

      if (event.type === 'skip-video') {
        console.log(`[skip] video: ${event.storageKey}`);
        return;
      }

      console.error(`[error] ${event.storageKey}: ${event.message}`);
    },
  });

  console.log('\nR2 thumbnail backfill complete:');
  console.log(`  Dry run:        ${result.dryRun ? 'yes' : 'no'}`);
  console.log(`  Scanned:        ${result.scanned}`);
  console.log(`  Generated:      ${result.generated}`);
  console.log(`  Skipped videos: ${result.skippedVideos}`);
  console.log(`  Failed:         ${result.failed}\n`);

  if (result.failed > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error('\nThumbnail backfill failed:', error instanceof Error ? error.message : error);
  console.error(
    '\nCheck R2 and Supabase environment variables. For video thumbnails, install ffmpeg or rerun with --skip-videos.\n'
  );
  process.exit(1);
}
