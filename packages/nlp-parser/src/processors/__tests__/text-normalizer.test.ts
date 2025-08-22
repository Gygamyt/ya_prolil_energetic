import { describe, it, expect } from 'vitest';
import { TextNormalizer } from '../text-normalizer';

describe('TextNormalizer', () => {
    describe('normalize', () => {
        it('should handle empty input', () => {
            expect(TextNormalizer.normalize('')).toBe('');
            expect(TextNormalizer.normalize(null as any)).toBe('');
            expect(TextNormalizer.normalize(undefined as any)).toBe('');
        });

        it('should normalize line breaks', () => {
            const input = 'line1\r\nline2\rline3\nline4';
            const result = TextNormalizer.normalize(input);
            expect(result).toBe('line1\nline2\nline3\nline4');
        });

        it('should clean excessive whitespace', () => {
            const input = 'text  with   multiple    spaces\n\n\n\nand   breaks';
            const result = TextNormalizer.normalize(input);
            expect(result).toBe('text with multiple spaces\n\nand breaks');
        });

        it('should standardize numbered lists', () => {
            const input = '1)First item\n2.Second item\n3) Third item';
            const result = TextNormalizer.normalize(input);
            expect(result).toBe('1. First item\n2. Second item\n3. Third item');
        });
    });

    describe('getLines', () => {
        it('should return non-empty lines', () => {
            const input = 'line1\n\nline2\n   \nline3';
            const result = TextNormalizer.getLines(input);
            expect(result).toEqual(['line1', 'line2', 'line3']);
        });
    });

    describe('stripHtml', () => {
        it('should remove HTML tags', () => {
            const input = '<p>Hello <b>world</b></p> &amp; entities';
            const result = TextNormalizer.stripHtml(input);
            expect(result).toBe('Hello world   entities');
        });
    });
});
