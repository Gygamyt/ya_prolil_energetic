import { beforeEach, describe, it, expect } from "vitest";
import { DeveloperGradeExtractor } from "../developer-grade-extractor";
import { ExtractorContext } from "../base-extractor";

describe('DeveloperGradeExtractor', () => {
    let extractor: DeveloperGradeExtractor;

    beforeEach(() => {
        extractor = new DeveloperGradeExtractor();
    });

    // Хелпер для запуска экстрактора и получения чистого результата
    const runExtract = async (text: string, context?: ExtractorContext) => {
        const result = await extractor.extract(text, context);
        return (result.value as string[]).sort();
    };

    describe('Basic Grade Extraction', () => {
        it('should extract standard grades', async () => {
            expect(await runExtract('junior')).toEqual(['Junior']);
            expect(await runExtract('Middle')).toEqual(['Middle']);
            expect(await runExtract('SENIOR')).toEqual(['Senior']);
        });

        it('should extract grades from aliases', async () => {
            expect(await runExtract('jun')).toEqual(['Junior']);
            expect(await runExtract('mid')).toEqual(['Middle']);
            expect(await runExtract('sen')).toEqual(['Senior']);
            expect(await runExtract('arch')).toEqual(['Architect']);
        });

        it('should extract special roles', async () => {
            expect(await runExtract('sdet')).toEqual(['SDET']);
            expect(await runExtract('testops')).toEqual(['TestOps']);
        });

        it('should interpret "strong" as Senior and "expert" as Principal', async () => {
            expect(await runExtract('strong')).toEqual(['Senior']);
            expect(await runExtract('expert')).toEqual(['Principal']);
        });
    });

    describe('Modifier Handling (+, ++, -, --)', () => {
        it('should apply single and double plus modifiers', async () => {
            expect(await runExtract('junior+')).toEqual(['Junior+']);
            expect(await runExtract('middle ++')).toEqual(['Middle++']);
        });

        it('should apply single and double minus modifiers', async () => {
            expect(await runExtract('senior-')).toEqual(['Senior-']);
            expect(await runExtract('jun --')).toEqual(['Junior--']);
        });

        it('should correctly apply modifiers when they are separated by space', async () => {
            expect(await runExtract('Middle +')).toEqual(['Middle+']);
            expect(await runExtract('Senior - -')).toEqual(['Senior--']);
        });
    });

    describe('Modifier Rule Enforcement', () => {
        it('should NOT apply modifiers to non-modifiable grades like Lead, Architect', async () => {
            expect(await runExtract('Lead+')).toEqual(['Lead']);
            expect(await runExtract('Architect--')).toEqual(['Architect']);
        });

        it('should NOT apply modifiers to SDET and TestOps', async () => {
            expect(await runExtract('SDET++')).toEqual(['SDET']);
            expect(await runExtract('TestOps-')).toEqual(['TestOps']);
        });

        it('should extract both grade and ignored modifier as separate tokens if grade is not modifiable', async () => {
            // "lead" is a grade, but "+" is ignored as it's not applicable.
            expect(await runExtract('lead +')).toEqual(['Lead']);
        });
    });

    describe('Complex Combinations and Text', () => {
        it('should extract multiple distinct grades', async () => {
            const result = await runExtract('Senior SDET');
            expect(result).toEqual(['SDET', 'Senior']);
        });

        it('should handle a mix of grades and modifiers correctly', async () => {
            const result = await runExtract('Middle+ Senior-- TestOps');
            expect(result).toEqual(['Middle+', 'Senior--', 'TestOps']);
        });

        it('should ignore irrelevant words and only extract grades', async () => {
            const result = await runExtract('We need a strong Senior Automation Engineer, maybe an SDET too');
            expect(result).toEqual(['SDET', 'Senior']);
        });
    });

    describe('Edge Cases and Invalid Input', () => {
        it('should return an empty array for an empty string', async () => {
            expect(await runExtract('')).toEqual([]);
        });

        it('should return an empty array for text with no relevant grades', async () => {
            expect(await runExtract('Looking for a developer')).toEqual([]);
        });

        it('should ignore Cyrillic text completely', async () => {
            expect(await runExtract('Мидл разработчик')).toEqual([]);
        });

        it('should handle extra spacing and commas', async () => {
            const result = await runExtract('  junior  ,   sdet,lead ++ ');
            // "lead" is extracted, but "++" is ignored for it.
            expect(result).toEqual(['Junior', 'Lead', 'SDET']);
        });
    });

    describe('Extraction from Context', () => {
        it('should extract correctly when data is passed in context.numberedList[6]', async () => {
            const context: ExtractorContext = {
                metaInfo: '',
                numberedList: { 6: 'Senior++ SDET' },
                rawText: '',
                patterns: {}
            };
            // Pass empty string for text, as context is the source of truth
            const result = await runExtract('', context);
            expect(result).toEqual(['SDET', 'Senior++']);
        });
    });
});
