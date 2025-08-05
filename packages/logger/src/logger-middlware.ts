import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { contextLogger, LoggerContext } from "./logger-context.ts";

export interface LoggerMiddlewareOptions {
    generateRequestId?: () => string;
    extractUserId?: (req: Request) => string | undefined;
    extractTraceId?: (req: Request) => string | undefined;
    logRequests?: boolean;
    logResponses?: boolean;
}

export function createLoggerMiddleware(options: LoggerMiddlewareOptions = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
        const context: LoggerContext = {
            requestId: options.generateRequestId?.() || uuidv4(),
            userId: options.extractUserId?.(req),
            traceId: options.extractTraceId?.(req) || req.headers['x-trace-id'] as string,
            correlationId: req.headers['x-correlation-id'] as string || uuidv4(),
            metadata: {
                method: req.method,
                url: req.url,
                userAgent: req.headers['user-agent'],
                ip: req.ip
            }
        };

        contextLogger.runWithContext(context, () => {
            const logger = contextLogger.getContextualLogger();

            if (options.logRequests) {
                logger.info({
                    req: {
                        method: req.method,
                        url: req.url,
                        headers: req.headers
                    }
                }, 'Incoming request');
            }

            const startTime = process.hrtime.bigint();

            res.on('finish', () => {
                const duration = Number(process.hrtime.bigint() - startTime) / 1000000;

                if (options.logResponses) {
                    logger.info({
                        res: {
                            statusCode: res.statusCode,
                            headers: res.getHeaders()
                        },
                        duration
                    }, 'Request completed');
                }
            });

            next();
        });
    };
}
