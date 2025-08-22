import { describe, it, expect, beforeEach } from 'vitest';
import { RequestedHeadcountExtractor } from '../requested-headcount-extractor';
import { ExtractorContext } from '../base-extractor';

describe('RequestedHeadcountExtractor', () => {
    let extractor: RequestedHeadcountExtractor;

    beforeEach(() => {
        extractor = new RequestedHeadcountExtractor();
    });

    // Хелпер для создания тестового контекста
    const createTestContext = (p12?: string): ExtractorContext => ({
        numberedList: { ...(p12 && { 12: p12 }) },
    } as any);

    // Хелпер для запуска экстрактора
    const runExtract = async (context: ExtractorContext) => {
        const result = await extractor.extract('', context);
        return result.value;
    };

    it('should extract the headcount from a full sentence', async () => {
        const context = createTestContext('Запрошенное количество сотрудников 2');
        const result = await runExtract(context);
        expect(result).toBe(2);
    });

    it('should extract the headcount when it is just a number', async () => {
        const context = createTestContext('5');
        const result = await runExtract(context);
        expect(result).toBe(5);
    });

    it('should extract the first number if there are multiple', async () => {
        const context = createTestContext('Нужно 1 или 2 человека');
        const result = await runExtract(context);
        expect(result).toBe(1);
    });

    it('should return null if the field is missing', async () => {
        const context = createTestContext(undefined);
        const result = await runExtract(context);
        expect(result).toBe(null);
    });

    it('should return null if the field is empty', async () => {
        const context = createTestContext('');
        const result = await runExtract(context);
        expect(result).toBe(null);
    });

    it('should return null if no number is found in the string', async () => {
        const context = createTestContext('Не требуется');
        const result = await runExtract(context);
        expect(result).toBe(null);
    });
});
