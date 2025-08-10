import type { FastifyPluginAsync } from 'fastify';
import { getCollections } from "@repo/database/src/collections/collections";
import { MongoDBClient } from "@repo/database/src/client";

export const healthRoute: FastifyPluginAsync = async (app) => {
    app.get(
        '/live',
        {
            schema: {
                response: { 200: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } },
                tags: ['Health'],
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
                tags: ['Health'],
                summary: 'Readiness probe'
            }
        },
        async () => ({ status: 'ok' })
    );

    app.get('/db',
        {
            schema: {
                tags: ['MongoDB']
            }
        },
        async () => {
            const db = await MongoDBClient.connect();
            const { rawData, employees } = getCollections(db);
            const [rawCount, cleanCount] = await Promise.all([
                rawData.countDocuments().catch(() => -1),
                employees.countDocuments().catch(() => -1)
            ]);
            return { rawCount, cleanCount };
        });

    app.get('/health/db/ready', {
            schema: {
                tags: ['MongoDB']
            }
        },
        async () => {
            try {
                const db = await MongoDBClient.connect();
                await db.command({ ping: 1 });
                return { status: 'ok' };
            } catch {
                return { status: 'degraded' };
            }
        });
};
