import type { FastifyRequest } from 'fastify';
import { contextLogger, formatRequest, logger } from '@repo/logger/src';
import { parseUA } from '@app/utils/logging';
import { getRequestId } from '../utils/getRequestId';

export async function onRequestHook(req: FastifyRequest) {
    // @ts-ignore
    req._startTime = process.hrtime.bigint();

    const requestId = getRequestId(req);
    const userId = (req.headers['x-user-id'] as string | undefined) || undefined;
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) || undefined;
    const ip = req.ip;
    const uaParsed = parseUA(req.headers['user-agent']);

    await new Promise<void>((resolve) => {
        contextLogger.runWithContext(
            {
                requestId,
                userId,
                correlationId,
                metadata: {
                    method: req.method,
                    url: req.url,
                    route: req.routeOptions?.url,
                    ip,
                    uaParsed,
                }
            } as any,
            () => resolve()
        );
    });

    // @ts-ignore
    req.log = contextLogger.getContextualLogger() ?? req.server.log;

    // Красивый лог запроса
    logger.info(formatRequest({
        method: req.method,
        url: req.url,
        requestId
    }));

    // @ts-ignore
    req.log?.debug?.('request started');
}
