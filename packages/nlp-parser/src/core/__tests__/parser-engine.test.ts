import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParseInput, ParseResult } from "../../types";
import { ParserEngine, ParserStrategy } from "../parser-engine";

describe('ParserEngine', () => {
    let engine: ParserEngine;
    let mockStrategy: ParserStrategy;

    beforeEach(() => {
        engine = new ParserEngine();

        mockStrategy = {
            name: 'standard',
            parse: vi.fn().mockResolvedValue({
                success: true,
                confidence: 0.8,
                strategy: 'standard',
                extractedFields: ['role', 'skills'],
                data: { role: 'QA Engineer', skills: ['JavaScript', 'Playwright'] }
            } as unknown as ParseResult)
        };
    });

    describe('registerStrategy', () => {
        it('should register a strategy successfully', () => {
            expect(() => engine.registerStrategy(mockStrategy)).not.toThrow();
        });
    });

    describe('parse', () => {
        beforeEach(() => {
            engine.registerStrategy(mockStrategy);
        });

        it('should parse successfully with registered strategy', async () => {
            const input: ParseInput = {
                data: 'CV - QA Engineer - Playwright - Company - manager - R-123',
                parseStrategy: 'standard'
            };

            const result = await engine.parse(input);

            expect(result.success).toBe(true);
            expect(result.confidence).toBe(0.8);
            expect(result.strategy).toBe('standard');
            expect(result.data?.role).toBe('QA Engineer');
        });

        it('should return error for unknown strategy', async () => {
            const input: ParseInput = {
                data: 'test data',
                parseStrategy: 'unknown' as any
            };

            const result = await engine.parse(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Strategy "unknown" not found');
            expect(result.confidence).toBe(0);
        });

        it('should use fallback strategy when confidence is low', async () => {
            const lowConfidenceStrategy = {
                name: 'nlp',
                parse: vi.fn().mockResolvedValue({
                    success: true,
                    confidence: 0.3,
                    strategy: 'nlp',
                    extractedFields: []
                })
            } as ParserStrategy;

            const fallbackStrategy = {
                name: 'hybrid',
                parse: vi.fn().mockResolvedValue({
                    success: true,
                    confidence: 0.7,
                    strategy: 'hybrid',
                    extractedFields: ['role']
                })
            } as ParserStrategy;

            engine.registerStrategy(lowConfidenceStrategy);
            engine.registerStrategy(fallbackStrategy);

            const input: ParseInput = {
                data: 'test data',
                parseStrategy: 'nlp'
            };

            const result = await engine.parse(input);

            expect(fallbackStrategy.parse).toHaveBeenCalled();
            expect(result.confidence).toBe(0.7);
        });
    });
});
