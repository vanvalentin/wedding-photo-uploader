export type UploadInitSuccess = {
    ok: true;
    sessionUri: string;
    fileName: string;
};
export type UploadInitError = {
    ok: false;
    status: number;
    error: string;
    message?: string;
    details?: Record<string, string[] | undefined>;
};
export declare function processUploadInit(body: unknown): Promise<UploadInitSuccess | UploadInitError>;
