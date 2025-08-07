import { LoggerFactory } from "./logger-factory.ts";
import { Logger } from "winston";

export interface LoggingOptions {
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    logArgs?: boolean;
    logResult?: boolean;
    logDuration?: boolean;
    context?: Record<string, any>;
    logOnError?: boolean;
    skipArgs?: number[];
}

export function LogMethod(options: LoggingOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        if (typeof originalMethod !== 'function') {
            throw new Error(`Method decorator applied to a non-method property: ${propertyKey}`);
        }

        const className = target.constructor.name;
        const logger: Logger = LoggerFactory.getInstance().createLogger({
            level: options.level || 'info',
            environment: process.env.NODE_ENV as any || 'development',
            service: `${className}.${propertyKey}`
        });

        const newMethod = async function (this: any, ...args: any[]) {
            const startTime = process.hrtime.bigint();
            const requestId = this?.requestId || generateRequestId();

            const contextLogger = logger.child({
                method: propertyKey,
                requestId,
                ...options.context
            });

            const sanitizedArgs = options.skipArgs
                ? sanitizeArgs(args, options.skipArgs)
                : sanitizeArgs(args);

            try {
                if (options.logArgs && !options.logOnError) {
                    contextLogger.log(
                        options.level || 'debug',
                        `Entering ${propertyKey}`,
                        { args: sanitizedArgs }
                    );
                }

                const result = await originalMethod.apply(this, args);

                if (options.logDuration) {
                    const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
                    contextLogger.info(`Exiting ${propertyKey}`, { duration });
                }

                if (options.logResult && !options.logOnError) {
                    contextLogger.debug(`Result of ${propertyKey}`, { result });
                }

                return result;
            } catch (error) {
                contextLogger.error(`${propertyKey} failed`, { err: error, args: sanitizedArgs });
                throw error;
            }
        };

        descriptor.value = newMethod;

        return descriptor;
    };
}

export function LogMethodFull() {
    return LogMethod({
        level: 'info',
        logArgs: true,
        logResult: true,
        logDuration: true,
    });
}

export function LogMethodTimings() {
    return LogMethod({
        level: 'info',
        logDuration: true
    });
}

function generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
}

function sanitizeArgs(args: any[], skip?: number[]): any[] {
    return args.map((arg, index) => {
        if (skip && skip.includes(index)) {
            return '[Skipped]';
        }
        return typeof arg === 'object' && arg !== null ? '[Object]' : arg;
    });
}
