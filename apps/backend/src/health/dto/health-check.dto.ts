export class HealthCheckDto {
    status: 'ok' | 'error';
    info?: Record<string, { status: string }>;
    error?: Record<string, { status: string }>;
    details: Record<string, { status: string }>;
}
