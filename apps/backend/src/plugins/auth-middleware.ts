import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { logger } from '@repo/logger/src';
import { backEnv } from "@app/utils/backEnv";

const SYNC_API_KEY = backEnv.EMPLOYEE_SYNC_API_KEY;

if (!SYNC_API_KEY) {
    logger.warn('⚠️ EMPLOYEE_SYNC_API_KEY not set in environment variables');
}

async function authMiddleware(fastify: FastifyInstance) {
    fastify.decorate('requireSyncAuth', async (request: FastifyRequest, reply: FastifyReply) => {
        const apiKey = request.headers['x-sync-api-key'] ||
            request.headers['x-api-key'] ||
            request.headers['authorization']?.replace(/^Bearer\s+/i, '');

        if (!apiKey) {
            logger.warn('🔒 Sync endpoint accessed without API key', {
                method: request.method,
                url: request.url,
                ip: request.ip,
                userAgent: request.headers['user-agent']
            });

            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'API key required. Provide it in X-Sync-API-Key, X-API-Key, or Authorization header',
                code: 'MISSING_API_KEY',
                timestamp: new Date().toISOString()
            });
        }

        if (!SYNC_API_KEY) {
            logger.error('💥 EMPLOYEE_SYNC_API_KEY not configured on server');
            return reply.code(500).send({
                error: 'Server Configuration Error',
                message: 'Sync service not properly configured',
                code: 'SYNC_NOT_CONFIGURED',
                timestamp: new Date().toISOString()
            });
        }

        if (apiKey !== SYNC_API_KEY) {
            logger.warn('🚫 Sync endpoint accessed with invalid API key', {
                method: request.method,
                url: request.url,
                ip: request.ip,
                // @ts-ignore
                providedKey: apiKey.substring(0, 8) + '...',
                userAgent: request.headers['user-agent']
            });

            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Invalid API key',
                code: 'INVALID_API_KEY',
                timestamp: new Date().toISOString()
            });
        }

        logger.debug('✅ Sync endpoint authenticated successfully', {
            method: request.method,
            url: request.url,
            ip: request.ip
        });
    });
}

export default fp(authMiddleware, {
    name: 'auth-middleware'
});
