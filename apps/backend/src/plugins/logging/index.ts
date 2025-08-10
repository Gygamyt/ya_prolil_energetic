import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { type loggerEnv, LoggerFactory } from '@repo/logger/src';
import { onRequestHook } from './hooks/onRequest';
import { onResponseHook } from './hooks/onResponse';
import { onErrorHook } from './hooks/onError';

async function loggerPlugin(app: FastifyInstance) {
    const baseLogger = LoggerFactory.getInstance().createLogger({
        level: process.env.LOG_LEVEL || 'info',
        environment: process.env.NODE_ENV as loggerEnv || 'development',
        service: process.env.SERVICE_NAME || 'backend'
    });


    if (!app.hasDecorator?.('log')) {
        // @ts-ignore
        app.decorate('log', baseLogger);
    }

    app.addHook('onRequest', onRequestHook);
    app.addHook('onResponse', onResponseHook);
    app.addHook('onError', onErrorHook);
}

export default fp(loggerPlugin, {
    name: 'logger-plugin',
});

export { loggerPlugin };
