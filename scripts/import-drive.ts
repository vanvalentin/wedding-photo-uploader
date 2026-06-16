/**
 * One-time CLI import: register all photos/videos in GOOGLE_DRIVE_FOLDER_ID into Supabase.
 *
 * Prerequisites:
 *   - .env with service account vars, GOOGLE_DRIVE_FOLDER_ID, SUPABASE_URL, SUPABASE_SECRET_KEY
 *   - Service account is Content manager on the Shared Drive
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
    '\nCheck that GOOGLE_DRIVE_FOLDER_ID is inside a Shared Drive and the service account is a member.\n'
  );
  process.exit(1);
}
