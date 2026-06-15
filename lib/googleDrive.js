"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccessToken = getAccessToken;
exports.createResumableUploadSession = createResumableUploadSession;
const google_auth_library_1 = require("google-auth-library");
const config_js_1 = require("./config.js");
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
let authClient = null;
function getAuthClient() {
    if (!authClient) {
        authClient = new google_auth_library_1.JWT({
            email: config_js_1.config.googleServiceAccount.clientEmail,
            key: config_js_1.config.googleServiceAccount.privateKey,
            scopes: [DRIVE_SCOPE],
        });
    }
    return authClient;
}
async function getAccessToken() {
    const client = getAuthClient();
    const { token } = await client.getAccessToken();
    if (!token) {
        throw new Error('Failed to obtain Google access token');
    }
    return token;
}
/**
 * Initiates a Google Drive resumable upload session.
 * Returns the session URI for the frontend to upload chunks directly.
 */
async function createResumableUploadSession(options) {
    const { fileName, mimeType, fileSize, guestName } = options;
    const accessToken = await getAccessToken();
    const metadata = {
        name: fileName,
        parents: [config_js_1.config.googleDriveFolderId],
    };
    if (guestName?.trim()) {
        metadata.description = `Uploaded by ${guestName.trim()}`;
    }
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': mimeType,
            'X-Upload-Content-Length': String(fileSize),
        },
        body: JSON.stringify(metadata),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to initiate resumable upload (${response.status}): ${errorBody}`);
    }
    const sessionUri = response.headers.get('Location');
    if (!sessionUri) {
        throw new Error('Google Drive did not return a resumable session URI');
    }
    return { sessionUri, fileName };
}
