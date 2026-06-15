export declare function getAccessToken(): Promise<string>;
export interface ResumableSessionOptions {
    fileName: string;
    mimeType: string;
    fileSize: number;
    guestName?: string;
}
export interface ResumableSessionResult {
    sessionUri: string;
    fileName: string;
}
/**
 * Initiates a Google Drive resumable upload session.
 * Returns the session URI for the frontend to upload chunks directly.
 */
export declare function createResumableUploadSession(options: ResumableSessionOptions): Promise<ResumableSessionResult>;
