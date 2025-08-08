import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { Logger } from 'winston';
import { contextLogger, LoggerFactory } from "@repo/logger/src";

function getRequestId(req: FastifyRequest): string {
    const hdr = req.headers['x-request-id'];
    return typeof hdr === 'string' && hdr.length > 0 ? hdr : randomUUID();
}


export async function registerLogger(app: FastifyInstance) {
    const alreadyDecorated = typeof app.hasDecorator === 'function' && app.hasDecorator('log');

    let baseLogger: Logger;
    if (alreadyDecorated) {
        baseLogger = app.log as unknown as Logger;
    } else {
        baseLogger = LoggerFactory.getInstance().createLogger({
            level: process.env.LOG_LEVEL || 'info',
            //@ts-ignore
            environment: process.env.NODE_ENV || 'development',
            service: process.env.SERVICE_NAME || 'backend'
        });
        // @ts-expect-error augment type if needed
        app.decorate('log', baseLogger);
    }

    app.addHook('onRequest', async (req) => {
        const requestId = getRequestId(req);
        await new Promise<void>((resolve) => {
            contextLogger.runWithContext(
                { requestId, metadata: { url: req.url, method: req.method } } as any,
                () => resolve()
            );
        });
        // @ts-ignore
        req.log = contextLogger.getContextualLogger() ?? baseLogger;
    });

    app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
        // @ts-ignore
        req.log?.info?.('request completed', { statusCode: reply.statusCode });
    });

    app.addHook('onError', async (req: FastifyRequest, _reply: FastifyReply, err: Error) => {
        // @ts-ignore
        req.log?.error?.('request failed', { err });
    });
}
