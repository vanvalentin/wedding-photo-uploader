/**
 * One-time CLI import: register all photos/videos in GOOGLE_DRIVE_FOLDER_ID into Supabase.
 *
 * Prerequisites:
 *   - .env with Google OAuth, GOOGLE_DRIVE_FOLDER_ID, SUPABASE_URL, SUPABASE_SECRET_KEY
 *   - OAuth refresh token must include drive.readonly (re-run npm run get-refresh-token if import fails)
 *
 * Usage:
 *   npm run import-drive
 */

import 'dotenv/config';
import { importDriveFolderToRegistry } from '../lib/driveImport.js';

try {
  const result = await importDriveFolderToRegistry();
  console.log('\nDrive import complete:');
  console.log(`  Total in folder:    ${result.totalInDrive}`);
  console.log(`  Newly imported:     ${result.imported}`);
  console.log(`  Already registered: ${result.skipped}\n`);
} catch (error) {
  console.error('\nImport failed:', error instanceof Error ? error.message : error);
  console.error(
    '\nIf you see a 403 or "insufficient permissions", re-authorize Google with drive.readonly:\n' +
      '  npm run get-refresh-token\n'
  );
  process.exit(1);
}
