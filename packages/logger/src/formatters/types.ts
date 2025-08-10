export interface RequestLogData {
    method: string;
    url: string;
    requestId?: string;
}

export interface ResponseLogData extends RequestLogData {
    statusCode: number;
    route?: string;
    durationMs?: number;
    contentLength?: number;
}

export interface ErrorLogData extends RequestLogData {
    error: {
        name?: string;
        message?: string;
    };
}
