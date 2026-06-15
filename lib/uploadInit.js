"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processUploadInit = processUploadInit;
const zod_1 = require("zod");
const googleDrive_js_1 = require("./googleDrive.js");
const initUploadSchema = zod_1.z.object({
    fileName: zod_1.z.string().min(1).max(500),
    mimeType: zod_1.z.string().min(1).max(200),
    fileSize: zod_1.z.number().int().positive().max(5 * 1024 * 1024 * 1024),
    guestName: zod_1.z.string().max(100).optional(),
});
function sanitizeGuestName(name) {
    return name
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50);
}
function buildFileName(originalName, guestName) {
    const lastDot = originalName.lastIndexOf('.');
    const base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
    const ext = lastDot > 0 ? originalName.slice(lastDot) : '';
    const sanitizedBase = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 200);
    if (guestName?.trim()) {
        const sanitizedGuest = sanitizeGuestName(guestName);
        if (sanitizedGuest) {
            return `${sanitizedGuest}_${sanitizedBase}${ext}`;
        }
    }
    return `${sanitizedBase}${ext}`;
}
async function processUploadInit(body) {
    const parsed = initUploadSchema.safeParse(body);
    if (!parsed.success) {
        return {
            ok: false,
            status: 400,
            error: 'Invalid request',
            details: parsed.error.flatten().fieldErrors,
        };
    }
    const { fileName, mimeType, fileSize, guestName } = parsed.data;
    const finalFileName = buildFileName(fileName, guestName);
    try {
        const session = await (0, googleDrive_js_1.createResumableUploadSession)({
            fileName: finalFileName,
            mimeType,
            fileSize,
            guestName,
        });
        return {
            ok: true,
            sessionUri: session.sessionUri,
            fileName: session.fileName,
        };
    }
    catch (error) {
        console.error('Upload init error:', error);
        return {
            ok: false,
            status: 500,
            error: 'Failed to initiate upload session',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
