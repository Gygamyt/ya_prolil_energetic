import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { openApiConfig } from '../config/openapi.js';

export async function registerSwagger(app: FastifyInstance) {
    await app.register(swagger, openApiConfig);
    await app.register(swaggerUI, {
        routePrefix: '/docs',
        staticCSP: true
    });
}
