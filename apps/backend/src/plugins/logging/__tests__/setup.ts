import { vi } from 'vitest';

// Убираем mockConsoleLog - он больше не нужен

// Mock для Fastify Request/Reply
export const createMockRequest = (overrides: any = {}) => ({
    method: 'GET',
    url: '/api/test',
    ip: '127.0.0.1',
    headers: {
        'user-agent': 'Chrome/115.0',
        'x-request-id': 'test-request-id',
        ...overrides.headers
    },
    routeOptions: { url: '/api/test' },
    server: {
        log: {
            debug: vi.fn(),
            info: vi.fn(),
            error: vi.fn()
        }
    },
    log: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        get: vi.fn()
    },
    body: {},
    ...overrides,
});

export const createMockReply = (overrides: any = {}) => ({
    statusCode: 200,
    getHeader: vi.fn(),
    ...overrides,
});
