"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
exports.config = {
    port: Number(process.env.PORT ?? 3001),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    googleDriveFolderId: requireEnv('GOOGLE_DRIVE_FOLDER_ID'),
    googleServiceAccount: {
        clientEmail: requireEnv('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL'),
        privateKey: requireEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n'),
    },
};
