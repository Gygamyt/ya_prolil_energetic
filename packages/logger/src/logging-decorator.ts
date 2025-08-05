import { LoggerFactory } from "./logger-factory.ts";

export interface LoggingOptions {
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    logArgs?: boolean;
    logResult?: boolean;
    logDuration?: boolean;
    context?: Record<string, any>;
}

export function LogMethod(options: LoggingOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        if (typeof originalMethod !== 'function') {
            throw new Error(`Method decorator applied to a non-method property: ${propertyKey}`);
        }

        const className = target.constructor.name;
        const logger = LoggerFactory.getInstance().createLogger({
            level: options.level || 'info',
            environment: process.env.NODE_ENV as any || 'development',
            service: `${className}.${propertyKey}`
        });

        descriptor.value = function (this: any, ...args: any[]) {
            const startTime = process.hrtime.bigint();
            const requestId = this?.requestId || generateRequestId();

            const contextLogger = logger.child({
                method: propertyKey,
                requestId,
                ...options.context
            });

            try {
                if (options.logArgs) {
                    contextLogger[options.level || 'debug']({
                        args: sanitizeArgs(args)
                    }, `Entering ${propertyKey}`);
                }

                const result = originalMethod.apply(this, args);

                if (options.logDuration) {
                    const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
                    contextLogger.info({ duration }, `Exiting ${propertyKey}`);
                }

                if (options.logResult) {
                    contextLogger.debug({ result }, `Result of ${propertyKey}`);
                }

                return result;
            } catch (error) {
                contextLogger.error({ err: error }, `${propertyKey} failed`);
                throw error;
            }
        };

        descriptor.value = async function (this: any, ...args: any[]) { // Используем async
            const startTime = process.hrtime.bigint();
            const requestId = this?.requestId || generateRequestId();

            const contextLogger = logger.child({
                method: propertyKey,
                requestId,
                ...options.context
            });

            try {
                if (options.logArgs) {
                    contextLogger[options.level || 'debug']({
                        args: sanitizeArgs(args)
                    }, `Entering ${propertyKey}`);
                }

                const result = await originalMethod.apply(this, args);

                if (options.logDuration) {
                    const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
                    contextLogger.info({ duration }, `Exiting ${propertyKey}`);
                }

                if (options.logResult) {
                    contextLogger.debug({ result }, `Result of ${propertyKey}`);
                }

                return result;
            } catch (error) {
                contextLogger.error({ err: error }, `${propertyKey} failed`);
                throw error;
            }
        };

        return descriptor;
    };
}

function generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
}

function sanitizeArgs(args: any[]): any[] {
    return args.map(arg =>
        typeof arg === 'object' && arg !== null ? '[Object]' : arg
    );
}