import type { FastifyRequest } from 'fastify';
import { contextLogger, formatRequest, logger } from '@repo/logger/src';
import { parseUA } from '@app/utils/logging';
import { getRequestId } from '../utils/getRequestId';

export async function onRequestHook(request: FastifyRequest) {
    // @ts-ignore
    request._startTime = process.hrtime.bigint();

    const requestId = getRequestId(request);
    const userId = (request.headers['x-user-id'] as string | undefined) || undefined;
    const correlationId = (request.headers['x-correlation-id'] as string | undefined) || undefined;
    const ip = request.ip;
    const uaParsed = parseUA(request.headers['user-agent']);

    await new Promise<void>((resolve) => {
        contextLogger.runWithContext(
            {
                requestId,
                userId,
                correlationId,
                metadata: {
                    method: request.method,
                    url: request.url,
                    route: request.routeOptions?.url,
                    ip,
                    uaParsed,
                }
            } as any,
            () => resolve()
        );
    });

    // @ts-ignore
    request.log = contextLogger.getContextualLogger() ?? request.server.log;

    logger.info(formatRequest({
        method: request.method,
        url: request.url,
        requestId
    }));

    request.log?.debug?.('request started');
}
