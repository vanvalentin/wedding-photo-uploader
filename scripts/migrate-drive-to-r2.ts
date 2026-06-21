/**
 * One-time CLI migration: copy registered Google Drive uploads into R2 and
 * update Supabase storage metadata.
 *
 * Prerequisites:
 *   - .env with Google Drive service account vars
 *   - .env with R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *   - .env with SUPABASE_URL and SUPABASE_SECRET_KEY
 *   - Supabase migration adding storage_provider/storage_key has been applied
 *
 * Usage:
 *   npm run migrate-drive-to-r2 -- --dry-run --limit 5
 *   npm run migrate-drive-to-r2
 */

import './loadEnv.js';
import {
  migrateDriveUploadsToR2,
  type DriveToR2MigrationOptions,
} from '../lib/driveToR2Migration.js';

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
Copy registered Google Drive uploads to Cloudflare R2.

Usage:
  npm run migrate-drive-to-r2 -- [options]

Options:
  --dry-run             Print planned copies without downloading or updating Supabase
  --limit <number>      Maximum number of Drive rows to process
  --batch-size <number> Number of rows to fetch per batch (default: 25)
  --help                Show this help

Recommended first run:
  npm run migrate-drive-to-r2 -- --dry-run --limit 5
`);
}

function parseOptions(args: string[]): DriveToR2MigrationOptions {
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  return {
    dryRun: args.includes('--dry-run'),
    limit: parsePositiveInteger(readFlagValue(args, '--limit'), '--limit'),
    batchSize: parsePositiveInteger(readFlagValue(args, '--batch-size'), '--batch-size'),
  };
}

const options = parseOptions(process.argv.slice(2));

try {
  const result = await migrateDriveUploadsToR2({
    ...options,
    onProgress(event) {
      if (event.type === 'dry-run') {
        console.log(`[dry-run] ${event.driveFileId} -> ${event.storageKey}`);
        return;
      }

      if (event.type === 'copy-start') {
        console.log(`[copy] ${event.fileName} -> ${event.storageKey}`);
        return;
      }

      if (event.type === 'copy-complete') {
        const action = event.alreadyInR2 ? 'already in R2, updated DB' : 'copied and updated DB';
        console.log(`[ok] ${event.fileName}: ${action}`);
        return;
      }

      if (event.type === 'skip-r2') {
        console.log(`[skip] already R2: ${event.storageKey}`);
        return;
      }

      console.error(`[error] ${event.fileName} (${event.driveFileId}): ${event.message}`);
    },
  });

  console.log('\nDrive to R2 migration complete:');
  console.log(`  Dry run:              ${result.dryRun ? 'yes' : 'no'}`);
  console.log(`  Processed:            ${result.processed}`);
  console.log(`  Copied to R2:         ${result.copied}`);
  console.log(`  Already in R2:        ${result.alreadyInR2}`);
  console.log(`  Media rows updated:   ${result.updatedMediaRows}`);
  console.log(`  Curated rows updated: ${result.updatedCuratedRows}`);
  console.log(`  Failed:               ${result.failed}\n`);

  if (result.failed > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error('\nMigration failed:', error instanceof Error ? error.message : error);
  console.error(
    '\nCheck Google Drive, R2, and Supabase environment variables, then rerun. The script is safe to rerun.\n'
  );
  process.exit(1);
}
