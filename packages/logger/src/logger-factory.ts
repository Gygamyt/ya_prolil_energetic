import winston, { type Logger, type LoggerOptions, format, transports } from 'winston';

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

        const customPrettyFormat = format.printf(info => {
            const { timestamp, level, message, ...meta } = info;
            const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
            return `${timestamp} [${level.toUpperCase()}] [${config.service}] ${message}${metaString}`;
        });

        const winstonOptions: LoggerOptions = {
            level: config.level || 'info',
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.errors({ stack: true }),
                // Here, we create a custom format to include service, version, and env
                format.printf(info => {
                    const { timestamp, level, message, ...meta } = info;
                    const bindings = logBindingsEnabled ? {
                        service: config.service,
                        version: config.version || '1.0.0',
                        env: config.environment,
                    } : {};
                    const metadata = Object.keys(meta).length ? JSON.stringify(meta) : '';
                    return `${timestamp} [${level.toUpperCase()}] [${config.service}] ${message} ${metadata}`;
                })
            ),
            transports: [
                new transports.Console({
                    // For development, use a pretty format with colors
                    format: config.environment === 'development'
                        ? format.combine(
                            format.colorize(),
                            format.simple()
                        )
                        : format.json() // In production, use JSON
                })
            ],
        };

        const logger = winston.createLogger(winstonOptions);
        this.loggers.set(key, logger);
        return logger;
    }
}
