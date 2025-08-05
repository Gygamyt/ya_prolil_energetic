import { describe, expect, it, vi } from 'vitest';

describe('Logger package', () => {
    it('should have default level "info"', async () => {
        vi.resetModules();
        const { logger } = await import('../src/logger-context.ts');
        expect(logger.level).toBe('info');
    });

    it('should respect LOG_LEVEL env variable', async () => {
        process.env.LOG_LEVEL = 'error';
        vi.resetModules();
        const { logger } = await import('../src/logger-context.ts');
        expect(logger.level).toBe('error');
        delete process.env.LOG_LEVEL;
    });
});
