import 'fastify';
import type { Logger } from 'winston';

declare module 'fastify' {
    interface FastifyInstance {
        log: Logger;
    }

    interface FastifyRequest {
        log: Logger;
    }

    interface FastifyInstance {
        requireSyncAuth: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
    }
}
