import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatError } from '@repo/logger/src';

export async function onErrorHook(req: FastifyRequest, _reply: FastifyReply, err: any) {
    const requestWithError = {
        body: req.body,
        headers: req.headers,
        url: req.url,
        method: req.method,
    };

    const errInfo = {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        request: requestWithError,
    };

    // @ts-ignore
    const requestId = req.log?.get?.('requestId');

    const prettyError = formatError({
        method: req.method,
        url: req.url,
        error: {
            name: err?.name,
            message: err?.message
        },
        requestId: requestId?.toString()
    });

    // @ts-ignore
    req.log?.error?.(prettyError, errInfo);
}
