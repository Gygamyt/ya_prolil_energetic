import type { FastifyPluginAsync } from 'fastify';
import { EmployeeSyncService } from '@app/services/employee-sync.service';
import { logger } from '@repo/logger/src';

interface SyncQuerystring {
    detailed?: boolean;
}

interface PopulateQuerystring {
    force?: boolean;
}

export const syncRoute: FastifyPluginAsync = async (app) => {
    const syncService = new EmployeeSyncService();

    // POST /sync/employees - main sync endpoint
    app.post<{
        Querystring: SyncQuerystring;
    }>('/employees', {
        preHandler: (app as any).requireSyncAuth,
        schema: {
            headers: {
                type: 'object',
                properties: {
                    'x-sync-api-key': {
                        type: 'string',
                        description: 'API key for sync operations'
                    },
                    'x-api-key': {
                        type: 'string',
                        description: 'Alternative API key header'
                    },
                    'authorization': {
                        type: 'string',
                        description: 'Bearer token format'
                    }
                }
            },
            querystring: {
                type: 'object',
                properties: {
                    detailed: {
                        type: 'boolean',
                        default: false,
                        description: 'Use detailed sync (slower but more error info)'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                created: { type: 'number' },
                                updated: { type: 'number' },
                                total: { type: 'number' },
                                duration: { type: 'number' },
                                errors: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            externalId: { type: 'string' },
                                            name: { type: 'string' },
                                            error: { type: 'string' }
                                        },
                                        required: ['externalId', 'name', 'error'],
                                        additionalProperties: false
                                    }
                                }
                            },
                            required: ['created', 'updated', 'total', 'duration', 'errors'],
                            additionalProperties: false
                        },
                        timestamp: { type: 'string' }
                    },
                    required: ['success', 'message', 'data', 'timestamp'],
                    additionalProperties: false
                },
                401: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                        code: { type: 'string' },
                        timestamp: { type: 'string' }
                    },
                    required: ['error', 'message', 'code', 'timestamp'],
                    additionalProperties: false
                },
                500: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                        timestamp: { type: 'string' }
                    },
                    required: ['success', 'error', 'message', 'timestamp'],
                    additionalProperties: false
                }
            },
            tags: ['sync'],
            summary: 'Sync employees from Google Sheets',
            description: '🔄 Fetches employee data from Google Sheets and syncs with database. Creates new employees or updates existing ones based on externalId field.'
        }
    }, async (req, reply) => {
        try {
            logger.info('🚀 Starting employee sync operation', {
                detailed: req.query.detailed,
                userAgent: req.headers['user-agent'],
                ip: req.ip,
                method: req.method,
                url: req.url
            });

            const syncResult = req.query.detailed
                ? await syncService.syncEmployeesFromSheetsDetailed()
                : await syncService.syncEmployeesFromSheets();

            const message = `Sync completed: ${syncResult.created} created, ${syncResult.updated} updated` +
                (syncResult.errors.length > 0 ? ` (${syncResult.errors.length} errors)` : '');

            logger.info('✅ Sync operation completed successfully', {
                created: syncResult.created,
                updated: syncResult.updated,
                errors: syncResult.errors.length,
                duration: syncResult.duration
            });

            reply.send({
                success: true,
                message,
                data: syncResult,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('💥 Sync operation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                method: req.method,
                url: req.url,
                ip: req.ip
            });

            reply.code(500).send({
                success: false,
                error: 'Sync Failed',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toISOString()
            });
        }
    });

    // POST /sync/populate - initial population of empty database
    app.post<{
        Querystring: PopulateQuerystring;
    }>('/populate', {
        preHandler: (app as any).requireSyncAuth,
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    force: {
                        type: 'boolean',
                        default: false,
                        description: 'Force population even if database contains data'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        result: { type: 'string' },
                        message: { type: 'string' },
                        data: {
                            type: ['object', 'null'],
                            properties: {
                                created: { type: 'number' },
                                updated: { type: 'number' },
                                total: { type: 'number' },
                                duration: { type: 'number' }
                            }
                        },
                        timestamp: { type: 'string' }
                    },
                    required: ['success', 'result', 'message', 'timestamp'],
                    additionalProperties: false
                },
                409: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        result: { type: 'string' },
                        message: { type: 'string' },
                        timestamp: { type: 'string' }
                    },
                    required: ['success', 'result', 'message', 'timestamp'],
                    additionalProperties: false
                }
            },
            tags: ['sync'],
            summary: 'Initial population of database from Google Sheets',
            description: '🌱 Populates empty database with employee data from Google Sheets. Skips if database already contains data unless force=true.'
        }
    }, async (req, reply) => {
        try {
            logger.info('🌱 Initial population requested', {
                force: req.query.force,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            const populateResult = await syncService.initialPopulateFromSheets(req.query.force);
            const statusCode = populateResult.result === 'skipped' ? 409 : 200;

            reply.code(statusCode).send({
                success: populateResult.result !== 'skipped',
                result: populateResult.result,
                message: populateResult.message,
                data: populateResult.syncResult || null,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('💥 Initial population failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ip: req.ip
            });

            reply.code(500).send({
                success: false,
                error: 'Population Failed',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toISOString()
            });
        }
    });

    // GET /sync/status - check sync service status
    app.get('/status', {
        preHandler: (app as any).requireSyncAuth,
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        service: { type: 'string' },
                        stats: {
                            type: 'object',
                            properties: {
                                totalEmployees: { type: 'number' },
                                employeesWithExternalId: { type: 'number' },
                                employeesWithoutExternalId: { type: 'number' }
                            },
                            required: ['totalEmployees', 'employeesWithExternalId', 'employeesWithoutExternalId'],
                            additionalProperties: false
                        },
                        timestamp: { type: 'string' }
                    },
                    required: ['status', 'service', 'stats', 'timestamp'],
                    additionalProperties: false
                },
                500: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        service: { type: 'string' },
                        error: { type: 'string' },
                        timestamp: { type: 'string' }
                    },
                    required: ['status', 'service', 'error', 'timestamp'],
                    additionalProperties: false
                }
            },
            tags: ['sync'],
            summary: 'Check sync service status',
            description: '📊 Returns current status and statistics of the sync service'
        }
    }, async (req, reply) => {
        try {
            const stats = await syncService.getSyncStats();

            logger.info('📊 Sync status requested', {
                ip: req.ip,
                stats
            });

            reply.send({
                status: 'operational',
                service: 'employee-sync',
                stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('❌ Failed to get sync status', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ip: req.ip
            });

            reply.code(500).send({
                status: 'error',
                service: 'employee-sync',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    });

    // GET /sync/validate - test Google Sheets connection
    app.get('/validate', {
        preHandler: (app as any).requireSyncAuth,
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        isConnected: { type: 'boolean' },
                        employeeCount: { type: 'number' },
                        sampleEmployee: {
                            type: 'object',
                            properties: {
                                externalId: { type: 'string' },
                                name: { type: 'string' },
                                grade: { type: 'string' },
                                role: { type: 'string' }
                            },
                            required: ['externalId', 'name', 'grade', 'role'],
                            additionalProperties: false
                        },
                        error: { type: 'string' },
                        timestamp: { type: 'string' }
                    },
                    required: ['isConnected', 'employeeCount', 'timestamp'],
                    additionalProperties: false
                }
            },
            tags: ['sync'],
            summary: 'Validate Google Sheets connection',
            description: '🔍 Tests connection to Google Sheets and returns sample data'
        }
    }, async (req, reply) => {
        try {
            const validation = await syncService.validateSheetsConnection();

            logger.info('🔍 Google Sheets connection validation', {
                isConnected: validation.isConnected,
                employeeCount: validation.employeeCount,
                ip: req.ip
            });

            reply.send({
                ...validation,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('❌ Validation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ip: req.ip
            });

            reply.code(500).send({
                isConnected: false,
                employeeCount: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    });

    // DELETE /sync/clear - clear all employee data (dangerous!)
    app.delete('/clear', {
        preHandler: (app as any).requireSyncAuth,
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        deletedCount: { type: 'number' },
                        message: { type: 'string' },
                        timestamp: { type: 'string' }
                    },
                    required: ['success', 'deletedCount', 'message', 'timestamp'],
                    additionalProperties: false
                }
            },
            tags: ['sync'],
            summary: 'Clear all employee data (DANGEROUS)',
            description: '🗑️ Deletes all employee records from database. Use with caution!'
        }
    }, async (req, reply) => {
        try {
            logger.warn('🗑️ Database clear requested', {
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            const clearResult = await syncService.clearAllEmployees();

            reply.send({
                success: true,
                deletedCount: clearResult.deletedCount,
                message: clearResult.message,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('💥 Database clear failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ip: req.ip
            });

            reply.code(500).send({
                success: false,
                error: 'Clear Failed',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toISOString()
            });
        }
    });

    // GET /sync/health - health check endpoint
    app.get('/health', {
        preHandler: (app as any).requireSyncAuth,
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        service: { type: 'string' },
                        status: {
                            type: 'string',
                            enum: ['healthy', 'unhealthy']
                        },
                        database: {
                            type: 'string',
                            enum: ['connected', 'disconnected']
                        },
                        sheets: {
                            type: 'string',
                            enum: ['connected', 'disconnected']
                        },
                        error: { type: 'string' },
                        timestamp: { type: 'string' }
                    },
                    required: ['service', 'status', 'database', 'sheets', 'timestamp'],
                    additionalProperties: false
                },
                503: {
                    type: 'object',
                    properties: {
                        service: { type: 'string' },
                        status: { type: 'string' },
                        database: { type: 'string' },
                        sheets: { type: 'string' },
                        error: { type: 'string' },
                        timestamp: { type: 'string' }
                    },
                    required: ['service', 'status', 'database', 'sheets', 'timestamp'],
                    additionalProperties: false
                }
            },
            tags: ['sync'],
            summary: 'Service health check',
            description: '🏥 Comprehensive health check of sync service components'
        }
    }, async (req, reply) => {
        try {
            const health = await syncService.healthCheck();
            const statusCode = health.status === 'healthy' ? 200 : 503;

            reply.code(statusCode).send({
                ...health,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('❌ Health check failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ip: req.ip
            });

            reply.code(503).send({
                service: 'employee-sync',
                status: 'unhealthy',
                database: 'unknown',
                sheets: 'unknown',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    });
};
