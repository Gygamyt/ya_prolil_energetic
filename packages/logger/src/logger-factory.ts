import pino, { type Logger, type LoggerOptions } from 'pino';
import { serializers } from "./serializers.ts";

export interface LoggerConfig {
    level: string;
    environment: 'development' | 'production' | 'test';
    service: string;
    version?: string;
}

export class LoggerFactory {
    private static instance: LoggerFactory;
    private loggers: Map<string, Logger> = new Map();

    private constructor() {}

    public static getInstance(): LoggerFactory {
        if (!this.instance) {
            this.instance = new LoggerFactory();
        }
        return this.instance;
    }

    public createLogger(config: LoggerConfig): Logger {
        const key = `${config.service}-${config.environment}`;

        if (this.loggers.has(key)) {
            return this.loggers.get(key)!;
        }

        const logBindingsEnabled = process.env.LOG_BINDINGS_ENABLED === 'true';

        const pinoOptions: LoggerOptions = {
            level: config.level || 'info',
            serializers,
            formatters: {
                level: (label) => ({ level: label.toUpperCase() }),
                bindings: (bindings) => {
                    if (logBindingsEnabled) {
                        return {
                            pid: bindings.pid,
                            hostname: bindings.hostname,
                            service: config.service,
                            version: config.version || '1.0.0',
                            env: config.environment
                        };
                    }

                    return {
                        pid: bindings.pid,
                        hostname: bindings.hostname
                    };
                }
            },
            timestamp: pino.stdTimeFunctions.isoTime,
            redact: config.environment === 'production'
                ? ['password', 'token', 'apiKey', '*.password', '*.token']
                : undefined
        };

        if (config.environment === 'development') {
            pinoOptions.transport = {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname'
                }
            };
        }

        const logger = pino(pinoOptions);
        this.loggers.set(key, logger);

        return logger;
    }
}
