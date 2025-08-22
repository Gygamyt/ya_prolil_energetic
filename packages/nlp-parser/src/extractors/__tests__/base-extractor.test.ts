import { describe, it, expect, beforeEach } from 'vitest';
import { BaseExtractor, ExtractionResult, ExtractorContext } from '../base-extractor';

// Test implementation of BaseExtractor
class TestExtractor extends BaseExtractor {
    fieldName = 'test';

    async extract(text: string, context?: ExtractorContext): Promise<ExtractionResult> {
        // Simple test implementation
        if (text.includes('test')) {
            return this.createResult('found', 0.8, 'regex', text);
        }
        return this.createResult(null, 0, 'regex');
    }
}

describe('BaseExtractor', () => {
    let extractor: TestExtractor;

    beforeEach(() => {
        extractor = new TestExtractor();
    });

    describe('createResult', () => {
        it('should create result with normalized values', () => {
            const result = extractor['createResult']('  test  ', 0.8, 'regex', 'source');

            expect(result.value).toBe('test'); // trimmed
            expect(result.confidence).toBe(0.8);
            expect(result.method).toBe('regex');
            expect(result.source).toBe('source');
        });

        it('should clamp confidence between 0 and 1', () => {
            const resultLow = extractor['createResult']('test', -0.5, 'regex');
            const resultHigh = extractor['createResult']('test', 1.5, 'regex');

            expect(resultLow.confidence).toBe(0);
            expect(resultHigh.confidence).toBe(1);
        });
    });

    describe('findInNumberedList', () => {
        it('should find value in numbered list', () => {
            const numberedList = { 1: 'Item 1', 2: 'N/A', 3: 'Item 3' };

            const result1 = extractor['findInNumberedList'](numberedList, [1, 2, 3]);
            const result2 = extractor['findInNumberedList'](numberedList, [2, 3]);
            const result3 = extractor['findInNumberedList'](numberedList, [4, 5]);

            expect(result1).toBe('Item 1');
            expect(result2).toBe('Item 3'); // Skip N/A
            expect(result3).toBeNull();
        });
    });

    describe('searchPattern', () => {
        it('should find pattern with appropriate confidence', () => {
            const patterns = [/test (\w+)/, /(\w+) test/];

            const result1 = extractor['searchPattern']('test value', patterns);
            const result2 = extractor['searchPattern']('some test', patterns);

            expect(result1.value).toBe('value');
            expect(result1.confidence).toBe(0.8); // First pattern

            expect(result2.value).toBe('some');
            expect(result2.confidence).toBe(0.7); // Second pattern (reduced)
        });
    });

    describe('combineResults', () => {
        it('should return highest confidence result', () => {
            const result1 = extractor['createResult']('low', 0.3, 'regex');
            const result2 = extractor['createResult']('high', 0.9, 'nlp');
            const result3 = extractor['createResult']('medium', 0.6, 'pattern');

            const combined = extractor['combineResults'](result1, result2, result3);

            expect(combined.value).toBe('high');
            expect(combined.confidence).toBe(0.9);
            expect(combined.method).toBe('nlp');
        });

        it('should boost confidence for multiple good results', () => {
            const result1 = extractor['createResult']('test1', 0.8, 'regex');
            const result2 = extractor['createResult']('test2', 0.75, 'nlp');

            const combined = extractor['combineResults'](result1, result2);

            expect(combined.confidence).toBeCloseTo(0.9, 2); // Boosted
            expect(combined.method).toBe('hybrid');
        });
    });

    describe('extract method', () => {
        it('should extract successfully', async () => {
            const result = await extractor.extract('This is a test');

            expect(result.value).toBe('found');
            expect(result.confidence).toBe(0.8);
        });

        it('should return null for no match', async () => {
            const result = await extractor.extract('No match here');

            expect(result.value).toBeNull();
            expect(result.confidence).toBe(0);
        });
    });
});
