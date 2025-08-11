import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

import type { OpenAPIV3 } from 'openapi-types';
import { openApiConfig } from "@app/config/openapi";

export async function registerSwagger(app: FastifyInstance) {
    // ✅ Правильно типизированные security schemes
    const securitySchemes: Record<string, OpenAPIV3.SecuritySchemeObject> = {
        SyncApiKey: {
            type: 'apiKey',
            name: 'X-Sync-API-Key',
            in: 'header',
            description: 'API key for employee sync operations'
        } as OpenAPIV3.ApiKeySecurityScheme,

        ApiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'Alternative API key header'
        } as OpenAPIV3.ApiKeySecurityScheme,

        BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'Bearer token authentication'
        } as OpenAPIV3.HttpSecurityScheme
    };

    const enhancedOpenApiConfig = {
        openapi: {
            ...openApiConfig.openapi,
            components: {
                securitySchemes
            },
            security: [] as OpenAPIV3.SecurityRequirementObject[]
        }
    };

    await app.register(swagger, enhancedOpenApiConfig);

    await app.register(swaggerUI, {
        routePrefix: '/docs',
        staticCSP: true,
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false,
            displayOperationId: false,
            defaultModelsExpandDepth: 1,
            defaultModelExpandDepth: 1,
            displayRequestDuration: true,
            persistAuthorization: true
        },
        transformStaticCSP: (header) => header
    });
}
