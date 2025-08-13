export interface CacheProvider {
    get<T>(key: string): Promise<T | null> | T | null;
    set<T>(key: string, value: T, ttl?: number): Promise<void> | void;
    del(key: string): Promise<void> | void;
    clear(): Promise<void> | void;
    has(key: string): Promise<boolean> | boolean;
    getStats(): Promise<CacheStats> | CacheStats;
}

export interface CacheStats {
    keys: number;
    hits?: number;
    misses?: number;
    memory?: string;
    uptime?: number;
}

export interface CacheConfig {
    provider: 'memory' | 'redis';
    ttl?: number;
    maxSize?: number;
    checkPeriod?: number;
    redisUrl?: string;
    keyPrefix?: string;
}
