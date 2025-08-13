import { CacheFactory } from '../factories/cache.factory';
import crypto from 'crypto';

export function Cacheable(cacheName: string, ttl?: number) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const cache = CacheFactory.get(cacheName);
            if (!cache) {
                return originalMethod.apply(this, args);
            }

            const cacheKey = `${propertyKey}:${crypto
                .createHash('md5')
                .update(JSON.stringify(args))
                .digest('hex')}`;

            const cached = await cache.get(cacheKey);
            if (cached !== null) {
                return cached;
            }

            const result = await originalMethod.apply(this, args);
            await cache.set(cacheKey, result, ttl);

            return result;
        };

        return descriptor;
    };
}
