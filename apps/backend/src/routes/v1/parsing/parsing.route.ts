import type { FastifyPluginAsync } from 'fastify';
import {
    ParseSalesforceJsonSchema,
    ParseConfigJsonSchema
} from './parsing.schemas';
import {
    parseSalesforceHandler,
    getParsingConfigHandler,
    getParsingHealthHandler
} from './parsing.controller';

export const parsingRoute: FastifyPluginAsync = async (app) => {

    // POST /parsing/salesforce
    app.post('/salesforce', {
        schema: {
            body: ParseSalesforceJsonSchema,
            response: {
                200: {
                    description: 'Successfully parsed Salesforce request',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                parseResult: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        confidence: { type: 'number' },
                                        strategy: { type: 'string' },
                                        extractedFields: {
                                            type: 'array',
                                            items: { type: 'string' }
                                        },
                                        data: {
                                            type: 'object',
                                            // 🔧 FIX: Не детализируем внутреннюю структуру data
                                            additionalProperties: true
                                        },
                                        error: { type: 'string' }
                                    },
                                    additionalProperties: true
                                },
                                metadata: {
                                    type: 'object',
                                    properties: {
                                        parseTime: { type: 'number' },
                                        inputLength: { type: 'number' },
                                        timestamp: { type: 'string', format: 'date-time' },
                                        config: {
                                            type: 'object',
                                            additionalProperties: true
                                        }
                                    },
                                    additionalProperties: true
                                }
                            },
                            additionalProperties: true
                        }
                    },
                    additionalProperties: true
                },
                400: {
                    description: 'Validation failed',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', enum: [false] },
                        error: { type: 'string' },
                        details: {
                            type: 'array',
                            items: {
                                type: 'object',
                                additionalProperties: true
                            }
                        }
                    }
                },
                500: {
                    description: 'Internal server error',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', enum: [false] },
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            },
            tags: ['parsing'],
            summary: 'Parse Salesforce request',
            description: 'Parse structured Salesforce request using StandardParser with confidence scoring'
        }
    }, async (req, reply) => {
        try {
            const data = await parseSalesforceHandler(req.body);

            return reply.code(200).send({
                success: true,
                data
            });

        } catch (error) {
            if (error instanceof Error && error.name === 'ZodError') {
                return reply.code(400).send({
                    success: false,
                    error: 'Validation failed',
                    details: (error as any).errors
                });
            }

            // @ts-ignore
            app.log.error('Parsing error:', error);
            return reply.code(500).send({
                success: false,
                error: 'Internal parsing error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // GET /parsing/config
    app.get('/config', {
        schema: {
            querystring: ParseConfigJsonSchema,
            response: {
                200: {
                    description: 'Parser configuration and supported options',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        defaultConfig: {
                            type: 'object',
                            properties: {
                                confidenceThreshold: { type: 'number' },
                                aiProvider: { type: 'string' },
                                fallbackStrategy: { type: 'string' },
                                enableCaching: { type: 'boolean' }
                            },
                            additionalProperties: true
                        },
                        supportedOptions: {
                            type: 'object',
                            additionalProperties: true
                        }
                    }
                }
            },
            tags: ['parsing'],
            summary: 'Get parsing configuration',
            description: 'Retrieve default configuration and supported options'
        }
    }, async (req, reply) => {
        try {
            const config = await getParsingConfigHandler(req.query);

            return reply.code(200).send({
                success: true,
                ...config
            });

        } catch (error) {
            return reply.code(400).send({
                success: false,
                error: error instanceof Error ? error.message : 'Configuration error'
            });
        }
    });

    // GET /parsing/health
    app.get('/health', {
        schema: {
            response: {
                200: {
                    description: 'Service health check',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        service: { type: 'string' },
                        status: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        config: {
                            type: 'object',
                            properties: {
                                confidenceThreshold: { type: 'number' },
                                aiProvider: { type: 'string' }
                            },
                            additionalProperties: true
                        }
                    }
                }
            },
            tags: ['parsing'],
            summary: 'Parser health check',
            description: 'Check parser service health and current configuration'
        }
    }, async (req, reply) => {
        try {
            const health = await getParsingHealthHandler();

            return reply.code(200).send({
                success: true,
                ...health
            });

        } catch (error) {
            return reply.code(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Health check failed'
            });
        }
    });
};
