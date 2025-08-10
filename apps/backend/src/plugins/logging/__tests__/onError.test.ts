import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockRequest, createMockReply } from './setup';

describe('onErrorHook', () => {
    const mockFormatError = vi.fn(({ method, url, error }) =>
        `💀 ERROR ${method} ${url} ${error.message || 'Unknown error'}`
    );

    beforeEach(() => {
        vi.clearAllMocks();

        vi.doMock('@repo/logger/src', () => ({
            formatError: mockFormatError,
        }));
    });

    afterEach(() => {
        vi.doUnmock('@repo/logger/src');
    });

    it('should format error with correct data', async () => {
        const { onErrorHook } = await import('../hooks/onError');
        const mockError = {
            name: 'ValidationError',
            message: 'Invalid input data',
            stack: 'Error stack trace...',
        };

        const mockReq = createMockRequest({
            body: { test: 'data' },
            log: {
                get: vi.fn(() => 'error-req-id'),
                error: vi.fn(),
            }
        });
        const mockReply = createMockReply();

        await onErrorHook(mockReq as any, mockReply as any, mockError);

        expect(mockFormatError).toHaveBeenCalledWith({
            method: 'GET',
            url: '/api/test',
            error: {
                name: 'ValidationError',
                message: 'Invalid input data'
            },
            requestId: 'error-req-id',
        });
    });

    it('should log complete error info to req.log.error', async () => {
        const { onErrorHook } = await import('../hooks/onError');
        const mockLogError = vi.fn();
        const mockError = {
            name: 'DatabaseError',
            message: 'Connection timeout',
            stack: 'DatabaseError: Connection timeout\n    at ...',
        };

        const mockReq = createMockRequest({
            body: { userId: 123 },
            headers: { authorization: 'Bearer token' },
            log: { error: mockLogError, get: vi.fn() }
        });
        const mockReply = createMockReply();

        await onErrorHook(mockReq as any, mockReply as any, mockError);

        expect(mockLogError).toHaveBeenCalledWith(
            expect.stringContaining('💀 ERROR'),
            expect.objectContaining({
                name: 'DatabaseError',
                message: 'Connection timeout',
                stack: expect.stringContaining('DatabaseError: Connection timeout'),
                request: expect.objectContaining({
                    body: { userId: 123 },
                    headers: expect.objectContaining({ authorization: 'Bearer token' }),
                    url: '/api/test',
                    method: 'GET',
                })
            })
        );
    });

    it('should handle errors without name/message', async () => {
        const { onErrorHook } = await import('../hooks/onError');
        const mockError = {}; // пустая ошибка

        const mockReq = createMockRequest({
            log: { error: vi.fn(), get: vi.fn() }
        });
        const mockReply = createMockReply();

        await onErrorHook(mockReq as any, mockReply as any, mockError);

        expect(mockFormatError).toHaveBeenCalledWith({
            method: 'GET',
            url: '/api/test',
            error: {
                name: undefined,
                message: undefined
            },
            requestId: undefined,
        });
    });
});
