import chalk from 'chalk';
import type { RequestLogData, ResponseLogData, ErrorLogData } from './types';

export function formatRequest({ method, url, requestId }: RequestLogData): string {
    const methodColor = {
        GET: chalk.green,
        POST: chalk.blue,
        PUT: chalk.yellow,
        DELETE: chalk.red,
        PATCH: chalk.magenta,
    }[method] || chalk.white;

    const reqId = requestId ? chalk.gray(`[${requestId.slice(0, 8)}]`) : '';
    return `🚀 ${methodColor(method)} ${url} ${reqId}`.trim();
}

export function formatResponse({
                                   statusCode, method, route, url, durationMs, contentLength, requestId
                               }: ResponseLogData): string {
    const statusColor = statusCode >= 500 ? chalk.red
        : statusCode >= 400 ? chalk.yellow
            : statusCode >= 300 ? chalk.cyan
                : chalk.green;

    const emoji = statusCode >= 500 ? '💥'
        : statusCode >= 400 ? '⚠️'
            : statusCode >= 300 ? '↩️'
                : '✅ ';

    const duration = durationMs ? chalk.gray(`${durationMs}ms`) : chalk.gray('-ms');
    const size = contentLength ? chalk.gray(`${formatBytes(contentLength)}`) : '';
    const reqId = requestId ? chalk.gray(`[${requestId.slice(0, 8)}]`) : '';

    return `${emoji} ${statusColor(statusCode)} ${method} ${route || url} ${duration} ${size} ${reqId}`.trim();
}

export function formatError({ method, url, error, requestId }: ErrorLogData): string {
    const reqId = requestId ? chalk.gray(`[${requestId.slice(0, 8)}]`) : '';

    let emoji = '💀';
    let errorType = 'ERROR';

    if (error.message?.includes('required!')) {
        emoji = '📋';
        errorType = 'VALIDATION';
    } else if (error.message?.includes('Schema')) {
        emoji = '🔧';
        errorType = 'SCHEMA';
    } else if (error.message?.includes('connection') || error.message?.includes('MongoDB')) {
        emoji = '🔌';
        errorType = 'DATABASE';
    }

    const message = error.message || 'Unknown error';
    const truncatedMessage = message.length > 100 ?
        message.substring(0, 100) + '...' :
        message;

    return `${emoji} ${chalk.red(errorType)} ${method} ${url} ${chalk.red(truncatedMessage)} ${reqId}`.trim();
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
}
