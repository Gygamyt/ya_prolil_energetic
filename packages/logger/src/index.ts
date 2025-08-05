import { logger as baseLogger } from './logger.ts';

/**
 * The primary logger instance used throughout the application.
 * @example
 * import { log } from '@repo/logger';
 * log.info('Server started');
 */
export const log = baseLogger;

/**
 * Creates a child logger with additional bindings.
 * Useful for scoping logs to a specific module, request, or context.
 *
 * @param bindings - An object containing key-value pairs to bind to the child logger.
 *                   Example: `{ module: 'user-service', requestId: 'abc123' }`
 * @returns A Pino `Logger` instance with the specified bindings.
 *
 * @example
 * const userLogger = createChildLogger({ module: 'user-service' });
 * userLogger.error({ err }, 'Failed to fetch user');
 */
export const createChildLogger = (bindings: Record<string, unknown>) =>
    baseLogger.child(bindings);
