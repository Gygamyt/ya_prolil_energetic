import { MemoryCacheProvider } from '../providers';
// import { RedisCacheProvider } from '../providers/redis-cache.provider';
import type { CacheProvider, CacheConfig } from '../interfaces/cache.interface';

export class CacheFactory {
    private static instances = new Map<string, CacheProvider>();

    static create(name: string, config: CacheConfig): CacheProvider {
        if (CacheFactory.instances.has(name)) {
            return CacheFactory.instances.get(name)!;
        }

        let provider: CacheProvider;

        switch (config.provider) {
            // case 'redis':
            //     provider = new RedisCacheProvider(
            //         config.redisUrl,
            //         config.ttl,
            //         config.keyPrefix
            //     );
            //     break;
            case 'memory':
            default:
                provider = new MemoryCacheProvider(
                    config.ttl,
                    config.checkPeriod,
                    config.maxSize
                );
                break;
        }

        CacheFactory.instances.set(name, provider);
        console.log(`🏭 Created cache provider: ${name} (${config.provider})`);

        return provider;
    }

    static get(name: string): CacheProvider | null {
        return CacheFactory.instances.get(name) || null;
    }

    static clearAll(): void {
        for (const [name, provider] of CacheFactory.instances.entries()) {
            provider.clear();
            console.log(`🗑️ Cleared cache: ${name}`);
        }
    }
}
