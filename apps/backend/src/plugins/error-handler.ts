import type { FastifyInstance, FastifyError } from 'fastify';
import fp from 'fastify-plugin';

export async function errorHandlerPlugin(fastify: FastifyInstance) {
    fastify.setErrorHandler(async (error: FastifyError, request, reply) => {
        const { method, url } = request;
        const requestId = request.headers['x-request-id'] || 'unknown';

        if (error.code === 'FST_ERR_SCH_SERIALIZATION_BUILD') {
            const cleanMessage = error.message
                .replace('Failed building the serialization schema for', 'Schema error for')
                .replace(/due to error\s+/, '→ ');

            fastify.log.error({
                error: 'SCHEMA_SERIALIZATION_ERROR',
                method,
                url,
                requestId,
                message: cleanMessage,
                originalError: error.message
            });

            return reply.status(500).send({
                error: 'Schema Validation Error',
                message: 'Response data doesn\'t match expected format',
                details: process.env.NODE_ENV === 'development' ? cleanMessage : undefined,
                requestId,
                timestamp: new Date().toISOString()
            });
        }

        if (error.message?.includes('is required!') || error.stack?.includes('fast-json-stringify')) {
            const fieldMatch = error.message.match(/"([^"]+)" is required!/);
            const missingField = fieldMatch ? fieldMatch[1] : 'unknown field';

            fastify.log.error({
                error: 'DATA_VALIDATION_ERROR',
                method,
                url,
                requestId,
                missingField,
                message: `Missing required field: ${missingField}`
            });

            return reply.status(500).send({
                error: 'Data Validation Error',
                message: `Missing required field in response data: ${missingField}`,
                details: process.env.NODE_ENV === 'development' ? {
                    missingField,
                    suggestion: 'Check database data structure or add field mapping'
                } : undefined,
                requestId,
                timestamp: new Date().toISOString()
            });
        }

        if (error.message?.includes('MongoError') || error.message?.includes('connection')) {
            fastify.log.error({
                error: 'DATABASE_CONNECTION_ERROR',
                method,
                url,
                requestId,
                message: 'Database connection issue'
            });

            return reply.status(503).send({
                error: 'Service Unavailable',
                message: 'Database temporarily unavailable',
                requestId,
                timestamp: new Date().toISOString()
            });
        }

        if (error.name === 'ZodError') {
            const zodError = error as any;
            fastify.log.warn({
                error: 'VALIDATION_ERROR',
                method,
                url,
                requestId,
                issues: zodError.issues
            });

            return reply.status(400).send({
                error: 'Validation Error',
                message: 'Invalid request data',
                details: zodError.issues?.map((issue: any) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                    received: issue.received
                })),
                requestId,
                timestamp: new Date().toISOString()
            });
        }

        fastify.log.error({
            error: 'UNHANDLED_ERROR',
            method,
            url,
            requestId,
            name: error.name,
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });

        const statusCode = error.statusCode || 500;

        return reply.status(statusCode).send({
            error: error.name || 'Internal Server Error',
            message: statusCode >= 500 ? 'Something went wrong on our side' : error.message,
            details: process.env.NODE_ENV === 'development' ? {
                originalMessage: error.message,
                code: error.code
            } : undefined,
            requestId,
            timestamp: new Date().toISOString()
        });
    });
}

export default fp(errorHandlerPlugin, {
    name: 'error-handler'
});
