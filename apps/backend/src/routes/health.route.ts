import type { FastifyPluginAsync } from 'fastify';

export const healthRoute: FastifyPluginAsync = async (app) => {
    app.get(
        '/live',
        {
            schema: {
                response: { 200: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } },
                tags: ['health'],
                summary: 'Liveness probe'
            }
        },
        async () => ({ status: 'ok' })
    );

    app.get(
        '/ready',
        {
            schema: {
                response: { 200: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } },
                tags: ['health'],
                summary: 'Readiness probe'
            }
        },
        async () => ({ status: 'ok' })
    );
};
