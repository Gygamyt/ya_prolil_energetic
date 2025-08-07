import { stdSerializers } from 'pino';

export const serializers = {
    err: stdSerializers.wrapErrorSerializer(
        (err: unknown) => {
            if (err instanceof Error) {
                const extra = err as Error & Record<string, any>;
                return {
                    type: err.name,
                    message: err.message,
                    stack: err.stack,
                    context: extra.context || {},
                    code: extra.code,
                    statusCode: extra.statusCode,
                    // @ts-ignore
                    cause: err.cause instanceof Error
                        ? {
                            // @ts-ignore
                            message: err.cause.message,
                            // @ts-ignore
                            stack: err.cause.stack
                        }
                        : undefined
                };
            }
            return { err };
        }
    ),

    obj: (object: any) => {
        if (object === null || object === undefined) {
            return object;
        }
        const isPrimitive = ['string','number','boolean'].includes(typeof object);
        if (isPrimitive) {
            return object;
        }

        const result: Record<string, any> = {};
        Object.keys(object).forEach(key => {
            const value = object[key];
            if (
                value === null ||
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
            ) {
                result[key] = value;
            } else {
                result[key] = '[Object]';
            }
        });
        return result;
    }
};
