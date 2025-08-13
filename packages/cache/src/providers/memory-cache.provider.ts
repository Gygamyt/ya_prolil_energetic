import NodeCache from 'node-cache';
import type { CacheProvider, CacheStats } from '../interfaces/cache.interface';

export class MemoryCacheProvider implements CacheProvider {
    private cache: NodeCache;
    private stats = { hits: 0, misses: 0 };

    constructor(
        private ttl = 300,
        private checkPeriod = 60,
        private maxKeys = 1000
    ) {
        this.cache = new NodeCache({
            stdTTL: ttl,
            checkperiod: checkPeriod,
            maxKeys: maxKeys,
            deleteOnExpire: true
        });
    }

    get<T>(key: string): T | null {
        const value = this.cache.get<T>(key);

        if (value !== undefined) {
            this.stats.hits++;
            // console.log(`📦 Memory Cache HIT: ${key.substring(0, 12)}...`);
            return value;
        }

        this.stats.misses++;
        // console.log(`🔄 Memory Cache MISS: ${key.substring(0, 12)}...`);
        return null;
    }

    set<T>(key: string, value: T, ttl?: number): void {
        this.cache.set(key, value, ttl || this.ttl);
        // console.log(`💾 Memory Cache SET: ${key.substring(0, 12)}... (TTL: ${ttl || this.ttl}s)`);
    }

    del(key: string): void {
        this.cache.del(key);
    }

    clear(): void {
        this.cache.flushAll();
        this.stats = { hits: 0, misses: 0 };
        // console.log('🗑️ Memory cache cleared');
    }

    has(key: string): boolean {
        return this.cache.has(key);
    }

    getStats(): CacheStats {
        const nodeStats = this.cache.getStats();
        return {
            keys: this.cache.keys().length,
            hits: this.stats.hits,
            misses: this.stats.misses,
            memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        };
    }
}
