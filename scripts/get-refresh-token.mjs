#!/usr/bin/env node
/**
 * One-time script to obtain a Google OAuth refresh token for your personal Drive.
 *
 * Usage:
 *   1. Create an OAuth 2.0 Client ID (Desktop app) in Google Cloud Console
 *   2. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env
 *   3. Run: node scripts/get-refresh-token.mjs
 *   4. Open the URL, sign in with the Google account that OWNS the Drive folder
 *   5. Paste the authorization code — copy the refresh token to Vercel / .env
 */

import 'dotenv/config';
import { createInterface } from 'readline/promises';
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env first.\n' +
      'Create credentials at: Google Cloud Console → APIs & Services → Credentials → OAuth client ID → Desktop app'
  );
  process.exit(1);
}

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('\n1. Open this URL in your browser and sign in with the Google account that owns your Drive folder:\n');
console.log(authUrl);
console.log('\n2. After approving, you will be redirected to localhost (it may fail to load — that is OK).');
console.log('   Copy the "code" parameter from the redirect URL in your browser address bar.\n');

const rl = createInterface({ input: process.stdin, output: process.stdout });
const code = await rl.question('Paste the authorization code here: ');
rl.close();

const { tokens } = await oauth2Client.getToken(code.trim());

if (!tokens.refresh_token) {
  console.error(
    '\nNo refresh token received. Revoke app access at https://myaccount.google.com/permissions and run again with prompt=consent.'
  );
  process.exit(1);
}

console.log('\n✓ Success! Add these to your .env and Vercel environment variables:\n');
console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
console.log('\nAlso set GOOGLE_DRIVE_FOLDER_ID to your target folder.');
console.log('You can remove GOOGLE_SERVICE_ACCOUNT_* variables — they are not needed for personal Drive.\n');
