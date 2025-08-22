import { describe, expect, it } from "vitest";
import { StructuredListStrategy } from "../structured-list-strategy";
import { ParseInput } from "../../types";


describe('StructuredListStrategy - Integration with DeveloperGradeExtractor', () => {

    const strategy = new StructuredListStrategy();

    const createTestInput = (levelText: string): ParseInput => {
        return {
            data: `
                https://some.salesforce.com/some/path
                CV - TestCompany - TestManager - R-12345
                1. Industry: IT
                2. Domain: Fintech
                6. Уровень разработчиков: ${levelText}
                15. Technologies: TypeScript, Vitest
                22. Sales Manager: John Doe
            `
        };
    };

    it('should correctly parse a single grade', async () => {
        const input = createTestInput('Senior');
        const result = await strategy.parse(input);

        expect(result.success).toBe(true);
        expect(result.data?.levels).toEqual(['Senior']);
    });

    it('should correctly parse a grade with a single modifier', async () => {
        const input = createTestInput('Middle+');
        const result = await strategy.parse(input);

        expect(result.data?.levels).toEqual(['Middle+']);
    });

    it('should correctly parse a grade with double modifiers', async () => {
        const input = createTestInput('junior --');
        const result = await strategy.parse(input);

        expect(result.data?.levels).toEqual(['Junior--']);
    });

    it('should parse multiple distinct grades and roles', async () => {
        const input = createTestInput('Senior SDET');
        const result = await strategy.parse(input);

        // Сортируем для стабильности теста
        expect(result.data?.levels?.sort()).toEqual(['SDET', 'Senior']);
    });

    it('should correctly handle a complex mix of grades and modifiers', async () => {
        const input = createTestInput('Middle+ Senior-- TestOps');
        const result = await strategy.parse(input);

        expect(result.data?.levels?.sort()).toEqual(['Middle+', 'Senior--', 'TestOps']);
    });

    it('should ignore modifiers on non-modifiable grades', async () => {
        const input = createTestInput('Lead++ Architect-');
        const result = await strategy.parse(input);

        expect(result.data?.levels?.sort()).toEqual(['Architect', 'Lead']);
    });

    it('should return an empty array for Cyrillic-only input', async () => {
        const input = createTestInput('Мидл+');
        const result = await strategy.parse(input);

        // Поле levels по умолчанию - пустой массив
        expect(result.data?.levels).toEqual([]);
    });

    it('should return an empty array if the level field is N/A or empty', async () => {
        const input = createTestInput('N/A');
        const result = await strategy.parse(input);

        expect(result.data?.levels).toEqual([]);
    });

    it('should handle complex text with ignored words', async () => {
        const input = createTestInput('We need a Strong Senior, maybe also a jun++');
        const result = await strategy.parse(input);

        expect(result.data?.levels?.sort()).toEqual(['Junior++', 'Senior']);
    });
});
