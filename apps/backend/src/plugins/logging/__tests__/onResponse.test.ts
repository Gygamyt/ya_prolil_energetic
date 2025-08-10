import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockRequest, createMockReply } from './setup';

describe('onResponseHook', () => {
    const mockParseUA = vi.fn(() => ({
        browser: { name: 'Chrome', version: '115.0' },
        os: { name: 'macOS', version: '14.0' }
    }));

    const mockFormatResponse = vi.fn(({ statusCode, method, route }) =>
        `✅ ${statusCode} ${method} ${route} 45ms`
    );

    const mockHrtimeBigint = vi.fn(() => BigInt(1000000000));

    beforeEach(() => {
        vi.clearAllMocks();

        vi.doMock('@repo/logger/src', () => ({
            formatResponse: mockFormatResponse,
        }));

        vi.doMock('@app/utils/logging', () => ({
            parseUA: mockParseUA,
        }));

        vi.stubGlobal('process', {
            ...process,
            hrtime: {
                ...process.hrtime,
                bigint: mockHrtimeBigint,
            }
        });
    });

    afterEach(() => {
        vi.doUnmock('@repo/logger/src');
        vi.doUnmock('@app/utils/logging');
        vi.unstubAllGlobals();
    });

    it('should calculate duration correctly', async () => {
        const { onResponseHook } = await import('../hooks/onResponse');

        const startTime = BigInt(1000000000);
        const endTime = BigInt(1045000000); // +45ms

        const mockReq = createMockRequest();
        // @ts-ignore
        mockReq._startTime = startTime;

        mockHrtimeBigint.mockReturnValue(endTime);

        const mockReply = createMockReply();

        await onResponseHook(mockReq as any, mockReply as any);

        expect(mockFormatResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                durationMs: 45,
            })
        );
    });

    it('should handle missing start time', async () => {
        const { onResponseHook } = await import('../hooks/onResponse');
        const mockReq = createMockRequest();
        // не устанавливаем _startTime

        const mockReply = createMockReply();

        await onResponseHook(mockReq as any, mockReply as any);

        expect(mockFormatResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                durationMs: undefined,
            })
        );
    });

    it('should parse content-length header', async () => {
        const { onResponseHook } = await import('../hooks/onResponse');
        const mockReq = createMockRequest();
        const mockReply = createMockReply({
            getHeader: vi.fn((header) => {
                if (header === 'content-length') return '1024';
                return undefined;
            })
        });

        await onResponseHook(mockReq as any, mockReply as any);

        expect(mockFormatResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                contentLength: 1024,
            })
        );
    });

    it('should get request ID from log or reply header', async () => {
        const { onResponseHook } = await import('../hooks/onResponse');
        const mockReq = createMockRequest({
            log: {
                get: vi.fn((key) => key === 'requestId' ? 'log-req-id' : undefined),
                info: vi.fn(),
            }
        });
        const mockReply = createMockReply();

        await onResponseHook(mockReq as any, mockReply as any);

        expect(mockFormatResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: 'log-req-id',
            })
        );
    });

    it('should call parseUA and format user agent info', async () => {
        const { onResponseHook } = await import('../hooks/onResponse');
        const mockReq = createMockRequest({
            headers: { 'user-agent': 'Safari/16.0' }
        });
        const mockReply = createMockReply();

        await onResponseHook(mockReq as any, mockReply as any);

        expect(mockParseUA).toHaveBeenCalledWith('Safari/16.0');
    });

    it('should call formatResponse with correct data', async () => {
        const { onResponseHook } = await import('../hooks/onResponse');
        const mockReq = createMockRequest();
        const mockReply = createMockReply({ statusCode: 201 });

        await onResponseHook(mockReq as any, mockReply as any);

        expect(mockFormatResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 201,
                method: 'GET',
                url: '/api/test',
            })
        );
    });

    it('should call req.log.info with formatted message', async () => {
        const { onResponseHook } = await import('../hooks/onResponse');
        const mockLogInfo = vi.fn();
        const mockReq = createMockRequest({
            log: {
                info: mockLogInfo,
                get: vi.fn()
            }
        });
        const mockReply = createMockReply();

        await onResponseHook(mockReq as any, mockReply as any);

        expect(mockLogInfo).toHaveBeenCalledWith(
            expect.stringContaining('✅'),
            expect.any(Object)
        );
    });
});
