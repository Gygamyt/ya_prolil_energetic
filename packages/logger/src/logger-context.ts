import { AsyncLocalStorage } from "node:async_hooks";
import { Logger } from "pino";
import { LoggerFactory } from "./logger-factory.ts";

export interface LoggerContext {
    requestId: string;
    userId?: string;
    correlationId?: string;
    traceId?: string;
    metadata?: Record<string, any>;
}

class LoggerContextManager {
    private static instance: LoggerContextManager;
    private asyncLocalStorage = new AsyncLocalStorage<LoggerContext>();
    private readonly baseLogger: Logger;

    private constructor() {
        this.baseLogger = LoggerFactory.getInstance().createLogger({
            level: process.env.LOG_LEVEL || 'info',
            environment: process.env.NODE_ENV as any || 'development',
            service: process.env.SERVICE_NAME || 'app'
        });
    }

    public static getInstance(): LoggerContextManager {
        if (!this.instance) {
            this.instance = new LoggerContextManager();
        }
        return this.instance;
    }

    public runWithContext<T>(context: LoggerContext, callback: () => T): T {
        return this.asyncLocalStorage.run(context, callback);
    }

    public getContextualLogger(): Logger {
        const context = this.asyncLocalStorage.getStore();

        if (context) {
            return this.baseLogger.child({
                requestId: context.requestId,
                userId: context.userId,
                correlationId: context.correlationId,
                traceId: context.traceId,
                ...context.metadata
            });
        }

        return this.baseLogger;
    }

    public updateContext(updates: Partial<LoggerContext>): void {
        const currentContext = this.asyncLocalStorage.getStore();
        if (currentContext) {
            Object.assign(currentContext, updates);
        }
    }
}

export const contextLogger = LoggerContextManager.getInstance();

export const logger = new Proxy({} as Logger, {
    get(target, prop) {
        const contextualLogger = contextLogger.getContextualLogger();
        const value = contextualLogger[prop as keyof Logger];

        if (typeof value === 'function') {
            return value.bind(contextualLogger);
        }

        return value;
    }
});
