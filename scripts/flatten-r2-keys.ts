/**
 * One-time CLI: move nested R2 object keys into a flat uploads/ folder and
 * update Supabase storage_key values in media_uploads + curated_gallery.
 *
 * Prerequisites:
 *   - .env with R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *   - .env with SUPABASE_URL and SUPABASE_SECRET_KEY
 *
 * Usage:
 *   npm run flatten-r2-keys -- --dry-run --limit 5
 *   npm run flatten-r2-keys
 */

import 'dotenv/config';
import {
  flattenR2UploadKeys,
  type FlattenR2KeysOptions,
} from '../lib/flattenR2Keys.js';

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
Move nested R2 object keys into a flat uploads/ folder and update Supabase.

Usage:
  npm run flatten-r2-keys -- [options]

Options:
  --dry-run             Print planned moves without copying or updating Supabase
  --limit <number>      Maximum number of R2 rows to scan
  --batch-size <number> Number of rows to fetch per batch (default: 25)
  --keep-old            Keep old R2 objects after copying (default: delete old keys)
  --help                Show this help

Recommended first run:
  npm run flatten-r2-keys -- --dry-run --limit 5
`);
}

function parseOptions(args: string[]): FlattenR2KeysOptions {
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  return {
    dryRun: args.includes('--dry-run'),
    keepOldObjects: args.includes('--keep-old'),
    limit: parsePositiveInteger(readFlagValue(args, '--limit'), '--limit'),
    batchSize: parsePositiveInteger(readFlagValue(args, '--batch-size'), '--batch-size'),
  };
}

const options = parseOptions(process.argv.slice(2));

try {
  const result = await flattenR2UploadKeys({
    ...options,
    onProgress(event) {
      if (event.type === 'skip-flat') {
        console.log(`[skip] already flat: ${event.storageKey}`);
        return;
      }

      if (event.type === 'dry-run') {
        console.log(`[dry-run] ${event.oldKey} -> ${event.newKey}`);
        return;
      }

      if (event.type === 'move-start') {
        console.log(`[move] ${event.fileName}: ${event.oldKey} -> ${event.newKey}`);
        return;
      }

      if (event.type === 'move-complete') {
        const cleanup = event.deletedOld ? 'deleted old object' : 'kept old object';
        console.log(`[ok] ${event.fileName}: ${cleanup}`);
        return;
      }

      console.error(`[error] ${event.fileName} (${event.oldKey}): ${event.message}`);
    },
  });

  console.log('\nFlatten R2 keys complete:');
  console.log(`  Dry run:              ${result.dryRun ? 'yes' : 'no'}`);
  console.log(`  Scanned:              ${result.scanned}`);
  console.log(`  Already flat:         ${result.skippedFlat}`);
  console.log(`  Flattened:            ${result.flattened}`);
  console.log(`  Media rows updated:   ${result.updatedMediaRows}`);
  console.log(`  Curated rows updated: ${result.updatedCuratedRows}`);
  console.log(`  Old objects deleted:  ${result.deletedOldObjects}`);
  console.log(`  Failed:               ${result.failed}\n`);

  if (result.failed > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error('\nFlatten failed:', error instanceof Error ? error.message : error);
  console.error(
    '\nCheck R2 and Supabase environment variables, then rerun. The script is safe to rerun.\n'
  );
  process.exit(1);
}
