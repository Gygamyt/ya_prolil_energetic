import 'fastify';
import type { Logger } from 'winston';

declare module 'fastify' {
    interface FastifyInstance {
        log: Logger;
    }
    interface FastifyRequest {
        log: Logger;
    }
}
