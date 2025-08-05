import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Logger package', () => {
    it('should have default level "info"', async () => {
        vi.resetModules();
        const { logger } = await import('../src/logger');
        expect(logger.level).toBe('info');
    });

    it('should respect LOG_LEVEL env variable', async () => {
        process.env.LOG_LEVEL = 'error';
        vi.resetModules();
        const { logger } = await import('../src/logger');
        expect(logger.level).toBe('error');
        delete process.env.LOG_LEVEL;
    });

    it('should create child logger with bindings', async () => {
        vi.resetModules();
        const { createChildLogger } = await import('../src');
        const child = createChildLogger({ module: 'test' });
        // @ts-ignore: internal API
        expect(child.bindings()).toMatchObject({ module: 'test' });
    });
});
