import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageExtractor } from "../language-extractor";
import { ExtractorContext } from "../base-extractor";


describe('LanguageExtractor', () => {
    let extractor: LanguageExtractor;

    beforeEach(() => {
        extractor = new LanguageExtractor();
    });

    // Хелпер для создания контекста с нужными полями
    const createTestContext = (
        p8?: string, // п.8 - English
        p10?: string, // п.10 - Additional Lang
        p11?: string // п.11 - Additional Lang Level
    ): ExtractorContext => ({
        metaInfo: '',
        rawText: '',
        patterns: {},
        numberedList: {
            ...(p8 && { 8: p8 }),
            ...(p10 && { 10: p10 }),
            ...(p11 && { 11: p11 }),
        } as any
    });

    // Хелпер для запуска экстрактора и получения результата
    const runExtract = async (context: ExtractorContext) => {
        const result = await extractor.extract('', context);
        return result.value;
    };

    describe('English Language Extraction (field 8)', () => {
        it('should extract English with CEFR level', async () => {
            const context = createTestContext('English B2');
            const result = await runExtract(context);
            expect(result).toEqual([
                { language: 'English', level: 'B2', modifier: undefined, priority: 'required' }
            ]);
        });

        it('should extract English with text level', async () => {
            const context = createTestContext('Upper Intermediate');
            const result = await runExtract(context);
            expect(result).toEqual([
                { language: 'English', level: 'B2', modifier: undefined, priority: 'required' }
            ]);
        });

        it('should extract English with a plus modifier', async () => {
            const context = createTestContext('C1+');
            const result = await runExtract(context);
            expect(result).toEqual([
                { language: 'English', level: 'C1', modifier: '+', priority: 'required' }
            ]);
        });
    });

    describe('Additional Language Extraction (fields 10 & 11)', () => {
        it('should extract an additional language and its level from separate fields', async () => {
            const context = createTestContext(undefined, 'Polish', 'B1');
            const result = await runExtract(context);
            expect(result).toEqual([
                { language: 'Polish', level: 'B1', modifier: undefined, priority: 'preferred' }
            ]);
        });

        it('should extract an additional language and level from the same field (10)', async () => {
            const context = createTestContext(undefined, 'German B2');
            const result = await runExtract(context);
            expect(result).toEqual([
                { language: 'German', level: 'B2', modifier: undefined, priority: 'preferred' }
            ]);
        });

        it('should handle Russian language names', async () => {
            const context = createTestContext(undefined, 'Испанский', 'C1-');
            const result = await runExtract(context);
            expect(result).toEqual([
                { language: 'Spanish', level: 'C1', modifier: '-', priority: 'preferred' }
            ]);
        });
    });

    describe('Combined Language Requirements', () => {
        it('should extract both English and an additional language', async () => {
            const context = createTestContext('B2+', 'Polish', 'B1');
            const result = await runExtract(context);
            expect(result).toHaveLength(2);
            expect(result).toContainEqual({ language: 'English', level: 'B2', modifier: '+', priority: 'required' });
            expect(result).toContainEqual({ language: 'Polish', level: 'B1', modifier: undefined, priority: 'preferred' });
        });
    });

    describe('Edge Cases', () => {
        it('should return an empty array if all fields are empty', async () => {
            const context = createTestContext();
            const result = await runExtract(context);
            expect(result).toEqual([]);
        });

        it('should return an empty array if fields contain "N/A"', async () => {
            const context = createTestContext('N/A', 'Не требуется');
            const result = await runExtract(context);
            expect(result).toEqual([]);
        });

        it('should not extract anything if language is not in the alias list', async () => {
            const context = createTestContext(undefined, 'Klingon C1');
            const result = await runExtract(context);
            expect(result).toEqual([]);
        });

        it('should not extract anything if only a level is provided for additional language', async () => {
            const context = createTestContext(undefined, undefined, 'B2');
            const result = await runExtract(context);
            expect(result).toEqual([]);
        });
    });
});
