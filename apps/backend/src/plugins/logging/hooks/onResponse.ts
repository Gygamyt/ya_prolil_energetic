import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatResponse } from '@repo/logger/src';
import { parseUA } from '@app/utils/logging';

export async function onResponseHook(req: FastifyRequest, reply: FastifyReply) {
    // @ts-ignore
    const start = req._startTime as bigint | undefined;
    const durationMs = start ? Number((process.hrtime.bigint() - start) / 1_000_000n) : undefined;
    const contentLength = reply.getHeader('content-length');

    const info = {
        statusCode: reply.statusCode,
        method: req.method,
        url: req.url,
        route: req.routeOptions?.url,
        durationMs,
        contentLength: typeof contentLength === 'string' ? Number(contentLength) : contentLength,
        ip: req.ip,
        ua: parseUA(req.headers['user-agent']),
    };

    // @ts-ignore
    const reqId = (req.log?.get?.('requestId')) || reply.getHeader('x-request-id');

    // Красивый лог ответа
    const prettyMsg = formatResponse({
        statusCode: info.statusCode,
        method: info.method,
        route: info.route,
        url: info.url,
        durationMs: info.durationMs,
        contentLength: info.contentLength as number,
        requestId: reqId?.toString(),
    });

    // @ts-ignore
    req.log?.info?.(prettyMsg, info);
}
