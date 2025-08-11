import { logger } from '@repo/logger/src';
import { EmployeeRepository } from "@repo/database/src/repositories";
import { MongoDBClient } from "@repo/database/src/client";
import { fetchAndValidateEmployeeData } from "@repo/google-integration/src/scripts/read-sheet";

export interface SyncResult {
    created: number;
    updated: number;
    errors: Array<{ externalId: string; name: string; error: string }>;
    total: number;
    duration: number;
}

export class EmployeeSyncService {
    private employeeRepository: EmployeeRepository | null = null;

    constructor() {
    }

    /**
     * Synchronizes employee data from Google Sheets with database
     * Uses externalId for upsert operations (create or update)
     */
    async syncEmployeesFromSheets(): Promise<SyncResult> {
        const startTime = Date.now();
        logger.info('🔄 Starting employee sync from Google Sheets...');

        try {
            const employeeRepository = await this.getEmployeeRepository();

            const sheetEmployees = await fetchAndValidateEmployeeData();
            logger.info(`📄 Fetched ${sheetEmployees.length} employees from Google Sheets`);

            if (sheetEmployees.length === 0) {
                logger.warn('⚠️ No employees found in Google Sheets');
                return {
                    created: 0,
                    updated: 0,
                    errors: [],
                    total: 0,
                    duration: Date.now() - startTime
                };
            }

            const bulkResult = await employeeRepository.bulkUpsertByExternalId(sheetEmployees);

            const syncResult: SyncResult = {
                created: bulkResult.created,
                updated: bulkResult.updated,
                errors: bulkResult.errors.map(error => ({
                    externalId: error.externalId,
                    name: 'Unknown', // bulk operation doesn't provide name
                    error: error.error
                })),
                total: sheetEmployees.length,
                duration: Date.now() - startTime
            };

            logger.info(`✅ Sync completed: ${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.errors.length} errors in ${syncResult.duration}ms`);

            if (syncResult.errors.length > 0) {
                logger.warn('⚠️ Sync completed with errors:', syncResult.errors);
            }

            return syncResult;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('💥 Employee sync failed:', error);

            throw new Error(`Sync failed after ${duration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Individual sync with detailed error reporting (slower but more detailed)
     */
    async syncEmployeesFromSheetsDetailed(): Promise<SyncResult> {
        const startTime = Date.now();
        logger.info('🔄 Starting detailed employee sync from Google Sheets...');

        try {
            // ✅ Ленивая инициализация repository
            const employeeRepository = await this.getEmployeeRepository();

            const sheetEmployees = await fetchAndValidateEmployeeData();
            logger.info(`📄 Fetched ${sheetEmployees.length} employees for detailed sync`);

            let created = 0;
            let updated = 0;
            const errors: Array<{ externalId: string; name: string; error: string }> = [];

            // Process each employee individually for detailed reporting
            for (const employeeData of sheetEmployees) {
                try {
                    const result = await employeeRepository.upsertByExternalId(employeeData);

                    if (result.isNew) {
                        created++;
                        logger.debug(`✅ Created employee: ${employeeData.Name} (${employeeData.externalId})`);
                    } else {
                        updated++;
                        logger.debug(`✏️ Updated employee: ${employeeData.Name} (${employeeData.externalId})`);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push({
                        externalId: employeeData.externalId,
                        name: employeeData.Name || 'Unknown',
                        error: errorMessage
                    });
                    logger.error(`❌ Failed to sync employee ${employeeData.Name}: ${errorMessage}`);
                }
            }

            const syncResult: SyncResult = {
                created,
                updated,
                errors,
                total: sheetEmployees.length,
                duration: Date.now() - startTime
            };

            logger.info(`🎉 Detailed sync completed: ${created} created, ${updated} updated, ${errors.length} errors in ${syncResult.duration}ms`);
            return syncResult;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('💥 Detailed sync failed:', error);

            throw new Error(`Detailed sync failed after ${duration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get sync statistics from database
     */
    async getSyncStats(): Promise<{
        totalEmployees: number;
        employeesWithExternalId: number;
        employeesWithoutExternalId: number;
        lastSyncTime?: Date;
    }> {
        try {
            const employeeRepository = await this.getEmployeeRepository();

            const allEmployees = await employeeRepository.findAll();
            const withExternalId = allEmployees.filter(emp => emp.externalId);
            const withoutExternalId = allEmployees.filter(emp => !emp.externalId);

            return {
                totalEmployees: allEmployees.length,
                employeesWithExternalId: withExternalId.length,
                employeesWithoutExternalId: withoutExternalId.length,
            };
        } catch (error) {
            logger.error('Failed to get sync stats:', error);
            throw new Error(`Failed to get sync stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate Google Sheets connection without syncing
     */
    async validateSheetsConnection(): Promise<{
        isConnected: boolean;
        employeeCount: number;
        sampleEmployee?: any;
        error?: string;
    }> {
        try {
            logger.info('🔍 Validating Google Sheets connection...');

            const employees = await fetchAndValidateEmployeeData();

            return {
                isConnected: true,
                employeeCount: employees.length,
                sampleEmployee: employees.length > 0 ? {
                    externalId: employees[0].externalId,
                    name: employees[0].Name,
                    grade: employees[0].Grade,
                    role: employees[0].Role
                } : undefined
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Google Sheets connection validation failed:', error);

            return {
                isConnected: false,
                employeeCount: 0,
                error: errorMessage
            };
        }
    }

    /**
     * Health check method to verify service is operational
     */
    async healthCheck(): Promise<{
        service: string;
        status: 'healthy' | 'unhealthy';
        database: 'connected' | 'disconnected';
        sheets: 'connected' | 'disconnected';
        error?: string;
    }> {
        try {
            // Test database connection
            let databaseStatus: 'connected' | 'disconnected' = 'disconnected';
            try {
                await this.getEmployeeRepository();
                databaseStatus = 'connected';
            } catch (error) {
                logger.error('Database health check failed:', error);
            }

            // Test Google Sheets connection
            let sheetsStatus: 'connected' | 'disconnected' = 'disconnected';
            try {
                const validation = await this.validateSheetsConnection();
                sheetsStatus = validation.isConnected ? 'connected' : 'disconnected';
            } catch (error) {
                logger.error('Sheets health check failed:', error);
            }

            const overallStatus = (databaseStatus === 'connected' && sheetsStatus === 'connected')
                ? 'healthy'
                : 'unhealthy';

            return {
                service: 'employee-sync',
                status: overallStatus,
                database: databaseStatus,
                sheets: sheetsStatus
            };

        } catch (error) {
            return {
                service: 'employee-sync',
                status: 'unhealthy',
                database: 'disconnected',
                sheets: 'disconnected',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Cleanup method to close database connections if needed
     */
    async cleanup(): Promise<void> {
        try {
            if (this.employeeRepository) {
                logger.info('🧹 Cleaning up EmployeeSyncService resources...');
                // Repository cleanup если нужно
                this.employeeRepository = null;
                logger.debug('✅ EmployeeSyncService cleanup completed');
            }
        } catch (error) {
            logger.error('❌ Failed to cleanup EmployeeSyncService:', error);
        }
    }

    /**
     * Lazy initialization of employee repository
     * Creates repository only when first needed
     */
    private async getEmployeeRepository(): Promise<EmployeeRepository> {
        if (!this.employeeRepository) {
            try {
                const db = await MongoDBClient.getClient();
                this.employeeRepository = new EmployeeRepository(db);
                logger.debug('✅ EmployeeRepository initialized successfully');
            } catch (error) {
                logger.error('💥 Failed to initialize EmployeeRepository:', error);
                throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        return this.employeeRepository;
    }

    /**
     * Initial population of empty database from Google Sheets
     * Only creates new records, skips if database already has data
     */
    async initialPopulateFromSheets(forceOverwrite: boolean = false): Promise<{
        result: 'populated' | 'skipped' | 'forced';
        syncResult?: SyncResult;
        message: string;
    }> {
        try {
            logger.info('🌱 Starting initial database population from Google Sheets...');

            const employeeRepository = await this.getEmployeeRepository();
            const existingCount = (await employeeRepository.findAll()).length;

            if (existingCount > 0 && !forceOverwrite) {
                logger.warn(`⚠️ Database already contains ${existingCount} employees. Use force=true to overwrite`);
                return {
                    result: 'skipped',
                    message: `Database already contains ${existingCount} employees. Use ?force=true to populate anyway.`
                };
            }

            logger.info(`🚀 Populating ${forceOverwrite ? '(forced)' : 'empty'} database with employees from Google Sheets...`);

            const syncResult = await this.syncEmployeesFromSheets();

            const result = forceOverwrite ? 'forced' : 'populated';
            const message = forceOverwrite
                ? `Force populated database: ${syncResult.created} created, ${syncResult.updated} updated`
                : `Initial population completed: ${syncResult.created} employees added to empty database`;

            logger.info(`✅ Initial population completed: ${syncResult.created} created, ${syncResult.updated} updated`);

            return {
                result,
                syncResult,
                message
            };

        } catch (error) {
            logger.error('💥 Initial population failed:', error);
            throw new Error(`Initial population failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Clear all employee data (for testing/reset purposes)
     */
    async clearAllEmployees(): Promise<{
        deletedCount: number;
        message: string;
    }> {
        try {
            logger.warn('🗑️ Starting to clear all employee data...');

            const employeeRepository = await this.getEmployeeRepository();

            const allEmployees = await employeeRepository.findAll();
            const totalCount = allEmployees.length;

            if (totalCount === 0) {
                return {
                    deletedCount: 0,
                    message: 'Database is already empty'
                };
            }

            // Delete all employees (assuming we add this method to repository)
            const collection = (employeeRepository as any).collection;
            const deleteResult = await collection.deleteMany({});

            logger.warn(`🗑️ Cleared ${deleteResult.deletedCount} employees from database`);

            return {
                deletedCount: deleteResult.deletedCount,
                message: `Cleared ${deleteResult.deletedCount} employees from database`
            };

        } catch (error) {
            logger.error('💥 Failed to clear employees:', error);
            throw new Error(`Failed to clear employees: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
